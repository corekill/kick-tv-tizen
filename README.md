# Kick TV for Samsung Tizen

An unofficial, remote-friendly Kick client for Samsung Smart TVs. Kick TV uses Samsung AVPlay for native HLS playback and provides search, playback quality selection, LIVE/OFFLINE history, Kick chat, 7TV emotes, and configurable in-picture chat layouts.

![Kick TV icon](kick-tv/kick-icon-117.png)

## Features

- Native Samsung AVPlay video with selectable quality profiles.
- Streamer search with exact-channel fallback.
- Recently watched channels with LIVE/OFFLINE status.
- Read-only Kick live chat with animated native Kick emotes plus global and channel-specific 7TV emotes.
- Full chat panel plus three independently configurable overlay presets.
- Czech UI for Czech TV language settings; English for every other language.
- Remote-first controls and hierarchical Back behavior.
- Screensaver suppression while playback is active.

## Easy installation

Samsung requires every sideloaded Tizen package to be signed for the target TV. The downloadable WGT is therefore intentionally device-neutral and the recommended installer signs it for your television.

1. Enable **Developer Mode** on the TV and restart it.
2. Download and open [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung/releases).
3. Download `KickTV.wgt` from this repository's latest GitHub release.
4. In Apps2Samsung select **Custom WGT File**, choose `KickTV.wgt`, select the TV, and install.

Apps2Samsung handles TV discovery, Samsung login when required, certificate generation, package signing, and installation. See [INSTALL.md](INSTALL.md) for the complete walkthrough and troubleshooting.

The long-term goal is inclusion in the [Tizen Community Packages](https://github.com/Apps2Samsung/tizen-community-packages) catalog, which removes the custom-file step.

## Remote controls

| Key | Home | Playback |
| --- | --- | --- |
| Arrows | Move focus | `↑` quality, `↓` chat layout |
| OK | Open selected item | Cycle: off → full → preset 1 → preset 2 → preset 3 |
| Back | Clear search, then exit | Close menu/editor, then return home |
| Play/Pause | — | Control playback |

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
- A network connection is required for Kick streams, chat, search, and 7TV assets.

## Disclaimer

This is an unofficial community project and is not affiliated with or endorsed by Kick, 7TV, Samsung, or Tizen. Kick and 7TV may change their public web endpoints at any time. Their names, logos, and trademarks belong to their respective owners.

## License

Application source code is available under the [MIT License](LICENSE). Third-party names, trademarks, and brand assets are not granted under that license.
