# Kick TV Lite changelog

## 1.0.3-lite

- Tizen 3 už neposílá AVPlay komplikovaný Amazon IVS master playlist. Aplikace nejdřív načte dostupné H.264 varianty a přehrávači předá přímo konkrétní media playlist.
- Automatická kvalita zvolí nejvyšší dostupnou kompatibilní H.264 variantu; ruční nabídka ukazuje pouze kvality skutečně dostupné pro daný stream.
- Diagnostika nově uvádí master i přímo přehrávaný playlist, kód modelu a firmware televize.
- Přidané oprávnění ProductInfo, aby se na reálných televizích zobrazil model místo hodnoty `unknown`.

## 1.0.2-lite

- Opravené spouštění videa na starém AVPlay: aplikace po `prepareAsync` počká na skutečný stav `READY` a v případě potřeby použije synchronní přípravu.
- Volání nastavení obrazu jsou na Tizenu 3 volitelná, takže nepodporovaná operace nezastaví celé přehrávání.
- Šipka dolů během přehrávání otevře lokální diagnostiku s modelem TV, stavem AVPlay a přesným krokem, na kterém přehrávání selhalo.
- Diagnostika nezobrazuje token streamu ani neposílá data mimo televizi.

## 1.0.1-lite

- Přidaná lehká nabídka kvality obrazu na šipku nahoru.
- Volby Automaticky, 1080p, 720p, 480p a 360p.
- Automatický návrat k neomezenému adaptivnímu streamu, pokud starý AVPlay vybraný profil odmítne.

## 1.0.0-lite

- První experimentální verze pro Samsung TV s Tizenem 3.0.
- Nativní přehrávání přes AVPlay bez vynuceného profilu kvality.
- Vyhledávání podle části jména a historie se stavem LIVE/OFFLINE.
- Offline obrazovka s automatickou kontrolou streamu každých 10 sekund.
- Odlehčený živý chat s barevnými jmény; emotikony se zobrazují textově.
- Samostatné ID aplikace, takže Lite nepřepisuje běžnou Kick TV.
