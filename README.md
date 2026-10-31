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
