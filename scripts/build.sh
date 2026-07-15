#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/kick-tv"
DIST="${1:-$ROOT/dist}"
PACKAGE="$DIST/KickTV.wgt"

"$ROOT/scripts/validate.sh"
mkdir -p "$DIST"
rm -f "$PACKAGE"

(
  cd "$APP"
  zip -X -q "$PACKAGE" \
    config.xml \
    index.html \
    style.css \
    app.js \
    kick-icon.png \
    kick-icon-117.png
)

unzip -t "$PACKAGE" >/dev/null
version="$(xmllint --xpath 'string(/*[local-name()="widget"]/@version)' "$APP/config.xml")"
if command -v shasum >/dev/null 2>&1; then
  checksum="$(shasum -a 256 "$PACKAGE" | awk '{print $1}')"
else
  checksum="$(sha256sum "$PACKAGE" | awk '{print $1}')"
fi

echo "Built Kick TV $version"
echo "Package: $PACKAGE"
echo "SHA-256: $checksum"
echo "This WGT is device-neutral; sign it for the target TV during installation."
