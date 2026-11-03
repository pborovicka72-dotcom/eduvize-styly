# Eduvize Fotogalerie

Administrace `config.html`, výstup `index.html`. Centrální styl a přihlášení Eduvize.

- OneDrive: samostatná složka Fotogalerie uvnitř školního úložiště Eduvize-Dokumenty, alba a nastavení v albums.json.
- Přístup k výstupu: odkaz s náhodným tokenem konkrétního alba a školním profilem; vybrané soubory jsou dostupné bez přihlášení. Odkaz sdílejte pouze s určenými příjemci.
- Originály z importované složky se nekopírují ani nemažou; nové soubory lze přidat opakováním importu.
- Nahrávání do 100 MB/soubor, nejvýše 1000 souborů/albu a 200 alb. JPEG, PNG, WebP, MP4, WebM; podkres MP3, M4A, WAV.
- Místní album funguje bez přihlášení, média v IndexedDB jsou dostupná pouze v daném prohlížeči. Odkaz na místní album není přenositelný.
- Webové soubory musí mít přímé veřejné HTTPS adresy a podporovaný formát.
- Skládání používá přirozené poměry stran a hledá kombinaci vodorovných a svislých dělení. Ořez je měřen jako ztracená plocha, maximálně 15 %. Při překročení limitu se použije celý snímek a rozostřené pozadí.
- Zvuk může vyžadovat první dotyk. Fotogalerie přehrává automaticky také v kiosku podle explicitního nastavení aplikace. Stránka čeká nejméně nastavený čas a na dokončení videí.

Backend `gallery.py` se připojuje do existujícího Dokumenty API, bez dalšího Microsoft oprávnění.
