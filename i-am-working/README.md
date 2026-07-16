# I Am Working

Turn any HTML page (or pasted text) into a reading format you choose.

Examples:

- Read an article as **technical documentation**
- Restyle a Reddit thread to look like **Google Docs**
- Browse a blog post as a **newspaper**, **email**, or **man page**

## Run

Open `index.html` in a browser, or serve the folder:

```bash
cd i-am-working
python3 -m http.server 5173
# then open http://localhost:5173
```

## How it works

1. **Paste** HTML/text, or enter a URL (same-origin or CORS-friendly only — otherwise paste the page source).
2. Pick a **format preset** (docs, Google Docs, Medium, newspaper, …).
3. Preview live; **copy HTML** or **print / save as PDF**.

All processing runs in the browser. Nothing is uploaded.
