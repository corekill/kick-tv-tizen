# Installing Kick TV on a Samsung TV

## Recommended method: Apps2Samsung

### 1. Enable Developer Mode

1. Make sure the TV and computer or phone are connected to the same local network.
2. Open **Apps** on the Samsung TV.
3. Open the number input using the `123` button and enter `12345`.
4. Enable **Developer Mode**.
5. Enter the local IP address of the device that will run Apps2Samsung if the TV asks for it.
6. Restart the TV. Holding the Power button until the Samsung logo appears performs a full restart on most models.

Developer Mode must remain enabled whenever the app is installed or updated.

### 2. Install the WGT

1. Download [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung/releases) for Windows, macOS, Linux, or Android.
2. Download `KickTV.wgt` from the latest release of this repository.
3. Start Apps2Samsung and select the detected TV. If it is not detected, enter its IP address manually.
4. Select **Custom WGT File** and choose `KickTV.wgt`.
5. Click **Install** and complete Samsung login if requested.

Apps2Samsung generates a distributor certificate containing the TV's DUID, re-signs the WGT, and installs it. The release package does not contain private signing keys.

## Updating

Repeat the installation with the newer `KickTV.wgt`. Settings and viewing history normally remain stored because the application ID stays unchanged.

If Tizen reports a certificate mismatch, remove the existing Kick TV installation and install it again. This can happen when the new package is signed with a different author certificate.

## Troubleshooting

### TV is not detected

- Verify that Developer Mode is enabled.
- Verify the developer IP shown by the TV matches the device running Apps2Samsung.
- Fully restart the TV after changing Developer Mode.
- Confirm both devices are on the same LAN and that a VPN is not isolating the computer.

### Installation fails with an author certificate mismatch

Uninstall the existing Kick TV app from the TV, then install the new WGT again. Tizen does not allow one application ID to be overwritten by a package signed with a different author certificate.

### The application installs but the stream does not start

- Confirm the channel is currently live.
- Confirm the TV can access `kick.com`, `files.kick.com`, `7tv.io`, and `cdn.7tv.app`.
- Press Back to return home and retry the channel.

## Tizen Studio alternative

Advanced users can build the package with `./scripts/build.sh`, create a Samsung TV certificate profile containing their TV's DUID in Tizen Studio, sign the WGT, and install it through Device Manager. Apps2Samsung is recommended because it automates those steps.
