# i-am-working

**Paste a URL. Work in the interface you wish it had.**

Runko project created as:

```bash
runko project create \
  --name i-am-working \
  --type app \
  --lang ts \
  --api rest \
  --build-engine vite \
  --owners user:admin
```

Layout:

```text
i-am-working/
  PROJECT.yaml          # app, language ts, http + openapi
  openapi.yaml          # REST contract (§13.3.1)
  frontend/             # Vite + TypeScript UI
  server/               # REST API implementing openapi.yaml
```

## Run

```bash
# API (implements openapi.yaml)
cd i-am-working/server && npm install && npm run dev

# Frontend (proxies /api → API)
cd i-am-working/frontend && npm install && npm run dev
# → http://127.0.0.1:5173
```

Or from `frontend/`: `npm run dev:all` if concurrently is installed via root scripts.

## REST

See `openapi.yaml`. Primary write path:

`POST /api/v1/documents` with `{ "url": "https://…" }` → normalized `Document`.

## Frontend

Vite app under `frontend/`. Shells: Google Docs, technical docs, Outlook.
Hide the top bar with **Hide bar** or press **`b`**.
