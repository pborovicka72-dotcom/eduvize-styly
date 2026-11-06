# Správa stylů: audit a postup přechodu

## Aktualizace po koordinované integraci

Aktivní větve `feat/styles-logo-upload` nyní používají čisté kopie `/private/tmp/eduvize-styles-logo-ui-clean` (základ dada4d9e) a `/private/tmp/eduvize-styles-logo-admin-clean` (základ 162cd485). Původní audit níže zachycuje stav před aktualizací společného základu.

- Nové výstupy už mají vlastní veřejný runtime: output ID -> serverový scoped `/theme` -> ThemeConfig. `active-theme.js` má guard `edu-output`; záměrně se pro tyto publikace nespouští. Tento proud resolver ani runtime nepřepisuje. První dva P0 body níže nejsou otevřenou chybou nové publikované cesty; zůstávají popisem starých cest.
- Nahrávání loga je dokončené v UI i skutečných backendových routách a kanonických kopiích admin/web. Používá same-origin API a lokální výchozí asset; veřejné logo je globální, není rozšířením profilového ThemeConfig.
- Rastrové soubory nyní skutečně dekóduje Pillow (v obou requirements). Poškozené soubory, nesprávné MIME, příliš velké rozměry/počet snímků jsou odmítnuté. Limit 2 MB, do 200 snímků a 64 milionů dekódovaných pixelů celkem; PNG/GIF/WebP, statické SVG bez aktivních prvků a externích zdrojů.
- Logo se ukládá a aktivuje v jedné databázové transakci. Testy používají skutečné API a SessionStore, nikoli náhradu rout. CI opakuje stejné případy na PostgreSQL 18 v izolovaném schématu.
- Branding cache je oddělená podle originu. Produkční logo z cache/URL se v testu nepoužije. Nahrané URL se normalizují, takže chybový fallback správně funguje i u relativní adresy.
- Lokálně prošlo 279 backendových testů (1 existující skip), JS branding testy a společné output/client/link testy. Osm prohlížečových kontrol nad kompilovaným releasem ověřilo skutečný auth, upload, náhradu standardního loga, zachování školního loga, chybový soubor, URL variantu, reset, anonymní cold-cache a mobilní rozměry. Aplikační požadavky mimo vlastní origin i odchozí serverová spojení mimo loopback byly blokované, bez pokusů. Pomocné dokumentové API není součástí lokální fixture a je evidováno odděleně; nejde o kompletní provozní akceptaci všech služeb.
- Během akceptačního okna Fotogalerie neprovádět main merge ani test deploy. Po CI předat obě PR hlavnímu vláknu; produkce zůstává zakázaná. Vlastní testovací server, PostgreSQL, obnova a celá síťová matice se ověří až ve společném releasu.

## Původní audit

Stav k 6. 11. 2026. Audit místních zdrojů, nikoli potvrzení živého provozu nebo nezávislosti sestaveného vydání. Nic nebylo nasazeno. Řídí se společným `EDUVIZE-OUTPUT-CONTRACT.md` ve složce Eduvize Aplikace.

## Rozsah a vlastnictví

- Tokeny, geometrie a načítání stylu jsou v `eduvize-styly`. Účet a editor mají také kanonické zdroje v `eduvize-admin/web`; `tools/publish_compatibility.py` je kopíruje do styles repozitáře. Změna loga proto zahrnuje shodné branding skripty v obou pracovních větvích a aktualizaci verze skriptu v obou editorech, aby ji další synchronizace nepřepsala.
- Skutečný backend: `eduvize-admin/eduvize_admin/styles_api.py`. `eduvize-styly/app.py` pouze importuje tento backend. Neukládat druhou implementaci do styles repozitáře.
- Společné output API, resolver a `output-client.js` vlastní koordinovaný proud. Nevytvářet konkurenční endpoint pro identitu výstupu.
- Audit vychází ze společných checkoutů. Logo je připravené odděleně ve větvi `feat/styles-logo-upload` v obou repozitářích: `/private/tmp/eduvize-styles-logo-ui` (základ 9fd97dc) a `/private/tmp/eduvize-styles-logo-admin` (základ 1eb82fe). Souběžné necommitované změny ostatních proudů nebyly převzaty.

## Zjištění podle priority

| Priorita | Aktuální kód | Potřebná změna a podmínka přijetí |
| --- | --- | --- |
| P0 | `design-system/active-theme.js:themeProfile`, `theme-first-paint.js`, inline bootstrap v `editor.html` / `image-viewer.html` berou kontext také z relace a localStorage. | Ve veřejném výstupu použít pouze profil serverem vyřešeného output ID. Bez platného výstupu nezobrazit cizí profil ani demo. Relaci a místní výběr zachovat pouze pro administraci. První vykreslení i následná obnova musí mít stejný ověřený kontext. |
| P0 | `active-theme.js` žádá seznam `/themes?profileId=…`; chybějící vazba se vrací ke globálnímu stylu. | Dohodnout veřejnou projekci aktivního stylu s vlastníkem output API. Existenci/školu/profil určuje registry. Cache klíčovat prostředím, ověřeným profilem a revizí; nereagovat na změnu administrátorské relace ve veřejném přehrávači. Zachovat kontrolu změn i poslední úspěšný styl pouze v témže kontextu. |
| P0 | Editor, `branding*.js`, `operator-page.js`, `admin-auth.js`, `configuration-profiles.js`, `update-runtime.js`, `update-settings.js`, `broadcast-license.js` a `generated-links.js` mají pevné Render adresy. | Jednotná konfigurace prostředí, přednostně same-origin. Zkontrolovat i callbacky, session handoff, scopes, navigaci, CSP/CORS a obnovu tokenů. Nové logo už používá same-origin API. |
| P0 | `deployment/single-host.py` a `compile-release.py` přepisují známé URL do výsledného vydání; Caddy posílá `/api/design-system/*` na místní službu 8103. | Rozlišit zdrojové výskyty od skutečných runtime závislostí. Ověřit výsledný artefakt, image, env, všechny odchozí požadavky a DB. Pouhá výměna URL nebo vlastní proxy nepředstavuje nezávislost. |
| P0 | Backend používá `DATABASE_URL`; ze zdrojů nelze doložit poskytovatele skutečné databáze ani stav záloh. | Koordinovaně zajistit vlastní databázi, přenos témat, vazeb profilů, loga, relací a souvisejících dat podle schváleného migračního postupu. Test má vlastní DB/účty; neimportovat produkční tokeny. Obnova i studený start musí fungovat při blokovaném Renderu. |
| P1 | `generated-links.js` upravuje clipboard a přiřazuje aktuální profil; `output-modes.js` skládá URL klientsky. | Přepojit na jediný koordinovaný klient/generátor. Kopírování a otevření nezveřejňuje koncept, nepřepisuje identitu a nevytváří nový výstup. Nezavádět další variantu resolveru pro styly. |
| P1 | `styles_api.py:list_admin_themes` zveřejňuje globální katalog a profilovou volbu; školní aktivace bere profil ze session, zápisy katalogu jsou pouze operátorské. | Rozlišit katalog pro administraci a veřejný styl. Ověřit, že vybraný profil patří škole; veřejná odpověď nesmí obsahovat neveřejné konfigurace. Jestli školy mají vytvářet vlastní témata, vyžaduje to školní vlastnictví témat – současné API jim dovoluje výběr, ne tvorbu. |
| P1 | Stylová konfigurace je měněna na místě, vazba profilu obsahuje jen theme ID, delete může odstranit vybraný styl. | Před integrací publikování určit atomickou revizi stylu a aktivaci, souběžné zápisy a pravidlo odstranění používaného stylu. Nedovolit tichý přechod k jinému stylu při chybě. Pro globální aktivaci ověřit souběh a právě jeden aktivní styl. Změny revize zachovají output ID. |
| P1 | `branding.js:stock` poznává standardní loga podle konkrétních cest; náhrada nesmí přepsat vlastní logo školy. | Ověřit náhradu i v sestavených cestách a vnořených aplikacích. Následně sjednotit explicitní marker standardního loga; zachovat školní zdroje a oddělit globální branding od profilových barev. |
| P1 | Editor, výchozí logo, favicon, CSS/JS a základní JSON přicházejí také z GitHub Pages. | Publikovat potřebné soubory v ověřeném vlastním artefaktu. Verze loga má vlastní neměnnou URL; při návratu k defaultu použít lokální soubor. Odhalit také uložené logo na Renderu a koordinovaně je převést. |
| P2 | `README.md`, přesměrování `index.html` / `design-system/index.html`, archivní `private/editor.html` a `UPDATE-PLANS.md` popisují staré adresy či implicitní profil. | Po odsouhlasení cílových cest upravit zdroj pravdy a odstranit duplicitní editor nebo jej generovat. Staré vývojové odkazy nejsou závazek kompatibility. Žádné plošné mazání školních dat. |

## Připravená změna loga (lokálně, nenasazeno)

1. První volba je výběr souboru s náhledem; odkaz zůstává pod rozbalovacím „Použít odkaz na logo“. Vybraný soubor má přednost. Výběr souboru nic nepublikuje.
2. Potvrzení odešle binární soubor přes `POST /api/design-system/branding/logo`. Backend nejprve ověří operátorské oprávnění, velikost a podporovaný typ. Školní účet globální logo měnit nesmí.
3. PNG/GIF/WebP a statické SVG, limit 2 MB. Animace lze nahrát jako GIF/WebP; SVG upload odmítá aktivní prvky, skripty, externí zdroje a animace. Rozměry PNG/GIF jsou omezené. Nejde o plný raster dekodér; skutečné vykreslení a poškozené soubory ověřit také v prohlížeči.
4. Nová aditivní tabulka `eduvize_brand_assets_v1` obsahuje hash, MIME a bytes. V téže DB transakci se přepne globální `logoUrl`. Selhání zachová předchozí logo. Historické soubory se automaticky nemažou.
5. Veřejné bytes mají same-origin adresu `/api/design-system/branding/assets/{sha256}`, immutable cache, nosniff a omezující CSP. Nespoléhají na disk kontejneru nebo externí obrazovou službu. Záloha databáze musí zahrnout i tuto tabulku.
6. Odkazová varianta a návrat ke standardnímu logu používají stávající PUT. Nové odkazy na Render jsou odmítnuté; již uložené odkazy tím nejsou migrovány.
7. `branding.js` načítá API ze stejného originu a podporuje relativní URL nahraného loga. Default se odvozuje od lokálního skriptu.

Před společným testem propojit nový same-origin klient s koordinovaným auth klientem. Starý nezkompilovaný auth má pevný CENTRAL na Renderu a nový požadavek na vlastní origin odmítne; tato změna tedy není určena k samostatnému nasazení na starý Render/GitHub Pages editor. Prověřit také CSP `img-src blob:` pro místní náhled souboru.

## Doporučené pořadí

1. **Dokončit společný kontrakt a rozhraní klienta.** Potvrdit veřejná pole stylu/revize a okamžik dostupnosti kontextu před prvním vykreslením. Převzít fixtures dvou škol a dvou profilů od vlastníka API.
2. **Sjednotit prostředí a infrastrukturu.** Společný vlastník auth/endpointů upraví adresy, callbacky a scopes; serverový proud doloží vlastní DB, zálohy a start bez Renderu. Audit sestavených souborů je povinný.
3. **Začlenit nahrání loga.** Rebase obou větví na koordinované změny, propojit zdroje UI v release, ověřit oprávnění, DB transakci a zálohu/obnovu, náhradu loga v aplikacích i návrat ke standardnímu. Nezasahovat do `app.py` ani společných output modulů.
4. **Přepojit veřejný styl a první vykreslení.** Odstranit převzetí lokální relace na veřejných stránkách, sjednotit cache a refresh podle output registry, doplnit revize a chování při odvolání výstupu.
5. **Opravit publikování a životní cyklus stylů.** Atomická aktivace, ochrana před souběhem, pravidlo pro smazání používaného stylu. Zachovat rozdíl mezi náhledem editoru a publikovaným vzhledem.
6. **Testovací vydání až po samostatném pokynu.** Lokální a integrační ověření, PR, následně pouze test. Tento požadavek zatím neautorizuje žádné nasazení. Produkce samostatně schváleným postupem.

Nezávisle lze připravovat UI loga a dokumentaci; přihlášení, veřejný kontext, resolver a společný endpointový model musí zůstat koordinované.

## Ověření a zbývající důkazy

Lokálně prošlo 8 Python API testů (FastAPI routy s testovací databázovou náhradou) a 7 JS testů interakce (VM s náhradou DOM). Pokrývají upload, oprávnění, velikost/formát, aktivní SVG, stejné ID při opakování, veřejné čtení, chybu transakce, prioritu souboru, URL variantu a návrat ke standardnímu logu. Syntaxe obou branding skriptů ověřena.

Zatím NEOVĚŘENO: skutečný PostgreSQL, migrace/obnova, render rozhraní v prohlížeči, současná auth relace, živé vnořené aplikace a plošná nezávislost na Renderu. Mock testy nejsou doklad splnění provozního kontraktu.

Před vydáním doložit:

- Přihlášený operátor, škola a nepřihlášený návštěvník; odhlášení, dvě školy a dva profily s úmyslně cizí cache.
- Veřejné výstupy sledují jen svůj profil; změna stylu ani loga nemění jejich adresy; náhled nic nepublikuje.
- Web/NSP/kiosek, malé segmenty a obě orientace; standardní logo nahrazeno, vlastní školní logo zachováno; animovaný GIF/WebP, průhlednost a mobilní formulář.
- Databázová chyba, přerušený upload, souběžná změna, restart a obnova zálohy zachovají poslední publikovaný vzhled.
- Zablokovat `*.onrender.com` na klientu I SERVERU, smazat cache, restartovat služby; ověřit styly/logo, auth/callback, licence, profily i vnořený obsah. Přiložit konzoli, síťové požadavky, očekávaný a skutečný obsah. HTTP 200 nestačí.
- Pro každé prostředí evidovat release ID, anonymní fixtures, výsledek a důkaz. Žádná produkční data v testu, žádný fallback na Render.
