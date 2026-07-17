#!/usr/bin/env python3
"""Minimal aggregate first-launch counter for Kick TV.

The service stores one integer and intentionally creates no per-request logs.
It is designed to run on localhost behind the supplied Nginx configuration.
"""

import json
import os
import sqlite3
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit


HOST = os.environ.get("KICKTV_COUNTER_HOST", "127.0.0.1")
PORT = int(os.environ.get("KICKTV_COUNTER_PORT", "8787"))
DATABASE = os.environ.get(
    "KICKTV_COUNTER_DB", "/var/lib/kicktv-counter/counter.db"
)
SERVICE_STARTED_AT = time.time()


def connect():
    connection = sqlite3.connect(DATABASE, timeout=10)
    connection.execute(
        "CREATE TABLE IF NOT EXISTS aggregate ("
        "name TEXT PRIMARY KEY CHECK (name = 'installs'), "
        "value INTEGER NOT NULL CHECK (value >= 0))"
    )
    connection.execute(
        "INSERT OR IGNORE INTO aggregate (name, value) VALUES ('installs', 0)"
    )
    connection.commit()
    return connection


def increment():
    with connect() as connection:
        connection.execute("BEGIN IMMEDIATE")
        connection.execute(
            "UPDATE aggregate SET value = value + 1 WHERE name = 'installs'"
        )
        return connection.execute(
            "SELECT value FROM aggregate WHERE name = 'installs'"
        ).fetchone()[0]


def current_count():
    with connect() as connection:
        return connection.execute(
            "SELECT value FROM aggregate WHERE name = 'installs'"
        ).fetchone()[0]


def format_uptime(seconds):
    days, seconds = divmod(int(seconds), 86400)
    hours, seconds = divmod(seconds, 3600)
    minutes, _ = divmod(seconds, 60)
    return f"{days} d {hours} h {minutes} min" if days else f"{hours} h {minutes} min"


def dashboard_html():
    installs = current_count()
    uptime = format_uptime(max(0, time.time() - SERVICE_STARTED_AT))
    refreshed = datetime.now(timezone.utc).astimezone().strftime("%d.%m.%Y %H:%M:%S")
    template = """<!doctype html>
<html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="15"><title>Kick TV · Instalace</title>
<style>
:root{color-scheme:dark;--green:#53fc18;--bg:#070907;--card:#111612;--muted:#8f9a91;--line:#ffffff16}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 85% 5%,#194d2255,transparent 34rem),radial-gradient(circle at 4% 95%,#0d3c2d66,transparent 30rem),var(--bg);color:#f7faf7;font:16px/1.45 Arial,sans-serif}.wrap{width:min(1000px,calc(100% - 36px));margin:auto;padding:54px 0 70px}.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:34px}.brand{display:flex;align-items:center}.logo{width:58px;height:58px;margin-right:17px;display:grid;place-items:center;border:1px solid #53fc1838;border-radius:17px;background:#53fc1811;color:var(--green);font-size:31px;font-weight:1000;box-shadow:0 0 35px #53fc1822;cursor:default}.brand h1{margin:0;font-size:31px;letter-spacing:-1px}.brand p{margin:5px 0 0;color:var(--muted)}.live{padding:9px 13px;border:1px solid #53fc1840;border-radius:99px;background:#53fc1810;color:var(--green);font-size:12px;font-weight:900;letter-spacing:1px}.hero{display:grid;grid-template-columns:1.35fr .65fr;gap:16px;margin-bottom:16px}.main,.side,.card{border:1px solid var(--line);border-radius:22px;background:linear-gradient(145deg,#141a15e8,#0c100df4);box-shadow:0 24px 70px #0005}.main{padding:35px}.label{color:var(--muted);font-size:12px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase}.big{margin:8px 0 0;color:var(--green);font-size:76px;font-weight:1000;line-height:1}.sub{margin-top:13px;color:#aeb8b0}.side{padding:29px}.side strong{display:block;margin:12px 0 7px;color:var(--green);font-size:27px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.card{padding:24px;min-height:142px}.card strong{display:block;margin-top:12px;font-size:27px}.card small{display:block;margin-top:7px;color:var(--muted)}.foot{margin-top:24px;display:flex;justify-content:space-between;color:#6f7a71;font-size:13px}.spark{position:fixed;width:9px;height:9px;border-radius:50%;background:var(--green);pointer-events:none;animation:pop 1.1s ease-out forwards}@keyframes pop{to{opacity:0;transform:translateY(-90px) scale(2)}}@media(max-width:760px){.hero,.grid{grid-template-columns:1fr}.top,.foot{align-items:flex-start;flex-direction:column}.live{margin-top:18px}.big{font-size:58px}}
</style></head><body><main class="wrap"><header class="top"><div class="brand"><div class="logo" id="logo">K</div><div><h1>Kick TV Dashboard</h1><p>Jediné anonymní souhrnné číslo</p></div></div><span class="live">● ONLINE · 15 s</span></header>
<section class="hero"><div class="main"><span class="label">První spuštění / instalace</span><div class="big">__INSTALLS__</div><div class="sub">Celkový počet nahlášený aplikacemi od verze 2.2</div></div><div class="side"><span class="label">Služba počítadla</span><strong>V PROVOZU</strong><div class="sub">Uptime: __UPTIME__</div></div></section>
<section class="grid"><article class="card"><span class="label">Uložená data</span><strong>1 číslo</strong><small>Žádné instalace ani zařízení jednotlivě</small></article><article class="card"><span class="label">Signál aplikace</span><strong>1×</strong><small>Pouze po prvním úspěšném spuštění</small></article><article class="card"><span class="label">Aplikační log</span><strong>VYPNUTÝ</strong><small>Bez IP adres a historie požadavků</small></article></section>
<footer class="foot"><span>Obrázková proxy je vypnutá</span><span>Obnoveno __REFRESHED__</span></footer></main><script>(function(){var n=0,l=document.getElementById('logo');l.onclick=function(){n++;if(n!==7)return;n=0;for(var i=0;i<18;i++){var s=document.createElement('i');s.className='spark';s.style.left=(l.getBoundingClientRect().left+25+Math.random()*30)+'px';s.style.top=(l.getBoundingClientRect().top+25+Math.random()*30)+'px';document.body.appendChild(s);setTimeout(function(x){return function(){x.remove();};}(s),1200);}};}());</script></body></html>"""
    replacements = {
        "__INSTALLS__": installs,
        "__UPTIME__": uptime,
        "__REFRESHED__": refreshed,
    }
    for token, value in replacements.items():
        template = template.replace(token, str(value))
    return template.encode("utf-8")


class CounterHandler(BaseHTTPRequestHandler):
    server_version = "KickTVCounter/1"
    sys_version = ""

    def log_message(self, _format, *_args):
        return

    def send_common_headers(self, status, content_type=None, length=None):
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if content_type:
            self.send_header("Content-Type", content_type)
        if length is not None:
            self.send_header("Content-Length", str(length))
        self.end_headers()

    def send_json(self, status, payload):
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_common_headers(status, "application/json; charset=utf-8", len(body))
        self.wfile.write(body)

    def send_dashboard(self, body):
        self.send_response(200)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'none'; style-src 'unsafe-inline'; "
            "script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
        )
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        if urlsplit(self.path).path != "/install":
            self.send_common_headers(404, length=0)
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self):
        if urlsplit(self.path).path != "/install":
            self.send_common_headers(404, length=0)
            return
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_json(400, {"error": "invalid content length"})
            return
        if content_length < 0:
            self.send_json(400, {"error": "invalid content length"})
            return
        if content_length > 1024:
            self.send_json(413, {"error": "request body too large"})
            return
        if content_length:
            self.rfile.read(content_length)
        try:
            increment()
        except sqlite3.Error:
            self.send_json(503, {"error": "counter unavailable"})
            return
        self.send_common_headers(204, length=0)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/healthz":
            try:
                current_count()
            except sqlite3.Error:
                self.send_json(503, {"ok": False})
                return
            self.send_json(200, {"ok": True})
            return
        if path == "/count":
            try:
                count = current_count()
            except sqlite3.Error:
                self.send_json(503, {"error": "counter unavailable"})
                return
            self.send_json(200, {"installs": count})
            return
        if path == "/dashboard":
            try:
                body = dashboard_html()
            except sqlite3.Error:
                self.send_json(503, {"error": "dashboard unavailable"})
                return
            self.send_dashboard(body)
            return
        self.send_common_headers(404, length=0)


if __name__ == "__main__":
    database_directory = os.path.dirname(DATABASE)
    if database_directory:
        os.makedirs(database_directory, mode=0o700, exist_ok=True)
    connect().close()
    httpd = ThreadingHTTPServer((HOST, PORT), CounterHandler)
    httpd.daemon_threads = True
    httpd.serve_forever()
