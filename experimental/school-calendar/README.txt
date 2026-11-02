EDUVIZE — ŠKOLNÍ KALENDÁŘ
Funkční verze, 2. listopadu 2026.

Otevření: index.html. Ručně lze vybrat typ školy a okres, přihlášený školní účet načítá vlastní school-identity ze společného profilu na OneDrive. Místní karta se čte pouze pod klíčem ověřené školy; bez přihlášení se nepřebírá starý neoddělený testovací záznam. Přepnutí účtu nebo odhlášení okamžitě odstraní předchozí kartu. Název školy se nedává do veřejného odkazu.

Zobrazení: posuvných 30 dní, kalendářní měsíc a agenda. Kliknutí na den otevře jeho detail. Šest nezávislých filtrů: organizace roku/prázdniny, přijímací řízení, maturity, svátky, významné dny, jmeniny. Filtry a rozsah platí pro přehled, detail, ICS export i vytvořený odkaz. Prázdný výběr nevypisuje všechny události. URL přenáší veřejné filtry, typ školy a okres, nikdy oprávnění či identitu školy.

Školní rok 2026/2027: data MŠMT/Cermat, všechny okresní skupiny jarních prázdnin, přijímací řízení a maturitní cyklus 2027. Každá školní událost má zdroj a datum kontroly. Konkrétní školní zkoušky a další kola stanovují školy; nevymýšlíme je. Podrobný rozpis maturitních testů ještě není doplněn. Další roky je potřeba doplnit a schválit. Import ICS je statický, není to živý odběr.

Jmeniny a svátky: přímé čtení https://pborovicka72-dotcom.github.io/eduvize-svatky/calendar.json. Žádná druhá produkční databáze. Tobiáš 2. listopadu byl opraven v aplikaci Svátky; Dušičky jsou samostatná událost. Selhání zdroje se hlásí samostatně, školní události zůstávají dostupné.

Výstup: display=1&viewMode=nsp; interaktivní kiosek display=1&viewMode=kiosk ponechá filtry a navigaci. Velký přehled vyžaduje plochu >= 1,4 milionu pixelů, kratší hranu >= 850 a poměr stran 0,42–2,4; menší segmenty používají stránkovanou agendu. Geometrii přímých segmentových URL řeší společný segment-display.js; samostatný administrační picker a ukládání konfigurace kalendáře na OneDrive zatím nejsou připojeny. Opakované denní karty mají jednotnou výšku, delší titulky se zkrátí v kartě a celý text zůstane v detailu a přístupném názvu. Zdrojová patička je v malých segmentech skrytá.

Karta školy: součást ../../ucet.html, vyhledávání registru MŠMT a ukládání school-identity zajišťuje současná společná implementace. account.html přesměrovává. Rejstřík schools.json.gz pochází z exportu MŠMT k 30. 9. 2026.

Testy: node experimental/school-calendar/test_engine.mjs; node experimental/school-calendar/test_school_card.mjs. Ověřeno také ruční filtrování, detail, URL, odhlášení a přepnutí škol s izolovaným testovacím adaptérem. Přihlášení skutečným Microsoft účtem nebylo při této změně prováděno.
