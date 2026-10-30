# Pravidla zobrazení v segmentech

Verze 1, 31. 10. 2026. Geometrie je společná pro aplikace, obsahová politika je specifická pro modul. Barvy a zaoblení nadále určuje aktivní designová šablona.

## Společná smlouva

`EduvizeSegmentProfile.resolve(width,height)` dostává skutečné CSS rozměry výstupu nebo segmentu, nikoli rozměr zmenšeného náhledu. Vrací tvar, poměr stran, kratší stranu a měřítko. Číslo šablony, pořadí segmentu ani velikost administrátorského okna nesmí rozhodovat o viditelnosti dat.

Aplikace definuje priority obsahu, jeho maximální počet a typografické role. `holidays(geometry, options)` je první taková politika. Ostatní moduly mohou přidat vlastní politiku nad stejnou geometrií; automaticky nepřebírají pravidla Svátků. Počasí zatím změněno není.

## Profily a priority Svátků

| Profil | Podmínka (v tomto pořadí) | Dnešní údaje | Další dny | Sloupce přehledu |
|---|---|---|---|---|
| panoramic | poměr šířka/výška ≥ 2,7 | zachované, vedle data | nejvýše 3 | až 3 |
| compact | kratší strana < 720 px | zachované pod datem | bez samostatného přehledu | – |
| portrait | poměr < 0,8 | zachované | nejvýše 6 | 1 pod 900 px, jinak 2 |
| square | poměr < 1,4 | zachované | nejvýše 6 | až 3 |
| landscape | ostatní | zachované | nejvýše 6 | až 6 |

Počet dnů z konfigurace je vždy horní limit. Vypnuté státní svátky nebo významné dny se nikdy samy nezapnou. Chybějící dnešní data nezanechávají prázdné karty. Volba Zítra zůstává krátkou poznámkou u dnešních jmenin, pokud se samostatný přehled nezobrazuje. Dnešní události se kvůli zapnutí přehledu neschovávají.

Datum je první orientační role, následují dnešní jmeniny a dnešní povolené události. Přehled dalších dnů je doplňkový. Běžná hlavička zabírá nejvýše 20 % výšky nebo 24 % kratší strany; karty dnešních údajů při zobrazeném přehledu nejvýše 30 % výšky. U pruhu jsou datum, dnešní údaje a další dny vedle sebe v poměru 24:32:44. Bez přehledu se plocha přerozdělí.

Velikosti ikon, názvů, poznámek, mezer a vnitřního odsazení jsou pojmenované role odvozené od kratší strany. Pruhy mají vlastní čitelné minimum. Dlouhé texty se zalamují; následná kontrola skutečného prostoru zmenšuje písmo pouze do profilového minima. Obsah se neořezává na počet znaků. Nezavádí se automatické listování ani posouvání.

## Mapa současných segmentů

| Orientace | Styl / segment | Rozlišení | Profil | Maximum dalších dnů |
|---|---|---|---|---|
| landscape | 1 / 1 | 3840 × 2160 | landscape | 6 |
| landscape | 2 / 1 | 1200 × 2160 | portrait | 6 |
| landscape | 2 / 2 | 2640 × 1480 | landscape | 6 |
| landscape | 2 / 3 | 2640 × 680 | panoramic | 3 |
| landscape | 3 / 1 | 960 × 2160 | portrait | 6 |
| landscape | 3 / 2 | 2880 × 2160 | square | 6 |
| landscape | 4 / 1 | 1680 × 1080 | landscape | 6 |
| landscape | 4 / 2 | 2160 × 2160 | square | 6 |
| landscape | 4 / 3 | 1680 × 1080 | landscape | 6 |
| landscape | 5 / 1 | 1920 × 1080 | landscape | 6 |
| landscape | 5 / 2 | 1920 × 1080 | landscape | 6 |
| landscape | 5 / 3 | 1920 × 1080 | landscape | 6 |
| landscape | 5 / 4 | 1920 × 1080 | landscape | 6 |
| landscape | 6 / 1 | 872 × 1672 | portrait | 6 |
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
| portrait | 3 / 1 | 2160 × 560 | panoramic | 3 |
| portrait | 3 / 2 | 2160 × 1216 | landscape | 6 |
| portrait | 3 / 3 | 1080 × 2064 | portrait | 6 |
| portrait | 3 / 4 | 1080 × 2064 | portrait | 6 |
| portrait | 4 / 1 | 2160 × 560 | panoramic | 3 |
| portrait | 4 / 2 | 2160 × 1390 | landscape | 6 |
| portrait | 4 / 3 | 2160 × 1890 | square | 6 |
| portrait | 5 / 1 | 1080 × 1920 | portrait | 6 |
| portrait | 5 / 2 | 1080 × 1920 | portrait | 6 |
| portrait | 5 / 3 | 1080 × 1920 | portrait | 6 |
| portrait | 5 / 4 | 1080 × 1920 | portrait | 6 |

## Ověření a rozšíření

Jednotkové testy pokrývají všech 36 segmentů, limity uživatelské konfigurace a proporcionalitu při změně rozlišení. Prohlížečová kontrola používá všech 36 skutečných viewportů a dlouhá testovací jména i názvy událostí; měří přetékání karet a celé plochy. `?debug=1` ve výstupu ukáže profil, viewport a skutečný počet doplňkových dnů.

Pro Počasí se mají nejprve seřadit priority (aktuální stav, hodinová, denní, textová předpověď), určit nejmenší čitelný blok a nad touto smlouvou vytvořit vlastní politiku. Geometrii a škálování náhledů přitom nepřepisovat.
