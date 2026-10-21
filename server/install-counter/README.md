# Kick TV installation counter

This is the privacy-minded receiver behind `corekill.cz/api/kicktv`. It stores
separate aggregate install totals for the standard and Lite editions. It can
also accept strictly opt-in, allowlisted Lite performance diagnostics.

## Public endpoints

- `POST /api/kicktv/install` increments the aggregate count.
- `POST /api/kicktv-lite/install` increments the separate Lite count.
- `POST /api/kicktv-lite/telemetry` accepts consented technical Lite metrics.
- `GET /api/kicktv/count` returns both aggregate totals.
- `GET /api/kicktv/healthz` returns the receiver status.
- `GET /kicktv-admin/` displays the aggregate installation count. Nginx
  protects it with HTTP Basic Auth and a global request limit.

Each Samsung application sends an empty install request once. Lite diagnostics
are disabled by default and require explicit in-app consent. Their strict
allowlist excludes channel names, history, chat, stream URLs and stable device
identifiers. A random session ID lasts for one app run and records expire after
90 days.

## Deployment

1. Copy `server.py` to `/opt/kicktv-counter/server.py`.
2. Copy `kicktv-counter.service` to `/etc/systemd/system/` and enable it.
3. Copy `nginx-limits.conf` to `/etc/nginx/conf.d/kicktv-limits.conf`.
4. Create `/etc/nginx/.kicktv-dashboard.htpasswd` with a strong password.
5. Add the locations from `nginx-location.conf` to the TLS virtual host for
   `corekill.cz`, test the configuration, and reload Nginx.

The service binds only to `127.0.0.1`. Its systemd unit uses a dynamic user and
a private state directory. Both the service and the supplied Nginx locations
disable per-request logging. A public counter cannot be perfectly resistant to
artificial requests, so the result should be treated as an approximate number
of installations.

The protected dashboard shows both aggregate counts and summaries of consented
Lite performance samples. It never displays session IDs. Public endpoints have
global request limits; installation totals remain approximate because an
open-source client cannot hold a secret.
