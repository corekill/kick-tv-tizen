# Kick TV pro Samsung Tizen

Neoficiální aplikace pro pohodlné sledování Kick streamů na televizích Samsung Smart TV. Kick TV používá nativní přehrávač Samsung AVPlay a nabízí vyhledávání streamerů, volbu kvality obrazu, historii se stavem LIVE/OFFLINE, živý chat, animované Kick a 7TV emotikony i nastavitelné rozložení chatu přímo v obraze.

![Ikona Kick TV](kick-tv/kick-icon-117.png)

## Funkce

- Nativní přehrávání přes Samsung AVPlay s volitelnou kvalitou obrazu.
- Vyhledávání streamerů i podle části názvu a přímé otevření přesného názvu kanálu.
- Historie naposledy sledovaných kanálů se stavem LIVE/OFFLINE.
- Živý chat pro čtení s animovanými Kick emotikony a globálními i kanálovými 7TV emotikony.
- Celý panel chatu a tři samostatně nastavitelné předvolby chatu v obraze.
- Automatická čeština při českém jazyku TV, angličtina pro ostatní jazyky.
- Ovládání navržené pro televizní ovladač a správné chování tlačítka Zpět.
- Vypnutí spořiče obrazovky během přehrávání.

## Snadná instalace

Samsung vyžaduje, aby byl každý ručně instalovaný Tizen balíček podepsaný pro konkrétní televizi. WGT v GitHub release je proto záměrně bez zařízení a doporučený instalátor jej podepíše přímo pro vaši TV.

1. Zapněte na televizi **Vývojářský režim** a TV restartujte.
2. Stáhněte a spusťte [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung/releases).
3. Stáhněte `KickTV.wgt` z [nejnovějšího vydání Kick TV](https://github.com/corekill/kick-tv-tizen/releases/latest).
4. V Apps2Samsung vyberte **Custom WGT File**, zvolte `KickTV.wgt`, označte televizi a spusťte instalaci.

Apps2Samsung zajistí nalezení televize, případné přihlášení k Samsung účtu, vytvoření certifikátu, podepsání balíčku i instalaci. Podrobný postup a řešení problémů najdete v [INSTALL.md](INSTALL.md).

Dlouhodobým cílem je zařazení do katalogu [Tizen Community Packages](https://github.com/Apps2Samsung/tizen-community-packages), které odstraní i krok s ručním výběrem WGT souboru.

## Ovládání při přehrávání

| Tlačítko | Funkce |
| --- | --- |
| Šipka `↑` | Nabídka kvality obrazu |
| Šipka `↓` | Nastavení rozložení chatu |
| OK | Přepíná: vypnuto → celý chat → předvolba 1 → předvolba 2 → předvolba 3 |
| Zpět | Zavře nabídku/editor, potom se vrátí na výběr streamera |
| Play/Pause | Pozastaví nebo obnoví přehrávání |

## Vlastní sestavení

Požadavky: `bash`, `node`, `xmllint`, `zip` a `unzip`.

```bash
./scripts/validate.sh
./scripts/build.sh
```

Balíček bez vazby na konkrétní zařízení vznikne v `dist/KickTV.wgt`. Před instalací jej stále musíte podepsat pro cílovou televizi; Apps2Samsung tento krok provede automaticky.

## Kompatibilita

- Cílová platforma: Samsung Tizen TV 4.0 a novější.
- Otestováno na skutečné Samsung TV s Tizen 6.0.
- Pro streamy, chat, vyhledávání a emotikony je nutné internetové připojení.

## Upozornění

Jde o neoficiální komunitní projekt, který není spojený se společnostmi Kick, 7TV, Samsung ani Tizen a nemá jejich podporu. Kick a 7TV mohou své veřejné webové endpointy kdykoliv změnit. Všechny názvy, loga a ochranné známky patří příslušným vlastníkům.

## Licence

Zdrojový kód aplikace je dostupný pod [licencí MIT](LICENSE). Licence neuděluje žádná práva k názvům, ochranným známkám ani grafickým podkladům třetích stran.

---

# English

An unofficial app for comfortable Kick streaming on Samsung Smart TVs. Kick TV uses Samsung's native AVPlay player and provides streamer search, selectable video quality, LIVE/OFFLINE history, live chat, animated Kick and 7TV emotes, and configurable in-picture chat layouts.

## Features

- Native Samsung AVPlay video with selectable quality profiles.
- Streamer search by partial name with an exact-channel fallback.
- Recently watched channels with LIVE/OFFLINE status.
- Read-only live chat with animated native Kick emotes plus global and channel-specific 7TV emotes.
- Full chat panel plus three independently configurable in-picture presets.
- Czech UI for Czech TV language settings; English for every other language.
- Remote-first controls and hierarchical Back behavior.
- Screensaver suppression while playback is active.

## Easy installation

Samsung requires every sideloaded Tizen package to be signed for the target TV. The WGT in the GitHub release is therefore intentionally device-neutral, and the recommended installer signs it specifically for your television.

1. Enable **Developer Mode** on the TV and restart it.
2. Download and open [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung/releases).
3. Download `KickTV.wgt` from the [latest Kick TV release](https://github.com/corekill/kick-tv-tizen/releases/latest).
4. In Apps2Samsung select **Custom WGT File**, choose `KickTV.wgt`, select the TV, and install.

Apps2Samsung handles TV discovery, Samsung login when required, certificate generation, package signing, and installation. See [INSTALL.md](INSTALL.md) for the complete walkthrough and troubleshooting.

The long-term goal is inclusion in the [Tizen Community Packages](https://github.com/Apps2Samsung/tizen-community-packages) catalog, which removes the custom-file step.

## Playback controls

| Key | Action |
| --- | --- |
| Arrow `↑` | Open video quality selection |
| Arrow `↓` | Open chat layout settings |
| OK | Cycle: off → full chat → preset 1 → preset 2 → preset 3 |
| Back | Close a menu/editor, then return to streamer selection |
| Play/Pause | Pause or resume playback |

## Build locally

Requirements: `bash`, `node`, `xmllint`, `zip`, and `unzip`.

```bash
./scripts/validate.sh
./scripts/build.sh
```

The device-neutral package is written to `dist/KickTV.wgt`. It still needs to be signed for the target TV; Apps2Samsung does this automatically during installation.

## Compatibility

- Target: Samsung Tizen TV 4.0 and newer.
- Tested on a real Samsung TV running Tizen 6.0.
- A network connection is required for streams, chat, search, and emote assets.

## Disclaimer

This is an unofficial community project and is not affiliated with or endorsed by Kick, 7TV, Samsung, or Tizen. Kick and 7TV may change their public web endpoints at any time. Their names, logos, and trademarks belong to their respective owners.

## License

Application source code is available under the [MIT License](LICENSE). Third-party names, trademarks, and brand assets are not granted under that license.
