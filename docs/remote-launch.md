# Open a Samsung TV channel remotely

This feature is implemented for the next Samsung and Lite builds. It is not part of the currently published 2.2.3 / 1.1.0 packages.

An already paired Samsung network remote, Home Assistant integration, or another compatible controller can launch Kick TV with a channel URL. This is a launch hook, not a phone web interface or QR pairing feature.

Send the usual Samsung remote command with the application's ID and a full Kick channel URL in `metaTag`:

```json
{
  "method": "ms.channel.emit",
  "params": {
    "event": "ed.apps.launch",
    "to": "host",
    "data": {
      "appId": "CrKckTV001.KickTV",
      "action_type": "DEEP_LINK",
      "metaTag": "https://kick.com/xqc"
    }
  }
}
```

Use `CrKckTVL01.KickTVLite` for the Lite application. The controller uses Samsung's remote endpoint on the TV, normally `wss://<tv-ip>:8002/api/v2/channels/samsung.remote.control`, with its normal TV approval/pairing mechanism. Kick TV does not open a new server port.

The app accepts full `http://` or `https://` channel URLs on `kick.com` or `www.kick.com`, including encoded launch values. Site pages such as `/settings`, other domains, and links to subpages or VODs are ignored. A valid link switches the active channel. If the app is in the background, it waits until it becomes visible before starting playback.

Pressing Home stops playback and disconnects chat. Returning reopens the same channel at the live edge. A newly requested channel takes priority over the previously suspended channel. Leaving playback with Back does not set up automatic resumption.

Thanks to @anyrobert for the original launch and visibility-change implementations in PR #7 and PR #9. Both original commits are retained in Git history.
