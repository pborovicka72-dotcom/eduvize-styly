Eduvize — karta školy a školní kalendář, vývojový náhled 2026.11.02.1

Otevřete account.html přes HTTP server, vyplňte testovací kartu a přejděte do index.html.
Veřejný náhled nemá Microsoft přihlášení. Nejde o bezpečnostní hranici školy.
Údaje náhledu se ukládají lokálně pod odděleným klíčem eduvize-school-card-preview-v1.
Produkční implementace musí místo tohoto úložiště použít /api/me a school context
z ověřené serverové relace (viz cloud_core.py v lokální přípravě).

Obsah: školní rok 2026/2027, organizace vyučování, všechny okresní skupiny jarních
prázdnin, přijímací řízení včetně prvního a druhého kola a maturitní cyklus 2027.
Zdroje a datum kontroly jsou součástí každé události. Nejde o automatický odběr.
Konkrétní dny profilových zkoušek a třetí/další kola stanovují školy, proto je
nevymýšlíme. Podrobný rozpis maturitních didaktických testů ještě není načten.
Svátky a jmeniny odkazují na stávající aplikaci; dosud nejsou vloženy do mřížky
kalendáře, aby nevznikla paralelní databáze. K úplnému propojení chybí adaptér.

Funkční rozhraní: karta školy, výběr okresu/typu školy, agenda, měsíční pohled,
filtrování oblastí a export statického ICS s celodenními událostmi. Import ICS
není živý odběr a pozdější změny zdrojů se do importovaného souboru nepromítnou.
Kiosek/NSP: parametr display je interní hrubý vývojový náhled; zatím není připojen
ke společnému výběru segmentů, hlavičce a typografii. Nevydávat za hotový výstup.

Testy: node test_engine.mjs
Před produkčním zapojením: další školní roky; schvalování a aktualizace centrálních
termínů; adaptér Svátků; rozhraní školního účtu a více pracovišť; sdílený picker a
geometrie kiosk/NSP; podmínky typů škol a uchazečů; revize a automatický odběr ICS.
