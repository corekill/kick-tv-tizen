# Kick TV pro Samsung Tizen a Android TV

Kick TV jsem vytvořil pro každého, kdo chce sledovat své oblíbené streamery pohodlně z gauče přímo na velké obrazovce — bez AirPlaye, telefonu nebo notebooku. Stačí vyhledat kanál, spustit stream a všechno ovládat běžným ovladačem od televize.

![Ikona Kick TV](kick-tv/kick-icon-117.png)

[Web projektu](https://corekill.github.io/kick-tv-tizen/) · [Nainstalovat na Samsung TV](INSTALL.md) · [Android TV beta](https://github.com/corekill/kick-tv-tizen/releases/tag/android-v0.1.2-beta) · [Nejnovější Samsung vydání](https://github.com/corekill/kick-tv-tizen/releases/latest)

[![Dostupné v katalogu Apps2Samsung](https://img.shields.io/badge/Instalace-Apps2Samsung%20Community-53FC18?style=for-the-badge&logo=samsung&logoColor=white&labelColor=11151A)](https://github.com/Apps2Samsung/Apps2Samsung/releases)

## Android TV a Google TV — beta

Pro televize a multimediální krabičky s Android TV nebo Google TV je k dispozici samostatná nativní beta. Umí přehrávání přes Media3/ExoPlayer, hledání, volbu kvality, historii se stavem LIVE/OFFLINE, chat s animovanými Kick a 7TV emotikony i stejné nastavitelné předvolby chatu v obraze.

[Stáhnout instalační APK](https://github.com/corekill/kick-tv-tizen/releases/download/android-v0.1.2-beta/KickTV-Android-TV-0.1.2-beta.apk)

APK je určené k ruční instalaci (sideload). První betu jsem ověřil v Android TV 14 emulátoru na 1920×1080; testy na skutečných televizích a stickách teprve sbírám. Podrobnosti k sestavení a instalaci přes ADB jsou v [android-tv/README.md](android-tv/README.md).

![Kick TV beta na Android TV](docs/images/android-home-beta.png)

## Co aplikace umí

- Stream přehrává přes nativní Samsung AVPlay a kvalitu obrazu si můžeš kdykoliv změnit.
- Nemusíš si pamatovat přesné jméno streamera. Stačí napsat jeho část a aplikace ho zkusí najít.
- Naposledy sledované kanály zůstávají v historii. Karty ukážou profilovou fotku a u živých také počet diváků a kategorii.
- Když streamer nevysílá, místo černé obrazovky uvidíš jeho jméno a rovnou otevřený chat. Aplikace každých 10 sekund zkontroluje, jestli nezačal vysílat.
- Streamy můžeš procházet živě nebo podle kategorie a vybrat jazyk vysílání. Nastavení jazyka se uloží v televizi.
- Chat umí běžné i animované Kick emotikony a k tomu globální i kanálové emotikony z 7TV.
- Chat si můžeš otevřít celý nebo ho nechat přímo v obraze. K dispozici jsou tři předvolby, u kterých si nastavíš velikost i pozici.
- Aplikace si pro každého streamera pamatuje naposledy zvolený režim chatu. Rozměry a pozice tří předvoleb přitom zůstávají společné.
- Pokud máš televizi nastavenou česky, bude česky i aplikace. Pro ostatní jazyky se automaticky přepne do angličtiny.
- Tlačítko Zpět se chová tak, jak člověk čeká: nejdřív zavře otevřenou nabídku a až potom tě vrátí na výběr streamera.
- Během sledování aplikace vypne spořič obrazovky, aby tě zbytečně nerušil.

## Přihlášení ke Kicku

Přihlášení je dobrovolné a vyžaduje souhlas s připojením k serveru. Na televizi se zobrazí QR kód; telefon otevře přihlašovací stránku Kicku a heslo zadáváš přímo tam. Aplikace ani její server heslo nedostanou. Po potvrzení účtu na televizi se zobrazí tvoje jméno, můžeš otevřít Kick nebo účet odhlásit. OAuth tokeny se ukládají šifrovaně na serveru a televize dostane pouze odvolatelnou relaci.

Současné oficiální Kick API zatím neposkytuje seznam kanálů, které sleduješ, ani zůstatek diváckých bodů. Přihlášení proto Following zatím nepřidá a psaní do chatu je vypnuté; dostupné události kanálu se mohou zobrazit v chatu. Přehled možností popisuje [oficiální API Kicku](https://docs.kick.com/) a [požadavek na endpoint Following](https://github.com/KickEngineering/KickDevDocs/issues/134).

## Jak Kick TV vypadá

<p align="center">
  <img src="docs/images/home-2.2.png" alt="Domovská obrazovka aplikace Kick TV pro Samsung Tizen" width="49%">
  <img src="docs/images/history-2.2.png" alt="Historie streamerů s profilovými obrázky, stavem LIVE a OFFLINE, počtem diváků a kategorií" width="49%">
</p>
<p align="center">
  <img src="docs/images/offline-2.2.png" alt="Offline streamer se jménem, automatickou kontrolou stavu a otevřeným chatem" width="49%">
  <img src="docs/images/chat-2.2.png" alt="Celý živý chat s podporou Kick a 7TV emotikonů" width="49%">
</p>
<p align="center">
  <img src="docs/images/quality-2.2.png" alt="Výběr kvality přehrávání v Kick TV" width="49%">
  <img src="docs/images/chat-editor-2.2.png" alt="Editor velikosti a pozice chatu přímo v obraze" width="49%">
</p>

## Jak aplikaci dostat do televize

Kick TV je přímo v komunitním katalogu Apps2Samsung, takže už nemusíš ručně stahovat ani vybírat WGT soubor. Apps2Samsung stáhne aktuální verzi, podepíše ji pro tvoji televizi a rovnou ji nainstaluje.

1. Na televizi zapni **Vývojářský režim** a potom ji restartuj.
2. Stáhni a spusť [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung/releases).
3. V nabídce **Release** vyber **KickTV**.
4. Vyber svoji televizi a klikni na **Download & Install**.

To je celé. Kdyby se něco zaseklo nebo se KickTV v nabídce nezobrazila, podrobnější postup, záložní ruční instalaci a nejčastější řešení najdeš v [INSTALL.md](INSTALL.md).

## Co dělají tlačítka při sledování

| Tlačítko | Co udělá |
| --- | --- |
| Šipka `↑` | Nabídka kvality obrazu |
| Šipka `↓` | Nastavení rozložení chatu |
| OK | Přepíná: vypnuto → celý chat → předvolba 1 → předvolba 2 → předvolba 3 |
| Zpět | Zavře otevřenou nabídku nebo editor, potom se vrátí na výběr streamera |
| Play/Pause | Pozastaví nebo obnoví přehrávání |

## Chceš si aplikaci sestavit sám?

Stačí mít `bash`, `node`, `xmllint`, `zip` a `unzip` a spustit:

```bash
./scripts/validate.sh
./scripts/build.sh
```

Hotový balíček najdeš v `dist/KickTV.wgt`. Ani vlastní build ale neobejde podepisování pro konkrétní televizi — s tím ti může znovu pomoct Apps2Samsung.

## Na čem to funguje

- Aplikace je určená pro Samsung TV s Tizenem 4.0 a novějším.
- Opravdu jsem ji testoval na Samsung TV s Tizenem 6.0, není to jen projekt odzkoušený v emulátoru.
- Bez internetu to samozřejmě nepůjde — aplikace ho potřebuje pro stream, chat, vyhledávání i emotikony.

### Experimentální Lite verze pro Tizen 3

Pro televizory z roku 2017 s Tizenem 3.0 je k dispozici samostatný balíček **Kick TV Lite**. Zachovává přehrávání, volbu kvality, hledání, historii, LIVE/OFFLINE stav a jednoduchý živý chat. Kvůli výkonu starších TV nemá 7TV, obrázkové emotikony ani nastavitelné overlaye. Používá vlastní ID, takže nepřepíše běžnou Kick TV. Lite je ověřená na skutečné Samsung UE49MU7075 s Tizenem 3.0, ale kvůli malému počtu otestovaných modelů zůstává experimentální.

[Stáhnout Kick TV Lite](https://github.com/corekill/kick-tv-tizen/releases/tag/v1.1.0-lite)

## Chceš podpořit další vývoj?

Kick TV dělám ve volném čase a dávám ji k dispozici zdarma. Jestli ti zpříjemnila sledování z gauče a chceš podpořit další opravy a nové funkce, můžeš mi [koupit kafe na Ko-fi](https://ko-fi.com/corekill). Není to žádná podmínka — radost mi udělá i to, když aplikaci používáš a napíšeš, když něco zlobí.

[![Podpoř mě na Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/corekill)

## Ještě je dobré vědět

Kick TV je můj neoficiální komunitní projekt. Nejsem nijak spojený s Kickem, 7TV, Samsungem ani Tizenem a žádná z těchto společností aplikaci nepodporuje. Kick nebo 7TV navíc mohou svoje veřejné služby změnit, takže se občas může něco rozbít. Když se to stane, klidně [založ issue](https://github.com/corekill/kick-tv-tizen/issues/new) a zkusím se na to podívat.

Pokud povolíš připojení k serveru, aplikace při prvním úspěšném spuštění odešle jeden anonymní signál do souhrnného počítadla. Lite má vlastní oddělené počítadlo. Stejný souhlas zahrnuje technickou diagnostiku; aplikace nikdy neposílá sledované kanály, historii, obsah chatu ani streamovací adresy. [Podrobnosti o soukromí](https://corekill.github.io/kick-tv-tizen/privacy.html)

## Licence

Zdrojový kód je dostupný pod [licencí MIT](LICENSE), takže se v něm můžeš vrtat, upravovat ho a postavit si vlastní verzi. Názvy, loga a ochranné známky třetích stran ale samozřejmě zůstávají jejich vlastníkům.

---

# English

I built Kick TV for anyone who wants to watch their favorite streamers comfortably from the couch on a big screen — without AirPlay, a phone, or a laptop. Just find a channel, start the stream, and control everything with your TV remote. Native builds are now available for Samsung Tizen and, as a beta, Android TV / Google TV.

[Project website](https://corekill.github.io/kick-tv-tizen/) · [Install on Samsung TV](INSTALL.md) · [Android TV beta](https://github.com/corekill/kick-tv-tizen/releases/tag/android-v0.1.2-beta) · [Latest Samsung release](https://github.com/corekill/kick-tv-tizen/releases/latest)

## Android TV and Google TV — beta

A separate native beta is available for Android TV and Google TV televisions and streaming devices. It includes Media3/ExoPlayer playback, search, selectable quality, LIVE/OFFLINE history, animated Kick and 7TV chat emotes, and the same configurable in-picture chat presets.

[Download the installable APK](https://github.com/corekill/kick-tv-tizen/releases/download/android-v0.1.2-beta/KickTV-Android-TV-0.1.2-beta.apk)

The APK is intended for sideloading. This first beta has been verified in an Android TV 14 emulator at 1920×1080; real-device feedback is welcome. Build and ADB installation instructions are available in [android-tv/README.md](android-tv/README.md).

## Features

- Native Samsung AVPlay video with selectable quality profiles.
- Streamer search by partial name with an exact-channel fallback.
- Recently watched channels with profile pictures plus viewer counts and categories for LIVE channels.
- A dedicated offline screen with the channel name, automatically opened chat, and a ten-second LIVE check that starts playback when the streamer comes online.
- Read-only live chat with animated native Kick emotes plus global and channel-specific 7TV emotes.
- Full chat panel plus three independently configurable in-picture presets.
- The last selected chat mode is remembered per streamer, while preset sizes and positions remain global.
- Czech UI for Czech TV language settings; English for every other language.
- Remote-first controls and hierarchical Back behavior.
- Screensaver suppression while playback is active.

## Easy installation

Kick TV is now included directly in the Apps2Samsung community catalog. You no longer need to download or select the WGT manually—Apps2Samsung fetches the current release, signs it for your TV, and installs it.

1. Enable **Developer Mode** on the TV and restart it.
2. Download and open [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung/releases).
3. Select **KickTV** from the **Release** dropdown.
4. Select your TV and click **Download & Install**.

That is it. Apps2Samsung handles the download, TV discovery, Samsung login when required, certificate generation, package signing, and installation. See [INSTALL.md](INSTALL.md) for troubleshooting and the manual fallback.

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

## Kick sign-in

Sign-in is optional and requires consent to server connectivity. The TV displays a QR code; the phone opens Kick's own sign-in page, where you enter your password directly with Kick. Neither the app nor its server receives the password. After you confirm the account on the TV, the app displays your name and lets you open Kick or sign out. OAuth tokens are encrypted at rest on the server; the TV receives only a revocable session.

The current official Kick API does not expose a followed-channels list or viewer-points balance, so sign-in cannot populate Following yet. Chat writing remains disabled; available channel events may appear in chat. See the [official Kick API docs](https://docs.kick.com/) and the [request for a Following endpoint](https://github.com/KickEngineering/KickDevDocs/issues/134).

### Experimental Lite build for Tizen 3

A separate **Kick TV Lite** package is available for 2017 Samsung TVs running Tizen 3.0. It keeps playback, quality selection, search, history, LIVE/OFFLINE status, and lightweight read-only live chat. To reduce load on older hardware, it omits 7TV, image emotes, thumbnails, and configurable overlays. It has its own application ID and does not replace the standard app. It has been verified on a real Samsung UE49MU7075 running Tizen 3.0, but remains experimental because only a small number of models have been tested.

[Download Kick TV Lite](https://github.com/corekill/kick-tv-tizen/releases/tag/v1.1.0-lite)

## Support development

Kick TV is a free project I build in my spare time. If it made watching streams from the couch a little more comfortable and you would like to support future fixes and features, you can [buy me a coffee on Ko-fi](https://ko-fi.com/corekill). There is absolutely no obligation — using the app and reporting anything that breaks also helps a lot.

[![Support me on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/corekill)

## Disclaimer

This is an unofficial community project and is not affiliated with or endorsed by Kick, 7TV, Samsung, or Tizen. Kick and 7TV may change their public web endpoints at any time. Their names, logos, and trademarks belong to their respective owners.

If you enable server connectivity, the app sends one anonymous signal after its first successful launch to increment an aggregate installation counter. Lite has a separate counter. The same consent includes technical diagnostics; the app never sends watched channels, history, chat contents, or stream URLs. [Privacy details](https://corekill.github.io/kick-tv-tizen/privacy.html#english)

## License

Application source code is available under the [MIT License](LICENSE). Third-party names, trademarks, and brand assets are not granted under that license.
