# Zpětná kompatibilita odkazů Eduvize

## Závazek při každé změně

Nasazení nové aplikace ani sdíleného design systému není samo o sobě důvod k nahrazení odkazu školy. Stabilní adresy výstupů, význam parametrů, jejich staré názvy a chování chybějících hodnot tvoří veřejné rozhraní. Zachovejte také fragment, opakované obsahové parametry a všechny parametry mimo měněnou oblast. Neodstraňujte neznámé parametry. Nikdy neprovádějte hromadný přepis školních odkazů bez náhledu a uchování originálu.

## Dvě nezávislé verze

- `v` je identifikátor mezipaměti, nikoliv verze konfigurace nebo příslib spuštění historického kódu.
- `edu-link=1` označuje společný formát nově vytvářených výstupních odkazů přes `EduvizeOutputModes.url`.
- Odkazy bez `edu-link` jsou historický formát 0. Nesmějí kvůli tomu přestat fungovat. Jejich původní implicitní hodnoty musí zůstat zachované.
- Neznámé číslo formátu nepřepisujte na aktuální číslo. Nespouštějte automatický downgrade konfigurace.
- Nová verze vzhledu neznamená nové číslo formátu. Změna výchozí hodnoty musí být omezena na nové odkazy s novým formátem nebo mít zpětně kompatibilní převod.

## Kdy a jak informovat školu

Oznámení patří do administrací a správy aplikací, ne do školních veřejných obrazovek. `design-system/link-releases.json` je společné oznámení s jedinečným ID; nové ID se zobrazí i škole, která potvrdila předchozí oznámení. Potvrzení nemaže žádné odkazy ani nastavení. Při nedostupnosti oznámení musí stávající obsah dál fungovat.

U každé skutečné nekompatibilní změny musí oznámení před nasazením uvést: dotčenou aplikaci a parametry/formáty, konkrétní dopad, zda jde o informaci/doporučení/nutnost, přesný postup nápravy a případný termín. Doplnit pravidlo do kontroly, migrační test a porovnání původního/nového náhledu. Termín ukončení podpory nelze stanovit jen úpravou výchozí hodnoty v kódu. Nejprve nabídněte kompatibilní překlad nebo zachovaný starý endpoint. Pokud je nutný ruční zásah, původní odkaz musí být dohledatelný pro návrat.

## Kontrola v administraci

Kontrola je místní a ověřuje pouze evidované adresy, společné parametry, číslo formátu a existenci segmentu podle načtené geometrie. Neslouží jako potvrzení dostupnosti zdroje, API, účtu nebo správného vzhledu. Neznámý formát či cesta znamenají „nelze posoudit / vyžaduje ověření“, nikoliv nefunkční odkaz. Historický odkaz není automaticky označen jako chybný. Žádné vložené URL se neposílá ani neukládá; výpis neodráží jejich obsah do DOM. Aktuální implementace neposkytuje úplný seznam školních odkazů ani jejich síťový monitoring.

## Povinná kontrola před vydáním

1. Přidejte anonymizovaný regresní případ původního odkazu do testů. Nikdy neukládejte přístupové klíče ani přihlašovací údaje.
2. Ověřte všechny historické názvy parametrů, chybějící hodnoty, češtinu, kombinaci web/NSP/kiosek, identifikátor konfigurace školy a zachování cizích parametrů.
3. Ověřte stejná vstupní data ve starém a novém parseru; u změny vzhledu porovnejte skutečný výstup v obou orientacích a malých/velkých segmentech. Test společného kontraktu nenahrazuje test konkrétní aplikace.
4. Změnu vydávejte nejprve s kompatibilním čtením. Generování nového formátu až potom. Nové výchozí hodnoty nesmějí zpětně změnit význam formátu 0.
5. Při změně parametrů aplikace aktualizujte její regresní případy i společné oznámení. Změny bez ověřené kompatibility nezveřejňujte jako bezpečné.

`link-contract.js` je zdroj společného kontraktu. Jeho identická kopie je vložena před `output-modes.js`, aby čtení/generování nebylo závislé na asynchronním stažení dalšího skriptu. Při změně zdroje aktualizujte i tento prefix; test kontroluje jejich shodu. Samostatný skript slouží kontrolnímu panelu ve správě aplikací.
