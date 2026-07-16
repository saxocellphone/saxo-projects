#!/usr/bin/env python3
"""
I Am Working — static server + same-origin fetch proxy.

Browsers cannot read most sites (CORS). This proxy fetches on the server
and returns HTML to the app at /api/fetch?url=…

  python3 server.py
  # → http://localhost:5173
"""

from __future__ import annotations

import ipaddress
import json
import socket
import sys
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
MAX_BYTES = 5_000_000
TIMEOUT = 25
UA = (
    "Mozilla/5.0 (compatible; IAmWorking/1.0; +https://github.com/saxocellphone) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def is_public_hostname(host: str) -> bool:
    """Reject localhost / private / link-local targets (SSRF guard)."""
    if not host or host.lower() in {"localhost"}:
        return False
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        return False
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return False
    return True


def fetch_url(url: str) -> tuple[int, dict, bytes]:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return 400, {"error": "only http(s) URLs are supported"}, b""
    if not parsed.hostname or not is_public_hostname(parsed.hostname):
        return 400, {"error": "refusing non-public host (SSRF protection)"}, b""

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            raw = resp.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                return 502, {"error": f"response larger than {MAX_BYTES} bytes"}, b""
            final = resp.geturl()
            ctype = resp.headers.get("Content-Type", "text/html; charset=utf-8")
            body = {
                "finalUrl": final,
                "contentType": ctype,
                "via": "local-proxy",
                "html": raw.decode("utf-8", errors="replace"),
            }
            return 200, body, b""
    except urllib.error.HTTPError as e:
        return e.code, {"error": f"upstream HTTP {e.code}"}, b""
    except Exception as e:  # noqa: BLE001 — surface to the UI
        return 502, {"error": str(e)}, b""


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/fetch":
            return self._handle_fetch(parsed)
        if parsed.path == "/api/health":
            return self._json(200, {"ok": True})
        return super().do_GET()

    def _handle_fetch(self, parsed) -> None:
        qs = parse_qs(parsed.query)
        url = (qs.get("url") or [""])[0].strip()
        if not url:
            return self._json(400, {"error": "missing url query parameter"})
        status, body, _ = fetch_url(url)
        return self._json(status, body)

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status: int, obj: dict) -> None:
        data = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self._cors()
        self.end_headers()
        self.wfile.write(data)


def main() -> None:
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"I Am Working → http://127.0.0.1:{PORT}", flush=True)
    print("  static files + GET /api/fetch?url=…", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nbye", flush=True)


if __name__ == "__main__":
    main()
