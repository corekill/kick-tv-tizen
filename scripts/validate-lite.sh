#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/kick-tv-lite"

for command in node xmllint zip unzip; do
  command -v "$command" >/dev/null 2>&1 || { echo "Missing required command: $command" >&2; exit 1; }
done

node --check "$APP/app.js"
xmllint --noout "$APP/config.xml"

for file in config.xml index.html style.css app.js kick-icon-117.png; do
  [[ -s "$APP/$file" ]] || { echo "Missing or empty Lite application file: $file" >&2; exit 1; }
done

grep -q 'required_version="3.0"' "$APP/config.xml"
if grep -Eq '(^|[;{}[:space:]])(const|let|class|async)[[:space:]]+[A-Za-z_$]|=>|`' "$APP/app.js"; then
  echo "Lite JavaScript contains syntax newer than ES5" >&2
  exit 1
fi
if grep -Eq 'display:[[:space:]]*grid|grid-template|(^|[;{])[[:space:]]*gap:' "$APP/style.css"; then
  echo "Lite CSS contains layout features unavailable in Tizen 3 Chromium" >&2
  exit 1
fi

echo "Lite validation passed."
