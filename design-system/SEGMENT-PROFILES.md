# Pravidla zobrazení v segmentech

Verze 2, 31. 10. 2026. Geometrie je společná pro aplikace, obsahová politika je specifická pro modul. Barvy a zaoblení nadále určuje aktivní designová šablona.

## Společná smlouva

`EduvizeSegmentProfile.resolve(width,height)` dostává skutečné CSS rozměry výstupu nebo segmentu, nikoli rozměr zmenšeného náhledu. Vrací tvar, poměr stran, kratší stranu a měřítko. Číslo šablony, pořadí segmentu ani velikost administrátorského okna nesmí rozhodovat o viditelnosti dat.

Aplikace definuje priority obsahu, jeho maximální počet a typografické role. `holidays(geometry, options)` je první taková politika. Ostatní moduly mohou přidat vlastní politiku nad stejnou geometrií; automaticky nepřebírají pravidla Svátků. Obsahová politika Počasí zůstává samostatná; rozměry hlavičky již sdílí s ostatními aplikacemi.

## Profily a priority Svátků

| Profil | Podmínka (v tomto pořadí) | Dnešní údaje | Další dny | Sloupce přehledu |
|---|---|---|---|---|
| panoramic | poměr šířka/výška ≥ 2,7 | zachované pod společnou hlavičkou | nejvýše 2 při poměru pod 4,5; jinak 3 | až 3 |
| compact | kratší strana < 720 px | zachované pod datem | bez samostatného přehledu | – |
| portrait | poměr < 0,8 | zachované | nejvýše 6, pod 960 px šířky 4 | až 2 |
| square | poměr < 1,4 | zachované | nejvýše 6 | až 3 |
| landscape | ostatní | zachované | nejvýše 6 | až 3 |

Počet dnů z konfigurace je vždy horní limit. Vypnuté státní svátky nebo významné dny se nikdy samy nezapnou. Chybějící dnešní data nezanechávají prázdné karty. Volba Zítra zůstává krátkou poznámkou u dnešních jmenin, pokud se samostatný přehled nezobrazuje. Dnešní události se kvůli zapnutí přehledu neschovávají.

Datum je první orientační role, následují dnešní jmeniny a dnešní povolené události. Přehled dalších dnů je doplňkový. Hlavička všech výstupních aplikací používá `header(geometry)`: výška 16 % kratší strany, box ikony 60 % výšky hlavičky, kresba 60 % boxu, hlavní text 32 % a doplňkový text 14 % výšky. Odsazení a mezera jsou 12 % výšky. Sdílené soubory `output-header.js/css` čtou tuto smlouvu; aplikace označuje `.edu-output-header`, `.edu-header-title` a `.edu-header-meta`. Výpočet probíhá z viewportu skutečného segmentu, nikdy ze zmenšeného administrátorského náhledu. Karty dnešních údajů mají při zobrazeném přehledu nejvýše 32 % výšky. U pruhu je hlavička nahoře přes celou šířku a pod ní dnešní údaje a další dny v poměru 35:65. Bez přehledu se plocha přerozdělí.

Velikosti ikon, názvů, poznámek, mezer a vnitřního odsazení jsou pojmenované role odvozené od kratší strany. Přehled dalších dnů používá nejvýše tři sloupce (svisle dva), text dále roste podle vnitřní šířky a výšky své karty a jeho skupina je svisle vystředěná. Pruhy mají vlastní čitelné minimum. Dlouhé texty se zalamují; následná kontrola skutečného prostoru zmenšuje písmo pouze do profilového minima. Obsah se neořezává na počet znaků. Nezavádí se automatické listování ani posouvání.

## Mapa současných segmentů

| Orientace | Styl / segment | Rozlišení | Profil | Maximum dalších dnů |
|---|---|---|---|---|
| landscape | 1 / 1 | 3840 × 2160 | landscape | 6 |
| landscape | 2 / 1 | 1200 × 2160 | portrait | 6 |
| landscape | 2 / 2 | 2640 × 1480 | landscape | 6 |
| landscape | 2 / 3 | 2640 × 680 | panoramic | 2 |
| landscape | 3 / 1 | 960 × 2160 | portrait | 6 |
| landscape | 3 / 2 | 2880 × 2160 | square | 6 |
| landscape | 4 / 1 | 1680 × 1080 | landscape | 6 |
| landscape | 4 / 2 | 2160 × 2160 | square | 6 |
| landscape | 4 / 3 | 1680 × 1080 | landscape | 6 |
| landscape | 5 / 1 | 1920 × 1080 | landscape | 6 |
| landscape | 5 / 2 | 1920 × 1080 | landscape | 6 |
| landscape | 5 / 3 | 1920 × 1080 | landscape | 6 |
| landscape | 5 / 4 | 1920 × 1080 | landscape | 6 |
| landscape | 6 / 1 | 872 × 1672 | portrait | 4 |
| landscape | 6 / 2 | 2968 × 1672 | landscape | 6 |
| landscape | 6 / 3 | 872 × 488 | compact | 0 |
| landscape | 6 / 4 | 2968 × 488 | panoramic | 3 |
| landscape | 7 / 1 | 1280 × 2160 | portrait | 6 |
| landscape | 7 / 2 | 1280 × 2160 | portrait | 6 |
| landscape | 7 / 3 | 1280 × 2160 | portrait | 6 |
| landscape | 8 / 1 | 3840 × 1672 | landscape | 6 |
| landscape | 8 / 2 | 3840 × 488 | panoramic | 3 |
| portrait | 1 / 1 | 2160 × 3840 | portrait | 6 |
| portrait | 2 / 1 | 2160 × 960 | landscape | 6 |
| portrait | 2 / 2 | 2160 × 2880 | portrait | 6 |
| portrait | 3 / 1 | 2160 × 560 | panoramic | 2 |
| portrait | 3 / 2 | 2160 × 1216 | landscape | 6 |
| portrait | 3 / 3 | 1080 × 2064 | portrait | 6 |
| portrait | 3 / 4 | 1080 × 2064 | portrait | 6 |
| portrait | 4 / 1 | 2160 × 560 | panoramic | 2 |
| portrait | 4 / 2 | 2160 × 1390 | landscape | 6 |
| portrait | 4 / 3 | 2160 × 1890 | square | 6 |
| portrait | 5 / 1 | 1080 × 1920 | portrait | 6 |
| portrait | 5 / 2 | 1080 × 1920 | portrait | 6 |
| portrait | 5 / 3 | 1080 × 1920 | portrait | 6 |
| portrait | 5 / 4 | 1080 × 1920 | portrait | 6 |

## Ověření a rozšíření

Jednotkové testy pokrývají všech 36 segmentů, limity uživatelské konfigurace a proporcionalitu při změně rozlišení. Prohlížečová kontrola používá všech 36 skutečných viewportů a dlouhá testovací jména i názvy událostí; měří přetékání karet a celé plochy. `?debug=1` ve výstupu ukáže profil, viewport a skutečný počet doplňkových dnů.

Počasí používá centrální `weather-output.css`. Standardní web řadí měření a zapnuté předpovědi pod sebe; kiosek má ruční stránkování a NSP automatické. Fyzický viewport všech segmentů vytváří společný `segment-display.js` nad `nsp-geometry.js`. Lokální kopie geometrie ani vrstvy historických CSS přepisů se neudržují.

Textové role `text(geometry, mode)` jsou sdílené mezi aplikacemi. Hlavičku vynucuje `output-header.js` i pro dynamicky vytvořenou navigaci; stejný viewport má stejnou výšku a písmo. Běžný web používá hlavičku 96 px a základní text 18 px, průběžný responzivní obsah a sdílené animované logo přes `web-brand.js/css`. `output-integrity.js/css` odděluje web, NSP a kiosek, aby se stránkování a omezení plochy nepřenášela mezi režimy.
