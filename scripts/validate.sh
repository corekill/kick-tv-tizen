#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/kick-tv"

for command in node xmllint zip unzip; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command" >&2
    exit 1
  fi
done

node --check "$APP/app.js"
xmllint --noout "$APP/config.xml"

for file in config.xml index.html style.css app.js kick-icon.png kick-icon-117.png; do
  if [[ ! -s "$APP/$file" ]]; then
    echo "Missing or empty application file: $file" >&2
    exit 1
  fi
done

open_braces="$(tr -cd '{' < "$APP/style.css" | wc -c | tr -d ' ')"
close_braces="$(tr -cd '}' < "$APP/style.css" | wc -c | tr -d ' ')"
if [[ "$open_braces" != "$close_braces" ]]; then
  echo "CSS brace mismatch: $open_braces opening, $close_braces closing" >&2
  exit 1
fi

echo "Validation passed."
