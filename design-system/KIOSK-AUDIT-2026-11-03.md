# Audit kioskových výstupů · 3. 11. 2026

## Výsledek
Kiosek má společné měřítko pro čtení zblízka a dotykové ovládání. Základní text je 24–40 px, hlavička 88–160 px podle kratší strany skutečného viewportu. Na 1920 × 1080 a 1080 × 1920 je základ 32,4 px, titul hlavičky 44,064 px a hlavička 129,6 px. Velikost se neodvozuje od počtu položek. Volné místo je přípustné.

## Rozsah
Moudrost dne, Svátky a jmeniny (včetně původu jména), Aktuality, Dokumenty, Jídelníček, Jízdní řády, Počasí (standardní a meteostanice), Průběh dne, Fotogalerie, Školní kalendář, Kiosek (menu a vlastní obsah) a školní systémy: rozvrh, školní přehled, suplování, náhrady učitelů, změny dozorů, události a oznámení.

## Změny
- Společná politika v segment-profile.js a vazby komponent v kiosk-reading.css. Barvy, plochy a zaoblení zůstávají aktivním globálním stylem.
- Sdílené hlavičky také v kioskovém kalendáři a fotogalerii.
- Krátký citát se nezvětšuje podle prázdného boxu. Odpočet a analogový ciferník mají společný horní limit.
- Stejné běžné písmo pro jídelníček, odjezdy, aktuality, detaily počasí a školní seznamy.
- Katalog dokumentů neodvozuje velikost názvů od zmenšeného dlouhého titulku.
- Tabulkový rozvrh se nepřibližuje nad výchozí měřítko jen kvůli volné ploše.
- Přirozená výška jídelníčku, citátu a části karet svátků. Fotografie, grafy a mřížky mohou plochu využít.
- Meteostanice rezervuje výšku přístrojům; na velmi nízké ploše může mít dotykový svislý posun.
- Obnovena verze assetů všech vstupních výstupních stránek; veřejná URL a nastavení se nemění.

## Ověření
- Automatická kontrola 7 geometrií: 1280×720, 1920×1080, 1080×1920, 3840×2160, 2160×3840, 760×1400, 2968×488.
- Regrese stávajících velikostí NSP/web.
- V prohlížeči srovnáno 17 variant v reálných iframe viewportech 1920×1080 a 1080×1920; stejná základní textová a hlavičková metrika.
- Dlouhé názvy, krátké i delší texty, řidší obsah a více řádků.
- Suplování 1280×720: všech 24 testovacích položek, 12 stran, žádný oříznutý řádek.
- Jídelníček 1080×1920: tělo i celá karta bez přetečení.
- Meteostanice 1280×720: žádné přetečení přístrojových karet.
- Ověření rozložení používá oddělené syntetické podklady; nejde o test dostupnosti poskytovatelů dat ani školního přihlášení.
