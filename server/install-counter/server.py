#!/usr/bin/env python3
"""Aggregate counters and opt-in Lite diagnostics for Kick TV."""

import html
import json
import math
import os
import re
import sqlite3
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

HOST = os.environ.get("KICKTV_COUNTER_HOST", "127.0.0.1")
PORT = int(os.environ.get("KICKTV_COUNTER_PORT", "8787"))
DATABASE = os.environ.get("KICKTV_COUNTER_DB", "/var/lib/kicktv-counter/counter.db")
SERVICE_STARTED_AT = time.time()
RETENTION_SECONDS = 90 * 86400
EVENTS = {"session_start", "sample", "playback_ready", "playback_error"}
SAFE_TEXT = re.compile(r"^[A-Za-z0-9_.: -]*$")
SESSION = re.compile(r"^[0-9a-f]{16}$")


def connect():
    db = sqlite3.connect(DATABASE, timeout=10)
    db.execute("CREATE TABLE IF NOT EXISTS aggregate (name TEXT PRIMARY KEY CHECK(name='installs'), value INTEGER NOT NULL CHECK(value>=0))")
    db.execute("CREATE TABLE IF NOT EXISTS lite_aggregate (name TEXT PRIMARY KEY CHECK(name='installs'), value INTEGER NOT NULL CHECK(value>=0))")
    db.execute("INSERT OR IGNORE INTO aggregate VALUES ('installs',0)")
    db.execute("INSERT OR IGNORE INTO lite_aggregate VALUES ('installs',0)")
    db.execute("""CREATE TABLE IF NOT EXISTS lite_telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT, received_at INTEGER NOT NULL,
      session TEXT NOT NULL, event TEXT NOT NULL, version TEXT NOT NULL,
      model TEXT, model_code TEXT, firmware TEXT, tizen TEXT, cpu_load REAL,
      ram_total INTEGER, ram_available INTEGER, memory_status TEXT,
      storage_total INTEGER, storage_available INTEGER, js_heap_used INTEGER,
      js_heap_total INTEGER, js_heap_limit INTEGER, event_loop_avg REAL,
      event_loop_max REAL, player_state TEXT, quality TEXT, buffer_count INTEGER,
      buffer_ms INTEGER, prepare_ms INTEGER, stage TEXT, error_code TEXT)""")
    db.execute("CREATE INDEX IF NOT EXISTS lite_telemetry_time ON lite_telemetry(received_at)")
    db.commit()
    return db


def increment(lite=False):
    table = "lite_aggregate" if lite else "aggregate"
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        db.execute(f"UPDATE {table} SET value=value+1 WHERE name='installs'")
        return db.execute(f"SELECT value FROM {table} WHERE name='installs'").fetchone()[0]


def current_counts():
    with connect() as db:
        main = db.execute("SELECT value FROM aggregate WHERE name='installs'").fetchone()[0]
        lite = db.execute("SELECT value FROM lite_aggregate WHERE name='installs'").fetchone()[0]
    return main, lite


def text_value(data, name, limit, required=False):
    value = str(data.get(name, ""))[:limit]
    if required and not value:
        raise ValueError(name)
    if not SAFE_TEXT.fullmatch(value):
        raise ValueError(name)
    return value or None


def number_value(data, name, maximum, integer=False):
    value = data.get(name)
    if value is None:
        return None
    if isinstance(value, bool):
        raise ValueError(name)
    value = float(value)
    if not math.isfinite(value) or value < 0 or value > maximum:
        raise ValueError(name)
    return int(value) if integer else round(value, 3)


def validate_telemetry(data):
    if not isinstance(data, dict) or data.get("schema") != 1:
        raise ValueError("schema")
    event, session = data.get("event"), data.get("session")
    if event not in EVENTS or not isinstance(session, str) or not SESSION.fullmatch(session):
        raise ValueError("event")
    fields = {"received_at": int(time.time()), "session": session, "event": event}
    for name, limit, required in (
        ("version", 20, True), ("model", 48, False), ("model_code", 48, False),
        ("firmware", 48, False), ("tizen", 20, False), ("memory_status", 20, False),
        ("player_state", 24, False), ("quality", 16, False), ("stage", 40, False),
        ("error_code", 80, False)):
        fields[name] = text_value(data, name, limit, required)
    fields["cpu_load"] = number_value(data, "cpu_load", 1)
    for name in ("ram_total", "ram_available", "storage_total", "storage_available", "js_heap_used", "js_heap_total", "js_heap_limit"):
        fields[name] = number_value(data, name, 2**50, True)
    for name in ("event_loop_avg", "event_loop_max"):
        fields[name] = number_value(data, name, 86400000)
    for name in ("buffer_count", "buffer_ms", "prepare_ms"):
        fields[name] = number_value(data, name, 86400000, True)
    return fields


def store_telemetry(data):
    fields = validate_telemetry(data)
    with connect() as db:
        db.execute("DELETE FROM lite_telemetry WHERE received_at < ?", (int(time.time()) - RETENTION_SECONDS,))
        names = list(fields)
        db.execute(f"INSERT INTO lite_telemetry ({','.join(names)}) VALUES ({','.join('?' for _ in names)})", [fields[name] for name in names])


def telemetry_summary():
    since = int(time.time()) - RETENTION_SECONDS
    with connect() as db:
        summary = db.execute("""SELECT COUNT(*), COUNT(DISTINCT session),
          SUM(event='playback_ready'), SUM(event='playback_error'), AVG(cpu_load),
          MAX(cpu_load), MIN(ram_available), MIN(storage_available),
          AVG(event_loop_avg), MAX(event_loop_max)
          FROM lite_telemetry WHERE received_at>=?""", (since,)).fetchone()
        devices = db.execute("""SELECT COALESCE(NULLIF(model,''),'unknown'),
          COALESCE(NULLIF(firmware,''),'unknown'), COUNT(DISTINCT session),
          ROUND(AVG(cpu_load)*100,1), ROUND(MAX(cpu_load)*100,1),
          MIN(ram_available), MIN(storage_available)
          FROM lite_telemetry WHERE received_at>=? GROUP BY model,firmware
          ORDER BY COUNT(DISTINCT session) DESC LIMIT 20""", (since,)).fetchall()
    return summary, devices


def size(value):
    if value is None:
        return "—"
    value, units, index = float(value), ["B", "KB", "MB", "GB", "TB"], 0
    while value >= 1024 and index < len(units) - 1:
        value, index = value / 1024, index + 1
    return f"{value:.1f} {units[index]}"


def dashboard_html():
    main, lite = current_counts()
    summary, devices = telemetry_summary()
    events, sessions, ready, errors, avg_cpu, max_cpu, min_ram, min_storage, avg_lag, max_lag = summary
    rows = "".join(
        "<tr><td>{}</td><td>{}</td><td>{}</td><td>{} / {} %</td><td>{}</td><td>{}</td></tr>".format(
            html.escape(str(model)), html.escape(str(firmware)), count,
            avg or "—", maximum or "—", size(ram), size(storage))
        for model, firmware, count, avg, maximum, ram, storage in devices
    ) or '<tr><td colspan="6">Zatím žádná povolená diagnostika.</td></tr>'
    uptime = int(max(0, time.time() - SERVICE_STARTED_AT) / 60)
    refreshed = datetime.now().strftime("%d.%m.%Y %H:%M:%S")
    return f"""<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="30"><title>Kick TV Dashboard</title><style>
:root{{color-scheme:dark;--g:#53fc18;--bg:#070907;--card:#111612;--muted:#8f9a91;--line:#ffffff16}}*{{box-sizing:border-box}}body{{margin:0;background:radial-gradient(circle at 85% 5%,#194d2255,transparent 34rem),var(--bg);color:#f7faf7;font:16px/1.45 Arial,sans-serif}}.wrap{{width:min(1180px,calc(100% - 36px));margin:auto;padding:48px 0 70px}}header{{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}}.brand{{display:flex;align-items:center}}.logo{{width:56px;height:56px;margin-right:16px;display:grid;place-items:center;border:1px solid #53fc1838;border-radius:17px;background:#53fc1811;color:var(--g);font-size:30px;font-weight:1000}}h1{{margin:0}}p,.muted{{color:var(--muted)}}.live{{color:var(--g)}}.grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}}.card,.table{{border:1px solid var(--line);border-radius:20px;background:linear-gradient(145deg,#141a15e8,#0c100df4);padding:24px}}.card b{{display:block;color:var(--g);font-size:34px}}.label{{color:var(--muted);font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase}}.table{{margin-top:16px;overflow:auto}}table{{width:100%;border-collapse:collapse}}th,td{{padding:12px;text-align:left;border-bottom:1px solid var(--line)}}th{{color:var(--muted);font-size:12px}}.spark{{position:fixed;width:9px;height:9px;border-radius:50%;background:var(--g);pointer-events:none;animation:pop 1.1s ease-out forwards}}@keyframes pop{{to{{opacity:0;transform:translateY(-90px) scale(2)}}}}@media(max-width:800px){{.grid{{grid-template-columns:1fr 1fr}}header{{align-items:flex-start;flex-direction:column}}}}
</style></head><body><main class="wrap"><header><div class="brand"><div class="logo" id="logo">K</div><div><h1>Kick TV Dashboard</h1><p>Souhrnné instalace a dobrovolná Lite diagnostika</p></div></div><b class="live">● ONLINE · {uptime} min</b></header><section class="grid"><article class="card"><span class="label">Kick TV instalace</span><b>{main}</b></article><article class="card"><span class="label">Lite instalace</span><b>{lite}</b></article><article class="card"><span class="label">Lite relace / 90 dní</span><b>{sessions or 0}</b><small class="muted">{events or 0} vzorků</small></article><article class="card"><span class="label">Přehrání / chyby</span><b>{ready or 0} / {errors or 0}</b></article><article class="card"><span class="label">CPU průměr / max</span><b>{round((avg_cpu or 0)*100,1)} / {round((max_cpu or 0)*100,1)} %</b></article><article class="card"><span class="label">Nejméně volné RAM</span><b>{size(min_ram)}</b></article><article class="card"><span class="label">Nejméně volného místa</span><b>{size(min_storage)}</b></article><article class="card"><span class="label">Event loop avg / max</span><b>{round(avg_lag or 0,1)} / {round(max_lag or 0,1)} ms</b></article></section><section class="table"><h2>Modely s povolenou diagnostikou</h2><table><thead><tr><th>Model</th><th>Firmware</th><th>Relace</th><th>CPU avg/max</th><th>Min. RAM</th><th>Min. místo</th></tr></thead><tbody>{rows}</tbody></table><p class="muted">Bez kanálů, chatu, historie, streamovacích adres a IP logů. Technické události se mažou po 90 dnech. Obnoveno {refreshed}.</p></section></main><script>(function(){{var n=0,l=document.getElementById('logo');l.onclick=function(){{n++;if(n!==7)return;n=0;for(var i=0;i<18;i++){{var s=document.createElement('i');s.className='spark';s.style.left=(l.getBoundingClientRect().left+25+Math.random()*30)+'px';s.style.top=(l.getBoundingClientRect().top+25+Math.random()*30)+'px';document.body.appendChild(s);setTimeout(function(x){{return function(){{x.remove();}};}}(s),1200);}}}};}}());</script></body></html>""".encode()


class CounterHandler(BaseHTTPRequestHandler):
    server_version, sys_version = "KickTVCounter/2", ""
    def log_message(self, _format, *_args): pass
    def common(self, status, kind=None, length=0):
        self.send_response(status); self.send_header("Access-Control-Allow-Origin", "*"); self.send_header("Cache-Control", "no-store"); self.send_header("X-Content-Type-Options", "nosniff")
        if kind: self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(length)); self.end_headers()
    def send_json(self, status, data):
        body = json.dumps(data, separators=(",", ":")).encode(); self.common(status, "application/json; charset=utf-8", len(body)); self.wfile.write(body)
    def content(self, limit):
        try: length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc: raise ValueError("length") from exc
        if length < 0 or length > limit: raise ValueError("length")
        return self.rfile.read(length) if length else b""
    def do_OPTIONS(self):
        if urlsplit(self.path).path not in {"/install", "/install-lite", "/telemetry-lite"}: self.common(404); return
        self.send_response(204); self.send_header("Access-Control-Allow-Origin", "*"); self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS"); self.send_header("Access-Control-Allow-Headers", "Content-Type"); self.send_header("Access-Control-Max-Age", "86400"); self.send_header("Content-Length", "0"); self.end_headers()
    def do_POST(self):
        path = urlsplit(self.path).path
        try:
            if path in {"/install", "/install-lite"}: self.content(1024); increment(path == "/install-lite"); self.common(204); return
            if path == "/telemetry-lite": store_telemetry(json.loads(self.content(16384).decode())); self.common(204); return
        except (ValueError, UnicodeError, json.JSONDecodeError): self.send_json(400, {"error":"invalid request"}); return
        except sqlite3.Error: self.send_json(503, {"error":"service unavailable"}); return
        self.common(404)
    def do_GET(self):
        path = urlsplit(self.path).path
        try:
            if path == "/healthz": current_counts(); self.send_json(200, {"ok":True}); return
            if path == "/count":
                main, lite = current_counts(); self.send_json(200, {"installs":main,"lite_installs":lite}); return
            if path == "/dashboard":
                body = dashboard_html(); self.send_response(200); self.send_header("Cache-Control", "no-store"); self.send_header("Content-Type", "text/html; charset=utf-8"); self.send_header("Content-Length", str(len(body))); self.send_header("Referrer-Policy", "no-referrer"); self.send_header("X-Frame-Options", "DENY"); self.send_header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"); self.end_headers(); self.wfile.write(body); return
        except sqlite3.Error: self.send_json(503, {"error":"service unavailable"}); return
        self.common(404)


if __name__ == "__main__":
    directory = os.path.dirname(DATABASE)
    if directory: os.makedirs(directory, mode=0o700, exist_ok=True)
    connect().close()
    server = ThreadingHTTPServer((HOST, PORT), CounterHandler); server.daemon_threads = True; server.serve_forever()
