# Kick TV Lite

Samostatná odlehčená varianta pro Samsung TV s Tizenem 3.0. Neinstaluje ani nepřepisuje běžnou aplikaci Kick TV, protože používá vlastní widget a application ID.

Lite zachovává vyhledávání, historii se stavem LIVE/OFFLINE, automatickou kontrolu offline kanálu, Samsung AVPlay, volbu kvality a živý read-only chat. Pokud starší AVPlay vybranou kvalitu odmítne, přehrávání se automaticky zopakuje bez omezení bitrate. Kvůli výkonu starších televizí Lite nepoužívá obrázkové emotikony, 7TV ani nastavitelné chatové overlaye.

Při přehrávání otevře **šipka dolů** diagnostiku. Na jedné obrazovce ukáže model TV, stav AVPlay a poslední kroky přehrávání; při hlášení chyby stačí tuto obrazovku vyfotit. Diagnostika zůstává pouze v televizi a URL streamu zobrazuje bez přístupového tokenu.

Sestavení:

```bash
./scripts/build-lite.sh
```

Výstup je `dist/KickTV-Lite.wgt` a před instalací musí být podepsaný pro cílovou televizi.
