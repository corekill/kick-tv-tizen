# Kick TV for Samsung Tizen

Minimal remote-friendly launcher for the official Kick embedded player. Search by a partial streamer name, select a result, or enter a channel slug/full `kick.com/channel` URL and press **Sledovat**.

- Arrow keys move through controls.
- OK during playback cycles through hidden chat, the full sidebar, and three independently configurable overlay presets.
- Up opens the playback quality menu. Changing quality restarts AVPlay with the selected adaptive bitrate range.
- Down opens a live chat-layout editor for position, size, and font size. Settings are saved locally.
- Back is hierarchical: it first closes the quality or chat-layout overlay, then returns from playback to the launcher, and only exits from the launcher.
- Recent channels are kept locally on the TV and refreshed with LIVE/OFFLINE status.
- Search uses a Tizen-compatible request with a timeout and always offers an exact-name fallback.

Playback uses Samsung AVPlay with the live HLS URL returned by Kick. The read-only live chat connects directly to the channel's public Kick chat stream and keeps collecting messages while hidden. The UI shows explicit API, buffering, and playback errors instead of a blank panel.

The chat loads global and channel-specific 7TV emotes, caches a compact emote map locally, and falls back to plain text when an image cannot load. The interface automatically uses Czech for Czech TV language settings and English for every other language.

The app disables the Samsung screensaver while playback is active and restores it when returning home.
