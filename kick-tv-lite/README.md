# Kick TV Lite

Samostatná odlehčená varianta pro Samsung TV s Tizenem 3.0. Neinstaluje ani nepřepisuje běžnou aplikaci Kick TV, protože používá vlastní widget a application ID.

Lite zachovává vyhledávání, historii se stavem LIVE/OFFLINE, automatickou kontrolu offline kanálu, Samsung AVPlay, volbu kvality a živý read-only chat. Kvůli kompatibilitě starého AVPlay načte dostupné H.264 varianty z Kick playlistu a přehrávači předá přímo zvolenou kvalitu. Kvůli výkonu starších televizí Lite nepoužívá obrázkové emotikony, 7TV ani nastavitelné chatové overlaye.

Při přehrávání otevře **trojí rychlý stisk šipky dolů** lokální diagnostiku. Na jedné obrazovce ukáže model TV, stav AVPlay a poslední kroky přehrávání; při hlášení chyby stačí tuto obrazovku vyfotit. Podepsané části URL jsou ve výpisu skryté.

Lite je ověřená na skutečné Samsung UE49MU7075 s Tizenem 3.0. Při prvním spuštění pošle prázdný signál do samostatného souhrnného počítadla Lite instalací. Volitelně může uživatel výslovně povolit výkonovou diagnostiku: model a verzi TV, CPU, dostupnou RAM a úložiště, odezvu aplikace a technický stav přehrávače. Nikdy neposílá sledovaný kanál, historii, chat ani streamovací adresy a lze ji kdykoli vypnout na hlavní obrazovce.

Sestavení:

```bash
./scripts/build-lite.sh
```

Výstup je `dist/KickTV-Lite.wgt` a před instalací musí být podepsaný pro cílovou televizi.
