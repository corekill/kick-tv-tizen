#!/usr/bin/env python3
"""Kick TV OAuth broker. OAuth secrets/tokens never leave the service.

Pairing requires confirmation on the TV. Phone and TV use independent opaque
credentials. Access logs and upstream response bodies are deliberately omitted.
"""
import base64
import hashlib
import html
import json
import math
import os
import re
import secrets
import sqlite3
import struct
import threading
import time
import zlib
from datetime import datetime, timezone
from contextlib import contextmanager
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import Request, urlopen

from cryptography.fernet import Fernet
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
import qrcode

BASE = '/api/kicktv/auth'
ORIGIN = 'https://kicktv.corekill.cz'
REDIRECT = ORIGIN + BASE + '/callback'
# Request only the identity needed for the current account badge. Chat writing
# stays disabled in the TV app, so do not ask for chat:write pre-emptively.
SCOPES = 'user:read'
STATE_DIR = os.environ.get('KICKTV_AUTH_STATE', '/var/lib/kicktv-auth')
CLIENT_ID = os.environ.get('KICK_CLIENT_ID', '')
CLIENT_SECRET = os.environ.get('KICK_CLIENT_SECRET', '')
LOCK = threading.RLock()
TOKEN_LOCK = threading.Lock()
SUBSCRIPTION_LOCK = threading.Lock()
PAIRS = {}
MAX_PAIRS = 500
EVENTS_ENABLED = os.environ.get('KICKTV_EVENTS_ENABLED') == '1'
PHONE_CHAT_ENABLED = os.environ.get('KICKTV_PHONE_CHAT_ENABLED') == '1'
EVENT_NAMES = ('channel.followed', 'channel.subscription.new', 'channel.subscription.renewal', 'channel.subscription.gifts', 'channel.reward.redemption.updated', 'kicks.gifted')
EVENTS = {}
SEEN_EVENTS = {}
SUBSCRIPTIONS = {}
PUBLIC_KEY = None
PUBLIC_KEY_AT = 0
APP_TOKEN = None
APP_TOKEN_UNTIL = 0


def application_token():
    global APP_TOKEN, APP_TOKEN_UNTIL
    with TOKEN_LOCK:
        if not APP_TOKEN or APP_TOKEN_UNTIL < time.time() + 90:
            result = token_request({'grant_type': 'client_credentials'})
            APP_TOKEN, APP_TOKEN_UNTIL = result['access_token'], time.time() + int(result.get('expires_in', 3600))
        return APP_TOKEN


def event_key():
    global PUBLIC_KEY, PUBLIC_KEY_AT
    if PUBLIC_KEY is None or PUBLIC_KEY_AT < time.time() - 3600:
        result = upstream('https://api.kick.com/public/v1/public-key')
        data = result.get('data', result)
        key = data.get('public_key') if isinstance(data, dict) else data
        PUBLIC_KEY = serialization.load_pem_public_key(key.encode())
        PUBLIC_KEY_AT = time.time()
    return PUBLIC_KEY


def receive_event(headers, raw):
    global PUBLIC_KEY_AT
    message_id = headers.get('Kick-Event-Message-Id', '')
    timestamp = headers.get('Kick-Event-Message-Timestamp', '')
    event_type = headers.get('Kick-Event-Type', '')
    if len(message_id) > 128 or not message_id or len(timestamp) > 64:
        raise ValueError()
    event_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).timestamp()
    if abs(time.time() - event_time) > 300:
        raise PermissionError()
    signature = base64.b64decode(headers.get('Kick-Event-Signature', ''), validate=True)
    signed = (message_id + '.' + timestamp + '.').encode() + raw
    try:
        try:
            event_key().verify(signature, signed, padding.PKCS1v15(), hashes.SHA256())
        except InvalidSignature:
            if PUBLIC_KEY_AT > time.time() - 60:
                raise
            PUBLIC_KEY_AT = 0
            event_key().verify(signature, signed, padding.PKCS1v15(), hashes.SHA256())
    except Exception as error:
        raise PermissionError() from error
    if event_type not in EVENT_NAMES:
        return
    data = json.loads(raw)
    channel = int(data.get('broadcaster', {}).get('user_id', 0))
    # Do not retain arbitrary payloads, messages, email addresses or gift lists.
    person = data.get('subscriber') or data.get('sender') or data.get('user') or data.get('gifter') or {}
    name = str(person.get('username') or person.get('name') or 'Kick')[:80]
    reward = data.get('reward') or {}
    title = str(reward.get('title') or '')[:120]
    with LOCK:
        now = time.time()
        for key in list(SEEN_EVENTS):
            if SEEN_EVENTS[key] < now - 600:
                del SEEN_EVENTS[key]
        for key in list(EVENTS):
            EVENTS[key] = [entry for entry in EVENTS[key] if entry['received'] > now - 600]
            if not EVENTS[key]:
                del EVENTS[key]
        if message_id in SEEN_EVENTS:
            return
        if len(SEEN_EVENTS) >= 10000 or len(EVENTS) >= 500 and channel not in EVENTS:
            raise OverflowError()
        SEEN_EVENTS[message_id] = now
        EVENTS.setdefault(channel, []).append({'id': message_id, 'type': event_type, 'name': name, 'reward': title, 'received': now})
        EVENTS[channel] = EVENTS[channel][-50:]


def subscribe_events(channel):
    if not EVENTS_ENABLED or not channel:
        return
    with SUBSCRIPTION_LOCK:
        if channel in SUBSCRIPTIONS or len(SUBSCRIPTIONS) >= 100:
            return
        token = application_token()
        existing = upstream('https://api.kick.com/public/v1/events/subscriptions?' + urlencode({'broadcaster_user_id': channel}), token=token)
        names = {entry.get('event') for entry in existing.get('data', []) if entry.get('version') == 1}
        missing = [name for name in EVENT_NAMES if name not in names]
        if missing:
            result = upstream('https://api.kick.com/public/v1/events/subscriptions', token=token, data={'broadcaster_user_id': channel, 'method': 'webhook', 'events': [{'name': name, 'version': 1} for name in missing]})
            if any(entry.get('error') for entry in result.get('data', [])):
                raise ValueError('Event subscription rejected')
        SUBSCRIPTIONS[channel] = time.time()


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


@contextmanager
def database():
    db = sqlite3.connect(os.path.join(STATE_DIR, 'auth.db'), timeout=10)
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()


def init():
    global CIPHER
    os.makedirs(STATE_DIR, mode=0o700, exist_ok=True)
    keyfile = os.path.join(STATE_DIR, 'token.key')
    if not os.path.exists(keyfile):
        with open(keyfile, 'xb') as f:
            os.chmod(keyfile, 0o600)
            f.write(Fernet.generate_key())
    with open(keyfile, 'rb') as f:
        CIPHER = Fernet(f.read())
    with database() as db:
        db.execute('CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, name TEXT, tokens BLOB, expires REAL, channel INTEGER DEFAULT 0)')
        db.execute('CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, account TEXT, kind TEXT, expires REAL)')
        db.execute('CREATE TABLE IF NOT EXISTS diagnostics (id INTEGER PRIMARY KEY AUTOINCREMENT, received REAL, payload TEXT)')
        db.execute('CREATE INDEX IF NOT EXISTS diagnostics_time ON diagnostics(received)')
        db.execute('DELETE FROM sessions WHERE expires < ?', (time.time(),))
    os.chmod(os.path.join(STATE_DIR, 'auth.db'), 0o600)


def upstream(url, token=None, data=None, form=False):
    headers = {'Accept': 'application/json', 'User-Agent': 'KickTV-OAuth/1.0'}
    body = None
    if token:
        headers['Authorization'] = 'Bearer ' + token
    if data is not None:
        body = (urlencode(data) if form else json.dumps(data)).encode()
        headers['Content-Type'] = 'application/x-www-form-urlencoded' if form else 'application/json'
    with urlopen(Request(url, body, headers), timeout=12) as response:
        return json.loads(response.read(1048576))


def token_request(data):
    data.update(client_id=CLIENT_ID, client_secret=CLIENT_SECRET)
    return upstream('https://id.kick.com/oauth/token', data=data, form=True)


def save_account(account, name, tokens):
    if not tokens.get('access_token') or not tokens.get('refresh_token'):
        raise ValueError('Missing OAuth credentials')
    encrypted = CIPHER.encrypt(json.dumps(tokens).encode())
    with database() as db:
        db.execute('INSERT INTO accounts(id,name,tokens,expires) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,tokens=excluded.tokens,expires=excluded.expires',
                   (account, name, encrypted, time.time() + int(tokens.get('expires_in', 3600))))


def access_token(account):
    # Serialize refreshes: refresh credentials may rotate after each use.
    with LOCK:
        with database() as db:
            row = db.execute('SELECT * FROM accounts WHERE id=?', (account,)).fetchone()
        if not row:
            raise PermissionError()
        tokens = json.loads(CIPHER.decrypt(row['tokens']))
        if row['expires'] < time.time() + 90:
            fresh = token_request({'grant_type': 'refresh_token', 'refresh_token': tokens['refresh_token']})
            fresh.setdefault('refresh_token', tokens['refresh_token'])
            save_account(account, row['name'], fresh)
            tokens = fresh
        return tokens['access_token']


def new_session(account, kind):
    token = secrets.token_urlsafe(32)
    with database() as db:
        db.execute('INSERT INTO sessions VALUES(?,?,?,?)', (digest(token), account, kind, time.time() + (86400 if kind == 'phone' else 30 * 86400)))
    return token


def session(token, kind):
    if not token or len(token) > 128:
        raise PermissionError()
    with database() as db:
        row = db.execute('SELECT s.account,a.name,a.channel FROM sessions s JOIN accounts a ON a.id=s.account WHERE s.hash=? AND s.kind=? AND s.expires>?', (digest(token), kind, time.time())).fetchone()
    if not row:
        raise PermissionError()
    return dict(row)


def cleanup():
    now = time.time()
    for key in list(PAIRS):
        if PAIRS[key]['expires'] < now:
            del PAIRS[key]
    with database() as db:
        db.execute('DELETE FROM sessions WHERE expires<?', (now,))
        db.execute('DELETE FROM accounts WHERE id NOT IN (SELECT account FROM sessions) AND expires<?', (now - 600,))
        db.execute('DELETE FROM diagnostics WHERE received<?', (now - 90 * 86400,))


def maintenance():
    while True:
        time.sleep(60)
        try:
            with LOCK:
                cleanup()
        except sqlite3.Error:
            pass  # Retry next minute without dumping account/config data.


def store_diagnostics(data):
    allowed = {'schema', 'edition', 'version', 'session', 'model', 'firmware', 'ram_total', 'ram_available', 'js_heap_used', 'cpu_load', 'storage_total', 'storage_available'}
    if not isinstance(data, dict) or set(data) - allowed or data.get('schema') != 1 or data.get('edition') not in {'standard', 'private'}:
        raise ValueError()
    if not re.fullmatch('[0-9a-f]{16}', str(data.get('session', ''))):
        raise ValueError()
    clean = {key: data[key] for key in ('schema', 'edition', 'session')}
    for key in ('version', 'model', 'firmware'):
        value = data.get(key, '')
        if not isinstance(value, str) or len(value) > 48 or not re.fullmatch('[A-Za-z0-9_.: -]*', value):
            raise ValueError()
        clean[key] = value
    for key in ('ram_total', 'ram_available', 'js_heap_used', 'storage_total', 'storage_available', 'cpu_load'):
        value = data.get(key)
        if value is None:
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0 or value > (1 if key == 'cpu_load' else 2**50):
            raise ValueError()
        clean[key] = value
    now = time.time()
    with database() as db:
        db.execute('DELETE FROM diagnostics WHERE received<?', (now - 90 * 86400,))
        db.execute('INSERT INTO diagnostics(received,payload) VALUES(?,?)', (now, json.dumps(clean)))
        db.execute('DELETE FROM diagnostics WHERE id IN (SELECT id FROM diagnostics ORDER BY id DESC LIMIT -1 OFFSET 50000)')


def make_pair():
    with LOCK:
        cleanup()
        if len(PAIRS) >= MAX_PAIRS:
            raise OverflowError()
        pair_id, poll = secrets.token_urlsafe(24), secrets.token_urlsafe(32)
        PAIRS[pair_id] = {'poll': digest(poll), 'expires': time.time() + 300, 'account': None}
        url = ORIGIN + BASE + '/start?' + urlencode({'pair': pair_id})
        return {'pair': pair_id, 'poll': poll, 'url': url, 'expires_in': 300, 'qr_mime': 'image/png', 'qr': base64.b64encode(qr_png(url)).decode()}


def qr_png(url):
    """Plain 8-bit grayscale PNG for old Tizen decoders, no SVG dependency."""
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    scale, size = 6, len(matrix) * 6
    rows = []
    for row in matrix:
        pixels = b''.join((b'\x00' if cell else b'\xff') * scale for cell in row)
        rows.extend([b'\x00' + pixels] * scale)
    def chunk(kind, payload):
        return struct.pack('!I', len(payload)) + kind + payload + struct.pack('!I', zlib.crc32(kind + payload) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!IIBBBBB', size, size, 8, 0, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(b''.join(rows))) + chunk(b'IEND', b'')


def find_pair(pair_id, poll=None):
    cleanup()
    pair = PAIRS.get(pair_id)
    if not pair or (poll is not None and not secrets.compare_digest(pair['poll'], digest(poll))):
        raise PermissionError()
    return pair


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    server_version = 'KickTVAuth'
    sys_version = ''

    def log_message(self, *args):
        pass

    def reply(self, status, data=None, content_type='application/json', headers=None):
        body = data if isinstance(data, bytes) else (json.dumps(data) if content_type == 'application/json' else data or '').encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type + ('; charset=utf-8' if content_type == 'application/json' or content_type.startswith('text/') else ''))
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'")
        # TV packages use file:// or an opaque app origin; no cookie CORS.
        self.send_header('Access-Control-Allow-Origin', '*')
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def page(self, title, content, status=200, headers=None):
        self.reply(status, '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Kick TV</title><style>body{background:#09110b;color:#f5fff5;font:18px system-ui;max-width:580px;margin:60px auto;padding:24px}h1{color:#81ff42}button,input,textarea{box-sizing:border-box;width:100%;padding:16px;margin:12px 0;font:inherit;border-radius:12px}button{background:#81ff42;border:0}small{color:#b0bbb1}</style><h1>' + html.escape(title) + '</h1>' + content + '</html>', 'text/html', headers)

    def cookie(self, key):
        c = SimpleCookie()
        try:
            c.load(self.headers.get('Cookie', ''))
            return c[key].value if key in c else ''
        except Exception:
            return ''

    def bearer(self):
        value = self.headers.get('Authorization', '')
        return value[7:] if value.startswith('Bearer ') else ''

    def body(self):
        length = int(self.headers.get('Content-Length', '0'))
        if length < 1 or length > 4096:
            raise ValueError()
        data = self.rfile.read(length).decode()
        if self.headers.get('Content-Type', '').startswith('application/x-www-form-urlencoded'):
            return {key: value[0] for key, value in parse_qs(data).items()}
        return json.loads(data)

    def do_OPTIONS(self):
        self.reply(204, headers={'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '600'})

    def do_GET(self):
        self.dispatch('GET')

    def do_POST(self):
        self.dispatch('POST')

    def dispatch(self, method):
        try:
            self.route(method)
        except PermissionError:
            self.reply(401, {'error': 'session_expired'})
        except (ValueError, KeyError, TypeError):
            self.reply(400, {'error': 'invalid_request'})
        except OverflowError:
            self.reply(429, {'error': 'try_later'})
        except HTTPError as error:
            self.reply(502, {'error': 'kick_request_failed', 'upstream_status': error.code})
        except (URLError, TimeoutError):
            self.reply(503, {'error': 'kick_unavailable'})
        except Exception:
            self.reply(500, {'error': 'internal_error'})

    def route(self, method):
        url = urlsplit(self.path)
        path = url.path
        args = parse_qs(url.query)
        if method == 'GET' and path == BASE + '/health':
            self.reply(200, {'ok': bool(CLIENT_ID and CLIENT_SECRET), 'login': True, 'events_enabled': EVENTS_ENABLED, 'followed_supported': False, 'viewer_points_supported': False})
        elif method == 'POST' and path == BASE + '/pair':
            self.body()  # Deliberate POST; never create credentials via GET.
            self.reply(201, make_pair())
        elif method == 'POST' and path == BASE + '/telemetry':
            store_diagnostics(self.body())
            self.reply(200, {'ok': True})
        elif method == 'GET' and path == BASE + '/start':
            pair_id = args.get('pair', [''])[0]
            with LOCK:
                pair = find_pair(pair_id)
                if pair.get('oauth') or pair.get('account'):
                    raise ValueError()
                state, verifier, cookie = secrets.token_urlsafe(32), secrets.token_urlsafe(48), secrets.token_urlsafe(32)
                pair.update(oauth=state, verifier=verifier, cookie=digest(cookie))
            challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
            location = 'https://id.kick.com/oauth/authorize?' + urlencode(dict(client_id=CLIENT_ID, response_type='code', redirect_uri=REDIRECT, scope=SCOPES, state=state, code_challenge=challenge, code_challenge_method='S256'))
            self.reply(302, headers={'Location': location, 'Set-Cookie': '__Host-kicktv_oauth=' + cookie + '; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=300'})
        elif method == 'GET' and path == BASE + '/pair/qr':
            pair_id = args.get('pair', [''])[0]
            with LOCK:
                find_pair(pair_id)
            self.reply(200, qr_png(ORIGIN + BASE + '/start?' + urlencode({'pair': pair_id})), 'image/png')
        elif method == 'GET' and path == BASE + '/callback':
            state = args.get('state', [''])[0]
            cookie = self.cookie('__Host-kicktv_oauth')
            with LOCK:
                cleanup()
                matches = [p for p in PAIRS.values() if p.get('oauth') == state and secrets.compare_digest(p.get('cookie', ''), digest(cookie))]
                if len(matches) != 1 or not cookie:
                    raise PermissionError()
                pair = matches[0]
                verifier = pair.pop('verifier')
                pair.pop('oauth')  # One-shot callback, including denial/errors.
            if args.get('error'):
                self.page('Sign-in cancelled / Přihlášení zrušeno', '<p>Start again on your TV. / Zkus to znovu na TV.</p>')
                return
            tokens = token_request(dict(grant_type='authorization_code', code=args['code'][0], redirect_uri=REDIRECT, code_verifier=verifier))
            users = upstream('https://api.kick.com/public/v1/users', token=tokens['access_token'])['data']
            user = users[0]
            # Separate authorization per TV: logging out one TV must not revoke others.
            account = secrets.token_urlsafe(24)
            name = str(user.get('name') or user.get('username') or user['user_id'])[:80]
            save_account(account, name, tokens)
            with LOCK:
                pair.update(account=account, name=name, expires=time.time() + 180)
            content = '<p>' + html.escape(name) + '</p><p>Confirm this account on your TV. / Potvrď tento účet na televizi.</p>'
            headers = None
            if PHONE_CHAT_ENABLED:
                phone = new_session(account, 'phone')
                content += '<form action="' + BASE + '/phone"><button>Phone chat / Chat na telefonu</button></form>'
                headers = {'Set-Cookie': '__Host-kicktv_phone=' + phone + '; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400'}
            self.page('Kick TV sign-in / Přihlášení Kick TV', content, headers=headers)
        elif method == 'GET' and path == BASE + '/pair/status':
            with LOCK:
                p = find_pair(args.get('pair', [''])[0], self.bearer())
                self.reply(200, {'status': 'confirm' if p.get('account') else 'waiting', 'name': p.get('name', '')})
        elif method == 'POST' and path == BASE + '/pair/claim':
            data = self.body()
            with LOCK:
                pair_id = data.get('pair', '')
                p = find_pair(pair_id, self.bearer())
                if not p.get('account'):
                    raise ValueError()
                token = new_session(p['account'], 'tv')
                del PAIRS[pair_id]
            self.reply(200, {'session': token, 'name': p['name']})
        elif method == 'POST' and path == BASE + '/pair/cancel':
            data = self.body()
            with LOCK:
                p = find_pair(data.get('pair', ''), self.bearer())
                if p.get('account'):
                    with database() as db:
                        db.execute('DELETE FROM sessions WHERE account=?', (p['account'],))
                        db.execute('DELETE FROM accounts WHERE id=?', (p['account'],))
                del PAIRS[data['pair']]
            self.reply(200, {'ok': True})
        elif method == 'GET' and path == BASE + '/me':
            row = session(self.bearer(), 'tv')
            self.reply(200, {'name': row['name'], 'followed_supported': False, 'viewer_points_supported': False})
        elif method == 'POST' and path == BASE + '/logout':
            row = session(self.bearer(), 'tv')
            with database() as db:
                db.execute('DELETE FROM sessions WHERE account=?', (row['account'],))
                db.execute('DELETE FROM accounts WHERE id=?', (row['account'],))
            self.reply(200, {'ok': True})
        elif method == 'POST' and path == BASE + '/channel':
            row = session(self.bearer(), 'tv')
            value = int(self.body().get('channel', 0))
            if value < 0 or value > 2**53:
                raise ValueError()
            with database() as db:
                db.execute('UPDATE accounts SET channel=? WHERE id=?', (value, row['account']))
            self.reply(200, {'ok': True})
        elif method == 'GET' and path == BASE + '/events':
            row = session(self.bearer(), 'tv')
            if EVENTS_ENABLED:
                subscribe_events(row['channel'])
            with LOCK:
                entries = [entry for entry in EVENTS.get(row['channel'], []) if entry['received'] > time.time() - 600] if EVENTS_ENABLED else []
            self.reply(200, {'enabled': EVENTS_ENABLED, 'events': entries})
        elif method == 'POST' and path == BASE + '/events/webhook':
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 65536:
                raise ValueError()
            receive_event(self.headers, self.rfile.read(length))
            self.reply(200, {'ok': True})
        elif method == 'GET' and path == BASE + '/phone':
            if not PHONE_CHAT_ENABLED:
                self.reply(404, {'error': 'not_found'})
                return
            row = session(self.cookie('__Host-kicktv_phone'), 'phone')
            with database() as db:
                confirmed = db.execute('SELECT 1 FROM sessions WHERE account=? AND kind="tv" AND expires>?', (row['account'], time.time())).fetchone()
            if not confirmed:
                self.page('Confirm on TV / Potvrď na TV', '<p>Confirm the account on your TV first. / Nejdřív potvrď účet na TV.</p>')
                return
            # CSRF token is derived from an HttpOnly session, never URL parameters.
            csrf = digest(self.cookie('__Host-kicktv_phone') + ':chat')
            content = '<p>' + html.escape(row['name']) + '</p>'
            if row['channel']:
                content += '<p>Send to the channel currently open on TV. / Zpráva do kanálu otevřeného na TV.</p><form method="post" action="' + BASE + '/phone/chat"><input type="hidden" name="csrf" value="' + csrf + '"><input type="hidden" name="channel" value="' + str(row['channel']) + '"><textarea name="message" maxlength="500" required placeholder="Message / Zpráva"></textarea><button>Send / Odeslat</button></form>'
            else:
                content += '<p>Open a Kick channel on TV, then reload this page. / Otevři Kick kanál na TV a obnov stránku.</p>'
            self.page('Kick TV · chat', content)
        elif method == 'POST' and path == BASE + '/phone/chat':
            if not PHONE_CHAT_ENABLED:
                self.reply(404, {'error': 'not_found'})
                return
            row = session(self.cookie('__Host-kicktv_phone'), 'phone')
            data = self.body()
            if self.headers.get('Origin') != ORIGIN or not secrets.compare_digest(str(data.get('csrf', '')), digest(self.cookie('__Host-kicktv_phone') + ':chat')):
                raise PermissionError()
            with database() as db:
                confirmed = db.execute('SELECT 1 FROM sessions WHERE account=? AND kind="tv" AND expires>?', (row['account'], time.time())).fetchone()
            message = str(data.get('message', '')).strip()
            if not confirmed or not row['channel'] or int(data.get('channel', 0)) != row['channel'] or not 0 < len(message) <= 500 or len(message.encode()) > 2048:
                raise ValueError()
            upstream('https://api.kick.com/public/v1/chat', token=access_token(row['account']), data={'type': 'user', 'broadcaster_user_id': row['channel'], 'content': message})
            self.page('Sent / Odesláno', '<p>Your message was sent. / Zpráva byla odeslána.</p><form action="' + BASE + '/phone"><button>Back to chat / Zpět do chatu</button></form>')
        else:
            self.reply(404, {'error': 'not_found'})


if __name__ == '__main__':
    if not CLIENT_ID or not CLIENT_SECRET or os.environ.get('KICK_REDIRECT_URI') != REDIRECT:
        raise SystemExit('Missing or invalid auth configuration (values redacted).')
    init()
    threading.Thread(target=maintenance, daemon=True).start()
    server = ThreadingHTTPServer(('127.0.0.1', 8788), Handler)
    server.daemon_threads = True
    server.serve_forever()
