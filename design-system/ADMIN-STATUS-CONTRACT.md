# Společný stav administrace – podklad obnovy

Zachovaný technický kontrakt z původních auditů z 9.–10. 11. 2026.
Implementace CSS je připravena jako výslovně zapínaná komponenta
`admin-status.css`; v obnovovacím kandidátovi není dosud zapojen odpovídající
stavový controller. Tento dokument nepotvrzuje nasazení ani funkční přijetí.

- Používat `body.ev-admin.edu-admin-status-context` a stavové uzly
  `.edu-admin__status[role="status"]`; výstupní stránky se nestylují.
- Rodina z administrace, 14 px, váha 400, line-height 1.5. Profilový kontext má
  váhu 600, nikoli samostatný stavový automat.
- Pod tlačítky ponechat pořadí Profil → stav nastavení → výsledek poslední akce.
  Celá oblast má společný odstup 20 px; související prvky 12 px. Tři výsledkové
  řádky na sebe navazují bez sčítání vlastních marginů a gapů.
- Načítání nesmí předstírat uložený stav. Nová úprava vymaže minulý výsledek;
  chyba zůstává do nápravy nebo dalšího pokusu. Novější úpravy po PUT zůstávají
  neuložené. Úspěch konfigurace nezakrývá selhání aktualizace veřejného výstupu.
- Místní koncepty a automatická obnova jsou zakázané. Tento kontrakt
  nepovoluje změny oprávnění, zápis do profilu, publikování ani nasazení.

Pro zapojení je nutné přenést odpovídající finite recipe na skutečnou
obnovovanou základnu. Původní status recipe očekává jiný SHA-256
`configuration-profiles.js`; celé historické kopie se nepřebírají.
