# Changelog

## 2.3.0 — procházení, jazykový filtr a Kick účet

- Přibylo procházení živých streamů a kategorií; u živých kanálů i streamů v kategorii lze přepínat jazyk. Volba se uloží v televizi. Díky @janrydzewski za inspiraci pro procházení.
- Přihlášení Kick účtu přes QR kód: přihlášení probíhá přímo na Kicku, následně se účet potvrdí na televizi. Jméno účtu se zobrazí v aplikaci a lze otevřít Kick nebo se odhlásit.
- Heslo se aplikaci neposílá. OAuth tokeny zůstávají na serveru a jsou šifrované; televize obdrží pouze odvolatelnou relaci. Připojení k serveru a diagnostika jsou vypnuté, dokud s nimi uživatel nesouhlasí.
- Přihlášení zatím nepřináší seznam Following ani zůstatek diváckých bodů. Veřejné Kick API tyto informace momentálně neposkytuje; psaní do chatu zůstává vypnuté. Aplikace může zobrazit dostupné události kanálu.
- Opravené ovládání klávesnice a směrový pohyb v rozhraní. Klávesnice se otevře až po stisku OK; seznamy se načítají postupně, aby TV zůstala svižná.
- Po odchodu z aplikace přes Home se zastaví AVPlay, odpojí chat a ukončí kontrola offline kanálu. Po návratu se znovu otevře stejný kanál na živém vysílání.
- Aplikace umí otevřít kanál předaný v Samsung launch requestu; odkazy se ověřují podle domény a cesty a duplicitní události stream neotevřou znovu.
- Přihlašovací a instalační požadavky používají proxovanou adresu `kicktv.corekill.cz`.
- Po odchodu z aplikace přes Home se zastaví AVPlay, odpojí chat a ukončí kontrola offline kanálu. Po návratu se znovu otevře stejný kanál na živém vysílání.
- Aplikace umí otevřít kanál předaný v Samsung launch requestu (`appcontrol` / `metaTag`). Platné odkazy se kontrolují podle domény a cesty.
- Nový odkaz při návratu z pozadí dostane přednost před původním kanálem; opakované události neotevírají stream víckrát.
- Díky @anyrobert za původní implementace v PR #7 a #9. Jeho commity i autorství jsou zachované; společná obsluha je rozšířená také pro Lite.

## 2.2.3 — chat znovu online

- Chat si při připojení a obnovení spojení načítá aktuální veřejný Pusher klíč a cluster přímo od Kicku. Při nedostupnosti použije uložené údaje nebo záložní klíč.
- Poděkování @anyrobert za nalezení příčiny nefunkčního chatu a nového připojovacího endpointu v PR #8.
- Dlouhé zprávy si zachovávají výšku a na starších Tizenech se nepřekrývají.

## 2.2.2 — oprava ruční volby kvality

- Ruční kvalita nyní používá přímo H.264 HLS variantu, kterou Kick skutečně nabízí pro daný stream.
- Přepnutí na 1080p, 720p, 480p, 360p nebo 160p už neposílá AVPlay neplatný pevný rozsah bitrate, který způsoboval `PLAYER_ERROR_CONNECTION_FAILED`.
- Nabídka zobrazuje jen kvality dostupné pro právě sledovaný stream. Automatika dál ponechá výběr varianty na AVPlay.

## 2.2.1 — testovací oprava pro starší Tizen

- Opravené jednotky datového toku v profilech kvality Samsung AVPlay.
- Pokud starší Tizen odmítne připravit stream s omezením kvality, aplikace jej automaticky zkusí znovu v kompatibilním režimu bez omezení bitrate.
- Chyby AVPlay nyní zobrazují čitelnější název a zprávu.

## 2.2.0 — Offline už není černá díra

Tahle verze hlavně zpříjemňuje návrat ke streamerům, které sleduješ. Historie je přehlednější, aplikace si pamatuje tvůj oblíbený režim chatu a offline kanál už neznamená prázdnou černou obrazovku.

### Česky

- Když streamer nevysílá, uvidíš jeho jméno a rovnou otevřený chat s Kick i 7TV emotikony. Aplikace každých 10 sekund zkontroluje stav a po zahájení vysílání stream sama spustí.
- Naposledy sledované kanály mají větší karty s profilovou fotkou a stavem LIVE/OFFLINE. U živých navíc uvidíš počet diváků a kategorii.
- Zvolený režim chatu se ukládá zvlášť pro každého streamera. Rozměry a pozice tří vlastních předvoleb zůstávají společné.
- Rozložení offline obrazovky, chatu a historie bylo upravené přímo podle reálného zobrazení na Tizenu 6.0.
- Kick TV je součástí komunitního katalogu Apps2Samsung, takže při instalaci stačí vybrat `KickTV` a kliknout na **Download & Install**.

### English

- Offline channels now show the streamer name and open chat with Kick and 7TV emotes instead of leaving a black screen. The app checks every 10 seconds and starts playback automatically when the channel goes LIVE.
- Recently watched channels use larger cards with profile pictures and LIVE/OFFLINE state. LIVE cards also show viewer count and category.
- The selected chat mode is remembered separately for each streamer, while the three custom preset layouts remain global.
- Offline, chat, and history layouts were tuned against a real Tizen 6.0 television.
- Kick TV is available in the Apps2Samsung community catalog: select `KickTV`, choose your TV, and click **Download & Install**.

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
