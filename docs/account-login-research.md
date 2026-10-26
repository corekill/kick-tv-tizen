# Account login: implementation and remaining constraints

The Tizen account button is in the upper-right corner. Selecting it shows QR
pairing; the TV explicitly confirms the returned account name. The broker stores
encrypted OAuth credentials; TV packages receive only opaque, revocable sessions.
Phone chat uses a separate Secure/HttpOnly cookie and CSRF protection.

Kick's documented OAuth 2.1 flow uses PKCE **and** a client secret issued for a
registered application. A TV can generate the PKCE verifier/challenge and state;
it cannot invent a valid registered client secret. Do not distribute a shared
secret in WGT/APK packages or static GitHub Pages assets.

The user subsequently approved the server-backed flow and registered the Kick
application. Configuration stays at `/etc/kicktv-auth/kick.env` on the server.
Do not copy secrets into this repository, packages, screenshots or logs.
Static GitHub hosting is not a credential backend. No password collection or
cookie import is implemented. A TV session stored in app storage can still be
extracted by someone controlling the TV; local obfuscation is not protection.

The official API does not currently provide a verified followed-channel list
or viewer point balance/redemption flow. Those features remain unimplemented;
do not replace them with local favourites or claim a complete account experience.

Channel subscriptions, follows, reward events and KICK gifts can be relayed via
signature-verified webhooks. This is distinct from spending viewer points.
The event relay is bounded to 100 channels per service run and keeps a short
in-memory queue. Real account sign-in, phone sending and live webhook delivery
still require an end-to-end test with the user. Android account integration is
not included in this Tizen implementation.

Discovery currently uses anonymous website endpoints, which may change or fail;
it is separate from the existing stream/chat implementation and has bounded
requests, error feedback and a manual retry.

Sources checked 2026-10-26:

- https://github.com/KickEngineering/KickDevDocs/blob/main/getting-started/generating-tokens-oauth2-flow.md
- https://api.kick.com/swagger/index.html
- https://github.com/janrydzewski/kick-tv-2.0/blob/main/app/app.js
