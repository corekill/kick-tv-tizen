# Kick TV account broker (unreleased client feature)

## Configuration

Root-owned `/etc/kicktv-auth/kick.env`, mode 0600, outside web/Git:

```dotenv
KICK_CLIENT_ID=<registered application ID>
KICK_CLIENT_SECRET=<registered application secret>
KICK_REDIRECT_URI=https://kicktv.corekill.cz/api/kicktv/auth/callback
```

Install the requirements in `/opt/kicktv-auth/venv`; install `server.py` in
`/opt/kicktv-auth/` and the systemd unit. Include the supplied Nginx limits and
location snippet in the `kicktv.corekill.cz` virtual host. The service binds to localhost
8788; the existing counter on 8787 is unchanged. TLS must terminate at the public
proxy. Do not log Authorization/Cookie headers, request bodies or callback query
strings at any proxy layer.

Kick developer settings:

- Redirect: `https://kicktv.corekill.cz/api/kicktv/auth/callback`
- Webhook: `https://kicktv.corekill.cz/api/kicktv/auth/events/webhook`
- Runtime OAuth requests only `user:read`, which is needed to display the signed-in account name. Chat writing is disabled and does not request `chat:write`.
- Registered reward/event/KICK permissions are reserved for future features;
  registration does not require requesting all permissions on every sign-in.

## Data and security

- QR pairing expires in 5 minutes and requires TV-side account confirmation.
- PKCE S256, random state, browser-bound secure cookie, one-shot callback.
- TV sessions expire after 30 days. Phone chat has a server-side feature flag and
  is disabled by default (`KICKTV_PHONE_CHAT_ENABLED=0`); no phone session or
  chat form is created while it is off.
- OAuth tokens use Fernet authenticated encryption at rest with a locally generated
  key in systemd's private state directory. Only hashed opaque sessions are stored.
- No Kick password, shared client secret or OAuth token is returned to the TV.
- Refreshes are serialized; tokens are refreshed before expiry.
- Logout deletes the server authorization and both phone/TV sessions for that TV;
  other independently authorized TVs are not logged out.
- The client requires one explicit opt-in for server connectivity including
  usage statistics/technical diagnostics. No opt-in means no account sign-in
  and no communication with this service. Anonymous Kick playback still works.
  Legacy separate preferences require fresh consent, not silent migration.
  Standard/private Tizen metrics use an allowlisted `/telemetry` endpoint, with
  90-day/50,000-record limits and a random per-run session. CPU/RAM/internal
  storage are collected only when the TV exposes those APIs. Lite retains its
  existing receiver and more detailed playback diagnostics.
- Phone sends require CSRF, same-origin requests, TV confirmation and the channel
  still matching the submitted form. Message contents are relayed, not stored.
- Webhooks require current RSA key verification, a recent timestamp and duplicate
  suppression. Only allowlisted event labels/names are kept in memory for up to
  10 minutes (50 per channel), not full payloads or ordinary chat messages.
- HTTP per-request logs are disabled in this service and its Nginx location.
  Public reverse-proxy logging must also respect this policy.
- Global Nginx request limits and bounded pending pairing/event queues are enabled.
- Event subscriptions are capped at 100 distinct channels per service run for the
  initial beta. Remote subscription lifecycle/idle cleanup needs hardening before
  broad public rollout; do not release this as production-ready.

## Endpoints

The `/api/kicktv/auth/` prefix includes `health`, `pair`, `start`, `callback`,
`pair/status`, `pair/claim`, `pair/cancel`, `me`, `logout`, `channel`, `events`,
`events/webhook`, `telemetry`, `phone` and `phone/chat`. The last two return 404
while phone chat is disabled. No endpoint returns shared credentials or offers a
general-purpose proxy to Kick.

## Tests and rollout

```bash
python -m pip install -r server/auth/requirements.txt
python -m unittest server/auth/test_server.py
```

Tests cover account confirmation, expiration, wrong credentials, cookie binding,
encrypted storage, refresh, logout, phone CSRF and changed-channel rejection,
webhook signature tampering and replay suppression. Mocked tests are not proof
of real Kick consent/phone posting or video playback on old TVs. Require a live
account/TV test before release. Android remains a separate follow-up.
