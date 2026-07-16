/**
 * Fetch HTML for arbitrary public URLs.
 *
 * Order:
 * 1) Same-origin /api/fetch (local server.py proxy) — reliable, no CORS
 * 2) Direct browser fetch (only CORS-friendly hosts)
 * 3) Public CORS relays (best-effort)
 * 4) Jina Reader (often requires auth; last resort)
 */

/**
 * @param {string} url
 * @returns {Promise<{ html: string, finalUrl: string, via: string }>}
 */
export async function fetchPageHtml(url) {
  const target = new URL(url);
  if (!/^https?:$/.test(target.protocol)) {
    throw new Error("Only http(s) URLs are supported");
  }

  const errors = [];

  // 1) Local / same-origin proxy — preferred
  try {
    const result = await fetchViaLocalProxy(target.toString());
    if (result) return result;
  } catch (err) {
    errors.push(`local-proxy: ${errMessage(err)}`);
  }

  // 2) Direct
  try {
    const res = await fetch(target.toString(), {
      redirect: "follow",
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    if (res.ok) {
      const html = await res.text();
      if (html && html.length > 40) {
        return { html, finalUrl: res.url || target.toString(), via: "direct" };
      }
    } else {
      errors.push(`direct: HTTP ${res.status}`);
    }
  } catch (err) {
    errors.push(`direct: ${errMessage(err)}`);
  }

  // 3) Public relays
  for (const [name, build] of PUBLIC_RELAYS) {
    try {
      const res = await fetch(build(target.toString()));
      if (!res.ok) {
        errors.push(`${name}: HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();
      if (html && html.length > 40 && !looksLikeProxyError(html)) {
        return { html, finalUrl: target.toString(), via: name };
      }
      errors.push(`${name}: empty or blocked body`);
    } catch (err) {
      errors.push(`${name}: ${errMessage(err)}`);
    }
  }

  // 4) Jina reader
  try {
    const jina = `https://r.jina.ai/${target.toString()}`;
    const res = await fetch(jina, { headers: { Accept: "text/plain" } });
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 40) {
        return {
          html: jinaTextToHtml(text, target.toString()),
          finalUrl: target.toString(),
          via: "jina",
        };
      }
    } else {
      errors.push(`jina: HTTP ${res.status}`);
    }
  } catch (err) {
    errors.push(`jina: ${errMessage(err)}`);
  }

  throw new Error(
    "Could not fetch this URL from the browser.\n\n" +
      "Run the app with the local proxy so any public site works:\n" +
      "  cd i-am-working && python3 server.py\n" +
      "  open http://127.0.0.1:5173\n\n" +
      `Details: ${errors.slice(0, 4).join(" · ")}`,
  );
}

/**
 * @param {string} url
 * @returns {Promise<{ html: string, finalUrl: string, via: string } | null>}
 */
async function fetchViaLocalProxy(url) {
  // Prefer same origin (server.py). Also try absolute 5173 if opened as file://
  const candidates = [
    `/api/fetch?url=${encodeURIComponent(url)}`,
    `http://127.0.0.1:5173/api/fetch?url=${encodeURIComponent(url)}`,
    `http://localhost:5173/api/fetch?url=${encodeURIComponent(url)}`,
  ];

  let lastErr = null;
  for (const endpoint of candidates) {
    try {
      const res = await fetch(endpoint);
      // Missing proxy → 404 HTML from static server
      const ctype = res.headers.get("content-type") || "";
      if (!ctype.includes("application/json")) {
        lastErr = new Error("proxy not running (not JSON)");
        continue;
      }
      const data = await res.json();
      if (!res.ok) {
        lastErr = new Error(data.error || `HTTP ${res.status}`);
        // If proxy is up but upstream failed, don't pretend it's missing
        if (res.status >= 400 && data.error) throw lastErr;
        continue;
      }
      if (data.html && data.html.length > 40) {
        return {
          html: data.html,
          finalUrl: data.finalUrl || url,
          via: data.via || "local-proxy",
        };
      }
      lastErr = new Error("empty html from proxy");
    } catch (err) {
      lastErr = err;
      // network error on 127.0.0.1 → try next candidate
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

const PUBLIC_RELAYS = [
  [
    "allorigins",
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ],
  [
    "codetabs",
    (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ],
];

function looksLikeProxyError(html) {
  return /just a moment|cf-browser-verification|access denied|enable javascript|AuthenticationRequiredError/i.test(
    html.slice(0, 2000),
  );
}

function errMessage(err) {
  if (err instanceof TypeError) return "blocked by CORS or network";
  return err instanceof Error ? err.message : String(err);
}

/** Convert Jina plain/markdown-ish output into simple HTML for the extractor */
function jinaTextToHtml(text, sourceUrl) {
  const lines = text.split(/\r?\n/);
  const parts = [`<!-- source: ${escapeAttr(sourceUrl)} via jina -->`];
  let inCode = false;
  let para = [];

  const flushPara = () => {
    if (!para.length) return;
    const body = para.join(" ").trim();
    if (body) parts.push(`<p>${escapeHtml(body)}</p>`);
    para = [];
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      flushPara();
      inCode = !inCode;
      if (inCode) parts.push("<pre><code>");
      else parts.push("</code></pre>");
      continue;
    }
    if (inCode) {
      parts.push(escapeHtml(line) + "\n");
      continue;
    }
    if (/^Title:\s*/i.test(line)) {
      flushPara();
      parts.push(`<h1>${escapeHtml(line.replace(/^Title:\s*/i, ""))}</h1>`);
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushPara();
      parts.push(`<h1>${escapeHtml(line.replace(/^#\s+/, ""))}</h1>`);
      continue;
    }
    if (/^##\s+/.test(line)) {
      flushPara();
      parts.push(`<h2>${escapeHtml(line.replace(/^##\s+/, ""))}</h2>`);
      continue;
    }
    if (/^###\s+/.test(line)) {
      flushPara();
      parts.push(`<h3>${escapeHtml(line.replace(/^###\s+/, ""))}</h3>`);
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushPara();
      parts.push(`<blockquote>${escapeHtml(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }
    if (!line.trim()) {
      flushPara();
      continue;
    }
    if (/^(URL Source|Published Time|Markdown Content):/i.test(line)) continue;
    para.push(line.trim());
  }
  flushPara();
  return `<!DOCTYPE html><html><body><article>${parts.join("\n")}</article></body></html>`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll("'", "&#39;");
}
