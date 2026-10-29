# Eduvize – Styly

Samostatný modul pro centrální správu vizuálních stylů Eduvize.

## Hranice odpovědnosti
Tento repozitář vlastní definice barev, typografie, okrajů, zaoblení, náhledů, chráněného výchozího stylu a uživatelských předvoleb. Neobsahuje data ani obchodní logiku počasí, svátků, jízdních řádů, dokumentů, aktualit nebo kiosku.

## Požadované chování
- Uložený styl má barevnou miniaturu generovanou ze skutečných hodnot.
- Výběr stylu načte všechny hodnoty do editoru a obnoví náhled.
- Úpravy jsou označeny jako neuložené; při přepnutí se zobrazí varování.
- Výchozí styl je neměnný a nelze jej odstranit; lze jej kopírovat.
- Verze schématu a stylů jsou explicitní.
- Klientské aplikace pouze načítají styly; nespravují je.

## Migrační pravidla
1. Inventarizovat implementace a závislosti v ostatních repozitářích.
2. Přenést pouze funkce správy vzhledu a jejich testy.
3. Napojit konzumenty na centrální API a ověřit shodné vykreslení.
4. Teprve po ověření odstranit původní implementace. Neodstraňovat lokální vykreslovací CSS, pokud je stále nezbytné pro chod aplikace.
5. Zachovat stávající uložené uživatelské styly a možnost návratu.

**Stav:** Připraveno jako cílový repozitář. Migrace existujícího kódu a odstranění duplicit dosud nebyly dokončeny.
