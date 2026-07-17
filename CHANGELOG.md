# Changelog

## 2.2.0 — Offline už není černá díra

Tahle verze hlavně zpříjemňuje návrat ke streamerům, které sleduješ. Historie je přehlednější, aplikace si pamatuje tvůj oblíbený režim chatu a offline kanál už neznamená prázdnou černou obrazovku.

### Česky

- Když streamer nevysílá, uvidíš jeho jméno a rovnou otevřený chat s Kick i 7TV emotikony. Aplikace každých 10 sekund zkontroluje stav a po zahájení vysílání stream sama spustí.
- Naposledy sledované kanály mají větší karty s profilovou fotkou a stavem LIVE/OFFLINE. U živých navíc uvidíš počet diváků a kategorii.
- Zvolený režim chatu se ukládá zvlášť pro každého streamera. Rozměry a pozice tří vlastních předvoleb zůstávají společné.
- Rozložení offline obrazovky, chatu a historie bylo upravené přímo podle reálného zobrazení na Tizenu 6.0.
- Kick TV je součástí komunitního katalogu Apps2Samsung, takže při instalaci stačí vybrat `KickTV` a kliknout na **Download & Install**.
- Přibylo anonymní počítadlo prvních spuštění. Odesílá jediný prázdný signál bez identifikátoru televize, sledovaných kanálů nebo chatu; podrobnosti jsou na [stránce o soukromí](docs/privacy.html).

### English

- Offline channels now show the streamer name and open chat with Kick and 7TV emotes instead of leaving a black screen. The app checks every 10 seconds and starts playback automatically when the channel goes LIVE.
- Recently watched channels use larger cards with profile pictures and LIVE/OFFLINE state. LIVE cards also show viewer count and category.
- The selected chat mode is remembered separately for each streamer, while the three custom preset layouts remain global.
- Offline, chat, and history layouts were tuned against a real Tizen 6.0 television.
- Kick TV is available in the Apps2Samsung community catalog: select `KickTV`, choose your TV, and click **Download & Install**.
- An anonymous first-launch counter sends one empty signal without a TV identifier, watched channels, or chat data. See the [privacy page](docs/privacy.html#english) for details.

## 2.1.1

- Fixed native Kick emotes so animated GIFs render and stay animated in chat.
- Kept 7TV emote parsing active around native Kick emotes in the same message.

## 2.1.0 — Stable

- Added global and channel-specific 7TV emotes with a compact local cache.
- Added three independently configurable in-picture chat presets.
- Added automatic Czech/English localization based on the TV language.
- Added native AVPlay quality profiles.
- Added LIVE/OFFLINE state to viewing history.
- Added streamer search and exact-channel fallback.
- Added hierarchical Back navigation and screensaver handling.
- Refreshed the launcher design and application icon.
- Removed the AVPlay object artifact from the center of the video.
