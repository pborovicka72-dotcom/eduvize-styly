# Společné plánování aktualizací

Sbalený modul se připojuje ke každé administraci přes `configuration-profiles.js`.
Nastavení školy se ukládá do existující PostgreSQL databáze služby Dokumenty, odděleně podle školy a aplikace, s kontrolou revize. Není závislé na otevření administrace ani na místním úložišti prohlížeče.

## Obnovování obsahu

Výchozí volba zachová původní intervaly aplikace. Vlastní interval změní pomalé periodické úlohy výstupu (od 30 sekund). Rychlé hodiny a obvyklé stránkování zůstávají beze změny. Vypnutí neodstraňuje poslední obsah. Živý náhled hlásí skutečný nejbližší termín prostřednictvím postMessage; bez běžícího výstupu nelze uvádět skutečný termín obnovy.

Výstupy čtou pouze veřejné časové preference školy z `/api/update-plans/{app}?profile=…`, ne soukromé konfigurace či přihlašovací údaje. Pro nově sdílené výstupy je potřeba zachovat `edu-profile` v odkazu. Bez něj se použije výběr profilu tohoto prohlížeče, případně původní profil služby.

## Údržba zdrojů

Plánovač Codex každý den v 9:00 Praha načte `/api/update-plans/maintenance`.
Spouští pouze splatné kontroly. Týdenní kontrola připadá na pondělí, měsíční na první den měsíce, čtvrtletní na 1. leden/duben/červenec/říjen, roční na 1. leden.

Více škol používá společný zdroj a rozhraní: společná kontrola se řídí nejbližším požadovaným termínem. Kontrola provedená pro jednu školu může ověřit zdroj také pro ostatní. Nové požadavky se převezmou při příštím denním běhu. Nastavení vypnuto vypíná požadavek dané školy, nikoli kontrolu požadovanou jinou školou.

Svátky mají konkrétní celoroční import. U ostatních aplikací údržba kontroluje dostupnost a formát jejich rozhraní, importní postupy a jejich kompatibilitu. Nenahrazuje průběžné načítání aktuálních hodnot počasí či odjezdů.

Po kontrole plánovač zaznamená výsledek a odkaz na přesný protokol do `update-status.json` a protokol do `update-records/YYYY-MM-DD-{app}.json`. Při neúspěchu neaktualizuje `lastSuccess`, nepřepisuje platná data a uvede chybu; termín tak zůstane splatný. Kontroly beze změn nevyvolávají zprávu uživateli.

Stav „plánováno“ znamená aktivní plán Codexu, nikoli samostatný trvale běžící serverový cron. Jeho běh závisí na dostupnosti plánovače Codex. Čas může být při výpadku odložen; modul musí uvádět skutečné poslední výsledky, nikoli tvrdit, že neprovedená kontrola proběhla.
