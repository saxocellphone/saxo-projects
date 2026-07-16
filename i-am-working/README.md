# I Am Working

**Paste a URL. Work in the interface you wish it had.**

MSOutlookit-style: the site is *regenerated* into a full app chrome — not just restyled text.

| Shell | Best for |
|---|---|
| **Google Docs** | Articles / longform |
| **Technical docs** | Reference reading with a TOC |
| **Outlook** | Reddit listings, HN, threads (inbox + reading pane) |

## Run (important)

Use the bundled server so the app can fetch **any public URL** (avoids browser CORS):

```bash
cd i-am-working
python3 server.py
# → http://127.0.0.1:5173
```

`python3 -m http.server` only serves files — **no proxy**, so sites like Project Gutenberg will fail with CORS.

Deep links:

```
http://127.0.0.1:5173/?url=demo://reddit&shell=outlook
http://127.0.0.1:5173/?url=https://news.ycombinator.com/&shell=outlook
http://127.0.0.1:5173/?url=https://www.gutenberg.org/files/9662/9662-h/9662-h.htm&shell=google-docs
```

## How fetch works

1. **Same-origin proxy** — `GET /api/fetch?url=…` (via `server.py`) for arbitrary public pages  
2. **Adapters** for structured sites:
   - Reddit → public `.json`
   - Hacker News → Algolia API
3. **Browser fallbacks** if the proxy isn’t running: direct → public CORS relays → Jina  
4. **Demos** (`demo://article`, `demo://reddit`, `demo://hn`) work offline

The proxy refuses private/loopback targets (SSRF guard) and caps response size.

## Architecture

```
URL → ingest (adapter | html) → Doc model → shell (Docs | tech-docs | Outlook)
```

- `src/model.js` — shell-agnostic document
- `src/ingest/` — fetch + site adapters
- `src/shells/` — full UI chrome renderers
- `src/app.js` — URL bar, shell switch, deep links

## Project

Runko app: `i-am-working` (`PROJECT.yaml`).
