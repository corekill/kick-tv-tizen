# Kick TV for Android TV

Native Android TV / Google TV companion to Kick TV for Samsung Tizen. This build is currently a beta intended for sideload testing on TVs and streaming sticks.

[Download the current beta APK](https://github.com/corekill/kick-tv-tizen/releases/download/android-v0.1.0-beta/KickTV-Android-TV-0.1.0-beta.apk)

## Included

- D-pad-first home screen and search by partial channel name
- native Media3/ExoPlayer HLS playback
- automatic, 1080p, 720p, 480p, and 360p quality limits
- recently watched channels with LIVE/OFFLINE state, audience, and category
- read-only live chat with animated Kick and global/channel 7TV emotes
- full-height and compact in-picture chat modes remembered per streamer
- useful offline screen with chat and a 10-second live check
- Czech UI when the TV language is Czech, English otherwise
- hierarchical Back behavior and screensaver suppression during playback

## Build

Requirements: JDK 17 and Android SDK 35.

```bash
cd android-tv
./gradlew :app:assembleDebug
```

The installable debug-signed beta APK is written to `app/build/outputs/apk/debug/app-debug.apk`.

## Install over ADB

Enable Developer options and network debugging on the TV, then run:

```bash
adb connect TV_IP_ADDRESS
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

This Android beta is separate from the Samsung Tizen packages and does not change their build or release process.
