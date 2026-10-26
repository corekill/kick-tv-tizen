import importlib.util
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
import base64
from datetime import datetime, timezone
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler, urlopen
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('auth_server', Path(__file__).with_name('server.py'))
auth = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auth)


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


class AuthTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        auth.STATE_DIR = self.temp.name
        auth.PHONE_CHAT_ENABLED = True
        auth.PAIRS.clear()
        auth.EVENTS.clear()
        auth.SEEN_EVENTS.clear()
        auth.init()
        self.server = auth.ThreadingHTTPServer(('127.0.0.1', 0), auth.Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = 'http://127.0.0.1:' + str(self.server.server_port) + auth.BASE

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def call(self, method, path, data=None, token=None, headers=None):
        headers = dict(headers or {})
        if token:
            headers['Authorization'] = 'Bearer ' + token
        if data is not None:
            headers['Content-Type'] = 'application/json'
        request = Request(self.base + path, None if data is None else json.dumps(data).encode(), headers, method=method)
        try:
            response = build_opener(NoRedirect()).open(request)
        except HTTPError as error:
            response = error
        body = response.read().decode()
        result = response.code, response.headers, json.loads(body) if body.startswith('{') else body
        response.close()
        return result

    def pair(self):
        code, headers, pair = self.call('POST', '/pair', {})
        self.assertEqual(code, 201)
        self.assertEqual(headers['Cache-Control'], 'no-store')
        self.assertNotIn('access_token', json.dumps(pair))
        self.assertTrue(pair['qr'])
        self.assertEqual(pair['qr_mime'], 'image/png')
        png = base64.b64decode(pair['qr'])
        self.assertTrue(png.startswith(b'\x89PNG\r\n\x1a\n'))
        self.assertEqual(png[24:26], b'\x08\x00')  # 8-bit grayscale, not SVG.
        with urlopen(self.base + '/pair/qr?pair=' + pair['pair']) as image:
            self.assertEqual(image.headers['Content-Type'], 'image/png')
            self.assertEqual(image.headers['Cache-Control'], 'no-store')
            self.assertTrue(image.read().startswith(b'\x89PNG\r\n\x1a\n'))
        return pair

    def authorize(self):
        pair = self.pair()
        code, headers, _ = self.call('GET', '/start?pair=' + pair['pair'])
        self.assertEqual(code, 302)
        query = parse_qs(urlsplit(headers['Location']).query)
        self.assertEqual(query['code_challenge_method'], ['S256'])
        self.assertNotIn('client_secret', query)
        cookie = headers['Set-Cookie'].split(';')[0]
        tokens = {'access_token': 'fake-access', 'refresh_token': 'fake-refresh', 'expires_in': 3600}
        with patch.object(auth, 'token_request', return_value=tokens), patch.object(auth, 'upstream', return_value={'data': [{'user_id': 12, 'name': 'Test <User>'}]}):
            code, headers, body = self.call('GET', '/callback?state=' + query['state'][0] + '&code=example', headers={'Cookie': cookie})
        self.assertEqual(code, 200)
        self.assertIn('Test &lt;User&gt;', body)
        self.assertIn('HttpOnly', headers['Set-Cookie'])
        return pair, headers['Set-Cookie'].split(';')[0]

    def test_confirmation_and_logout(self):
        pair, phone_cookie = self.authorize()
        code, _, status = self.call('GET', '/pair/status?pair=' + pair['pair'], token=pair['poll'])
        self.assertEqual(status['status'], 'confirm')
        self.assertNotIn('session', status)
        code, _, body = self.call('GET', '/phone', headers={'Cookie': phone_cookie})
        self.assertIn('Confirm on TV', body)
        code, _, claim = self.call('POST', '/pair/claim', {'pair': pair['pair']}, pair['poll'])
        self.assertEqual(code, 200)
        tv = claim['session']
        self.assertEqual(self.call('POST', '/pair/claim', {'pair': pair['pair']}, pair['poll'])[0], 401)
        self.assertEqual(self.call('GET', '/me', token=tv)[2]['name'], 'Test <User>')
        self.assertEqual(self.call('GET', '/me', token=pair['poll'])[0], 401)
        self.assertEqual(self.call('POST', '/channel', {'channel': 123}, tv)[0], 200)
        code, _, phone = self.call('GET', '/phone', headers={'Cookie': phone_cookie})
        self.assertIn('textarea', phone)
        self.assertNotIn('fake-access', phone)
        self.assertEqual(self.call('POST', '/phone/chat', {'message': 'hello'}, headers={'Cookie': phone_cookie})[0], 401)
        phone_token = phone_cookie.split('=', 1)[1]
        csrf = auth.digest(phone_token + ':chat')
        with patch.object(auth, 'upstream', return_value={'data': {}}) as sent:
            result = self.call('POST', '/phone/chat', {'csrf': csrf, 'message': 'hello', 'channel': 123}, headers={'Cookie': phone_cookie, 'Origin': auth.ORIGIN})
            self.assertEqual(result[0], 200)
            self.assertEqual(sent.call_args.kwargs['data']['broadcaster_user_id'], 123)
        self.assertEqual(self.call('POST', '/phone/chat', {'csrf': csrf, 'message': 'wrong room', 'channel': 124}, headers={'Cookie': phone_cookie, 'Origin': auth.ORIGIN})[0], 400)
        with auth.database() as db:
            encrypted = bytes(db.execute('SELECT tokens FROM accounts').fetchone()[0])
        self.assertNotIn(b'fake-access', encrypted)
        self.assertEqual(self.call('POST', '/logout', {}, tv)[0], 200)
        self.assertEqual(self.call('GET', '/me', token=tv)[0], 401)
        self.assertEqual(self.call('GET', '/phone', headers={'Cookie': phone_cookie})[0], 401)

    def test_wrong_bearer_expiry_and_no_callback_cookie(self):
        p = self.pair()
        self.assertEqual(self.call('GET', '/pair/status?pair=' + p['pair'], token='wrong')[0], 401)
        code, headers, _ = self.call('GET', '/start?pair=' + p['pair'])
        state = parse_qs(urlsplit(headers['Location']).query)['state'][0]
        self.assertEqual(self.call('GET', '/callback?state=' + state + '&code=stolen')[0], 401)
        auth.PAIRS[p['pair']]['expires'] = 0
        self.assertEqual(self.call('GET', '/pair/status?pair=' + p['pair'], token=p['poll'])[0], 401)

    def test_cancel_invalidates_phone_session(self):
        p, phone_cookie = self.authorize()
        self.assertEqual(self.call('POST', '/pair/cancel', {'pair': p['pair']}, p['poll'])[0], 200)
        self.assertEqual(self.call('GET', '/phone', headers={'Cookie': phone_cookie})[0], 401)

    def test_phone_chat_is_hidden_when_disabled(self):
        auth.PHONE_CHAT_ENABLED = False
        self.assertEqual(self.call('GET', '/phone')[0], 404)
        self.assertEqual(self.call('POST', '/phone/chat', {'message': 'hello'})[0], 404)

    def test_cap_and_refresh(self):
        with patch.object(auth, 'MAX_PAIRS', 1):
            self.pair()
            self.assertEqual(self.call('POST', '/pair', {})[0], 429)
        auth.save_account('one', 'User', {'access_token': 'old', 'refresh_token': 'refresh', 'expires_in': 0})
        with patch.object(auth, 'token_request', return_value={'access_token': 'new', 'refresh_token': 'rotated', 'expires_in': 3600}) as refresh:
            self.assertEqual(auth.access_token('one'), 'new')
            self.assertEqual(auth.access_token('one'), 'new')
            self.assertEqual(refresh.call_count, 1)

    def test_webhook_signature_replay_and_allowlist(self):
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        raw = json.dumps({'broadcaster': {'user_id': 123}, 'subscriber': {'username': 'Viewer', 'email': 'private@example.test'}, 'secret': 'do-not-store'}).encode()
        timestamp = datetime.now(timezone.utc).isoformat()
        message_id = 'test-message'
        signature = key.sign((message_id + '.' + timestamp + '.').encode() + raw, padding.PKCS1v15(), hashes.SHA256())
        headers = {'Kick-Event-Message-Id': message_id, 'Kick-Event-Message-Timestamp': timestamp, 'Kick-Event-Type': 'channel.subscription.new', 'Kick-Event-Signature': base64.b64encode(signature).decode()}
        with patch.object(auth, 'event_key', return_value=key.public_key()):
            auth.receive_event(headers, raw)
            auth.receive_event(headers, raw)
            self.assertEqual(len(auth.EVENTS[123]), 1)
            self.assertNotIn('private@example', json.dumps(auth.EVENTS))
            self.assertNotIn('do-not-store', json.dumps(auth.EVENTS))
            with self.assertRaises(PermissionError):
                auth.receive_event(headers, raw + b' ')
            headers['Kick-Event-Message-Timestamp'] = '2000-01-01T00:00:00Z'
            with self.assertRaises(PermissionError):
                auth.receive_event(headers, raw)

    def test_diagnostics_exclude_account_and_history(self):
        sample = {'schema': 1, 'edition': 'standard', 'version': '2.2.3', 'session': '1' * 16, 'cpu_load': 0.5}
        self.assertEqual(self.call('POST', '/telemetry', sample)[0], 200)
        for extra in ({'channel': 'private'}, {'cpu_load': float('inf')}, {'model': 'https://private.test/'}):
            self.assertEqual(self.call('POST', '/telemetry', dict(sample, **extra))[0], 400)
        with auth.database() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM diagnostics').fetchone()[0], 1)


if __name__ == '__main__':
    unittest.main()
