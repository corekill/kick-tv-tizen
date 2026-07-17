# Kick TV installation counter

This is the intentionally small receiver behind `corekill.cz/api/kicktv`.
It persistently stores one aggregate integer in SQLite and does not store
identifiers, addresses, headers, timestamps, or individual events.

## Public endpoints

- `POST /api/kicktv/install` increments the aggregate count.
- `GET /api/kicktv/count` returns `{"installs":123}`.
- `GET /api/kicktv/healthz` returns the receiver status.
- `GET /kicktv-admin/` displays the aggregate installation count. Nginx
  protects it with HTTP Basic Auth and a global request limit.

The Samsung application sends an empty request once. It saves the successful
result in the TV's local storage and does not send the request again unless the
application data is removed or the app is reinstalled.

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

The dashboard shows only the aggregate installation count and service uptime.
The public counter endpoint has a global request limit; its result remains an
approximation because a public open-source client cannot hold a secret.
