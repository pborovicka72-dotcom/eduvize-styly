# Vlastnictví administrace a galerie

Společný administrační backend a zdroje účtu, profilů a rozcestníku vlastní
`pborovicka72-dotcom/eduvize-admin`. Backend zde má pouze kompatibilní vstupní bod.
Fotogalerii včetně API a přehrávače vlastní `pborovicka72-dotcom/eduvize-fotogalerie`.

Staré statické cesty zůstávají kvůli vydaným odkazům. Jsou kompatibilními artefakty,
nikoli místem dalšího nezávislého vývoje. Obnovují se skriptem
`eduvize-admin/tools/publish_compatibility.py`. Barvy, komponenty a NSP geometrie
zůstávají vlastnictvím tohoto repozitáře.

## Připravovaný přechod od distribučních kopií

Veřejné cesty nadále vznikají ze stejných kanonických vlastníků, ale před
odstraněním 39 zdrojových kopií musí být zaveden kontrolovaný assembler
`eduvize-admin/deployment/static_publication.py`. Jeho manifest uchovává
zdrojové SHA a SHA-256 každého vytvořeného souboru; chybějící kanonický vstup
nesmí být nahrazen historickou kopií.

Přímé publikování surového checkoutu přes Pages je v tomto návrhu vyřazené.
Návrh nemění již hostovaný Pages artefakt ani veřejné URL v aplikacích.
Aktuální vydávání zůstává společné: testovací sestava a následné vlastníkem
schválené vydání přes `eduvize-production.yml`, ze stejných ověřených artefaktů.
Pro případnou další aktualizaci historického Pages hostingu by bylo nutné
nejprve dodat ověřený kanonický release artefakt; neobnovovat raw checkout upload.

Kontrola samotného veřejného repozitáře ověřuje vlastní rejstřík škol a
společné klientské kontrakty. Testy karty školy, sdíleného načítání a parity
celého veřejného balíčku se spouštějí v privátní kanonické integrační CI
administrace, až po materializaci zdrojů. Přístup do privátní galerie patří
výhradně do tohoto privátního CI, nikdy do veřejného Pages workflow.

V této přípravě všech 39 kopií zůstává zachováno. Odstranit je lze teprve po
instalaci trusted assembleru, úspěšném integračním běhu s přesnými kandidátními
SHA a ověření nového testovacího vydání. Postup a návrat popisuje
`eduvize-admin/deployment/STATIC-PUBLICATION.md`.

Ověření zahrnuje nově sloučené branding změny styles#8/admin#11; při každém
dalším posunu vlastníků je nutné aktualizovat piny a znovu sestavit kandidáta.
