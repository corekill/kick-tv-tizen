# Samsung TV LAN test

This one-shot test checks whether a Samsung TV Web App can accept a TCP
connection from a phone on the same network. It does not read or modify app
settings, and is not included in the regular Kick TV build.

1. From an environment with **Samsung's Emscripten SDK** (not stock Emscripten),
   run `emcc -Os -s ENVIRONMENT_MAY_BE_TIZEN -s SOCKET_HOST_BINDINGS=0 -s ENVIRONMENT=worker -s SINGLE_FILE=1 socket-check.c -o runtime.js`.
2. Package `runtime.js`, `index.html`, `check-worker.js` and `config.xml`
   together in a WGT and sign for the test TV. The test page displays runtime
   messages and lets you restart the worker with the remote.
3. Launch on the TV and, within 30 seconds, visit
   `http://<TV-IP>:18765/` from a phone on the same local network.
   Receiving `TV listener` confirms that the TV, not the build machine, served
   the response. The listener closes after one connection or on timeout.

Verified on the Samsung QE55QN85AATXXH: a direct LAN request from a Mac to the
TV returned HTTP 200 with the expected body. The TV ran the server; the Mac
was only the HTTP client.

See [Samsung's socket build instructions](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/tizen-sockets-extension/building-curl-applications-using-cli-tools.html).
## Integrated phone pairing

Kick TV → Settings → Manage on phone starts a worker and listens on the TV's
private IPv4 address at port 18765. The worker serves the bundled phone page.
The QR code is generated on the TV and carries a random, five-minute bearer
token in the URL fragment. Closing Settings or leaving the app stops pairing.
Use only on a trusted local network: the connection is HTTP, not encrypted.
Do not forward the port or share the QR. There are no Kick account credentials
in the protocol. The list lives in TV localStorage; search uses the same
KickStats endpoint as the TV's existing search.

The C transport is `phone-server.c`. Rebuild the checked-in
`kick-tv/phone-runtime.js` using `bash scripts/build-phone-runtime.sh` with
Samsung's compiler. Use `node scripts/test-phone.cjs` for the phone routing
checks. The QR generator is qrcode-generator 2.0.4 (Kazuhiko Arase, MIT).
