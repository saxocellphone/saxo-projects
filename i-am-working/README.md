# I Am Working

**Paste a URL. Work in the interface you wish it had.**

MSOutlookit-style: the site is *regenerated* into a full app chrome — not just restyled text.

| Shell | Best for |
|---|---|
| **Google Docs** | Articles / longform |
| **Technical docs** | Reference reading with a TOC |
| **Outlook** | Reddit listings, HN, threads (inbox + reading pane) |

## Run

```bash
cd i-am-working
python3 -m http.server 5173
# open http://localhost:5173
```

Deep links:

```
http://localhost:5173/?url=demo://reddit&shell=outlook
http://localhost:5173/?url=https://news.ycombinator.com/&shell=outlook
```

## How fetch works

1. **Adapters** for structured sites (no HTML scrape):
   - Reddit → public `.json`
   - Hacker News → Algolia API
2. **Generic pages**: direct fetch → CORS relay → [Jina Reader](https://r.jina.ai) fallback
3. **Demos** (`demo://article`, `demo://reddit`, `demo://hn`) work offline

Many sites block browsers; demos and Reddit/HN are the reliable path. A dedicated same-origin fetch proxy is the natural next upgrade.

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
