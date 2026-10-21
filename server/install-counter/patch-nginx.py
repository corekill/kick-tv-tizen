#!/usr/bin/env python3
"""Add the Lite counter routes to an existing CoreKill Nginx server block."""

import pathlib
import sys


target = pathlib.Path(sys.argv[1])
content = target.read_text()
if "location = /api/kicktv-lite/install" not in content:
    marker = "    location = /api/kicktv/count {"
    addition = """    location = /api/kicktv-lite/install {
        access_log off;
        client_max_body_size 1k;
        limit_req zone=kicktv_install_global burst=40 nodelay;
        limit_req_status 429;
        proxy_pass_request_headers off;
        proxy_pass http://127.0.0.1:8787/install-lite;
    }

    location = /api/kicktv-lite/telemetry {
        access_log off;
        client_max_body_size 16k;
        limit_req zone=kicktv_telemetry_global burst=30 nodelay;
        limit_req_status 429;
        proxy_pass_request_headers off;
        proxy_set_header Content-Type $content_type;
        proxy_set_header Content-Length $content_length;
        proxy_pass http://127.0.0.1:8787/telemetry-lite;
    }

"""
    if marker not in content:
        raise SystemExit("Kick TV location marker not found")
    target.write_text(content.replace(marker, addition + marker, 1))
