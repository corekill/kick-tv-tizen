#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Must be Samsung's 1.39.4.7 fork, not stock Emscripten.
"${SAMSUNG_EMCC:-emcc}" -Os -s ENVIRONMENT_MAY_BE_TIZEN -s SOCKET_HOST_BINDINGS=0 \
    -s ENVIRONMENT=worker -s SINGLE_FILE=1 -s 'EXTRA_EXPORTED_RUNTIME_METHODS=["ccall"]' \
    "$ROOT/experiments/tv-lan/phone-server.c" -o "$ROOT/kick-tv/phone-runtime.js"
