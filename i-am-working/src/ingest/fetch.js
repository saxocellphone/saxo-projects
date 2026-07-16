/**
 * Fetch HTML for arbitrary public URLs.
 * 1) Direct fetch (CORS-friendly hosts)
 * 2) Public CORS relay (allorigins) as best-effort for demos
 * 3) Jina Reader as readability-oriented fallback
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

  // 1) Direct
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
    }
  } catch {
    // continue
  }

  // 2) allorigins raw
  try {
    const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(target.toString())}`;
    const res = await fetch(proxy);
    if (res.ok) {
      const html = await res.text();
      if (html && html.length > 40 && !looksLikeProxyError(html)) {
        return { html, finalUrl: target.toString(), via: "allorigins" };
      }
    }
  } catch {
    // continue
  }

  // 3) Jina reader — returns markdown/text view of the page
  try {
    const jina = `https://r.jina.ai/http://${target.host}${target.pathname}${target.search}`;
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
    }
  } catch {
    // continue
  }

  throw new Error(
    "Could not fetch this URL from the browser (CORS or bot protection). Try a Reddit/HN link, a public blog, or use a demo URL.",
  );
}

function looksLikeProxyError(html) {
  return /just a moment|cf-browser-verification|access denied|enable javascript/i.test(
    html.slice(0, 2000),
  );
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
    // skip jina metadata headers
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
