# Eduvize – centrální správa aplikací a stylů

Tento repozitář je **jediným zdrojem** společného administračního design systému a geometrie šablon Newline Signage Pro. Obsahové aplikace (Počasí, Dokumenty, Kiosek a další) mají vlastní repozitáře a používají zde publikované komponenty.

## Veřejné adresy

- [Správa aplikací](https://pborovicka72-dotcom.github.io/eduvize-styly/aplikace.html) – rozcestník aplikací.
- [Správa stylů](https://eduvize-design-system-api.onrender.com/) – skutečný editor s databázovým ukládáním.
- [Zdraví API](https://eduvize-design-system-api.onrender.com/health) – stav backendu.

Kořenový `index.html` a `design-system/index.html` jsou **pouze přesměrování** kvůli starším odkazům. Neobsahují další editory.

## Vlastnictví zdrojů

| Soubor / část | Odpovědnost |
| --- | --- |
| `app.py`, `render.yaml`, `requirements.txt` | Samostatné API pro správu stylů a nasazení |
| `editor.html` | Jediný editor stylů |
| `design-system/admin-theme.json` | Základní výchozí styl a schéma |
| `design-system/admin-tokens.css` | Výchozí designové proměnné |
| `design-system/admin-shell.css` | Sdílené vzhledové komponenty administrací |
| `design-system/admin-components.css` | Společné komponenty editoru a administrací |
| `design-system/active-theme.js` | Načtení a použití aktivního stylu |
| `design-system/nsp-geometry.js` | Kanonické rozměry a polohy segmentů |
| `design-system/nsp-segments.js`, `nsp-segments.css` | Společný výběr šablon a segmentů |
| `aplikace.html` | Centrální rozcestník aplikací |

## Pravidla údržby

1. Definice vzhledu a geometrie Newline se upravují **zde**, nikoliv kopírováním do jednotlivých aplikací.
2. Aplikační repozitáře vlastní pouze své funkce, konfiguraci obsahu, lokální rozložení a nezbytné integrační adaptéry.
3. Nové CSS přepisy se nepřidávají jako další historická vrstva; existující pravidlo se opravuje u zdroje.
4. Před odstraněním souboru se ověřují všechny odkazy, importy, nasazení a automatizované testy. Staré veřejné adresy lze zachovat malým přesměrováním.
5. Změny aktivního stylu se ověřují v administraci Dokumentů (referenční aplikace), Počasí a Kiosku. Zobrazovací stránky se nesmějí neúmyslně změnit.
6. Seznam stylů je veřejně čitelný; vytváření, úpravy, aktivace a mazání vyžadují `DESIGN_SYSTEM_ADMIN_TOKEN`.

## Provoz

Render používá `uvicorn app:app`. Vyžaduje `DATABASE_URL` a `DESIGN_SYSTEM_ADMIN_TOKEN`; hodnoty se nikdy neukládají do GitHubu. GitHub Pages publikuje statický rozcestník a sdílené CSS/JS.

Tento dokument popisuje cílové vlastnictví kódu. Samostatné moduly mohou stále obsahovat historické lokální styly; ty se odstraňují pouze po kontrole skutečných závislostí a regresních testech.

## Automatická výška víceřádkových polí
`active-theme.js` načítá společné `form-fields.js` a `form-fields.css`. Všechny editovatelné textarea se zvětšují i zmenšují podle obsahu, dostupné šířky a fontu. Dynamicky přidaná pole se registrují automaticky. Vědomá výjimka: `data-edu-autogrow="off"`. Po programatické změně hodnot lze zavolat `window.EduvizeForms?.refresh()`. Aplikace nesmějí udržovat vlastní kopii tohoto chování ani přepisovat jeho výšku/minimum.

## Jednotné výstupy

`output-modes.js` je společná smlouva pro Běžnou stránku, Newline Signage Pro a Kiosek. `output-header.js`, `segment-profile.js` a `output-integrity.js/css` sjednocují výšku hlaviček a textové role podle fyzického viewportu segmentu. Běžná stránka má průběžný obsah bez stránkování a animované logo z `web-brand.js/css`; kiosek používá ruční stránkování. Počasí v NSP může automaticky stránkovat kompletní měření a zapnuté předpovědi. Veškeré CSS počasí je v `design-system/weather-output.css`, nikoli v lokálních vrstvách aplikace.

## Společné přihlášení administrací

Jediné zadávání administračních klíčů a připojení Microsoftu je nahoře na [rozcestníku aplikací](https://pborovicka72-dotcom.github.io/eduvize-styly/aplikace.html#account). Klíče Dokumentů a stylů jsou volitelné podle potřebných oprávnění; další oprávnění lze doplnit později. Klíče ani Microsoft tokeny se neukládají do klientských konfigurací.

`admin_sessions.py` na existujícím API stylů vydává neprůhledné relace na osm hodin. Databáze uchovává pouze hashe relací; původní klíče se po ověření neuchovávají. Používá se existující `DATABASE_URL`, `DESIGN_SYSTEM_ADMIN_TOKEN` a ověření `DOCUMENTS_ADMIN_TOKEN` přes server Dokumentů; není potřeba přidávat sdílené tajemství mezi službami. Jednorázové předání přes fragment URL platí 60 sekund, je vázané na povolený cílový origin a dává jen oprávnění cílového modulu. Po výměně se fragment ihned odstraní. Nezávisí na cookies třetích stran.

`design-system/admin-auth.js` poskytuje stav, návratový odkaz na centrum a autorizované požadavky. `admin-account.js/css` vlastní panel rozcestníku. Na stejné důvěryhodné GitHub Pages doméně se sdílí centrální relace; jiné domény dostávají vlastní podřízenou relaci. Odhlášení zruší rodičovskou relaci i všechny podřízené. Připojení OneDrive pro běžící výstupy zůstává na serveru Dokumentů. Při vypršení administrace nebo OneDrivu aplikace odkáže na rozcestník.

Původní hlavičkové klíče zůstávají podporované na API pro stávající automatizace. Ve formulářích jednotlivých aplikací už nejsou. Při nasazení se nejprve zveřejní moduly a API obou služeb, poté panel a napojené administrace. Integrační testy: `python -m unittest discover -s tests -p 'test_admin_sessions.py'`; klient: `node design-system/tests/admin-auth.test.mjs`.


## Výslovné ovládání výstupu

Generátor ukládá `interaction=interactive` nebo `interaction=display` do každého nového odkazu. Rozložení `web`, `nsp` a `kiosk` je samostatná volba; žádná detekce zařízení, dotyku ani typu ukazatele se neprovádí. Kiosek i jeho obsahové aplikace vždy používají interaktivní režim, i pokud dodaný odkaz tvrdí opak.

Společná komponenta `output-modes.js` nabízí volbu v administracích, předává ji do náhledů a ukládání konfigurace a řídí ruční či časované stránkování. Statické webové výstupy se automaticky posouvají v běžném dokumentovém toku. Staré odkazy bez parametru zachovávají deterministickou kompatibilitu: web a kiosek interaktivní, NSP pouze zobrazování. Pro změnu režimu staré obrazovky vygenerujte nový odkaz.

Knihovna odkazů ukazuje ikonu ruky nebo obrazovky a textový popis. Server metadata odvozuje z URL; obě varianty stejného NSP segmentu se uchovávají samostatně.
