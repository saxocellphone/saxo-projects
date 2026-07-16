/**
 * Extract a readable title + HTML body from arbitrary page HTML or plain text.
 */

const NOISE_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "svg",
  "iframe",
  "nav",
  "footer",
  "header",
  "aside",
  "form",
  "button",
  "input",
  "select",
  "textarea",
  "template",
]);

const CONTENT_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "hr",
  "br",
  "a",
  "em",
  "strong",
  "b",
  "i",
  "u",
  "s",
  "mark",
  "sup",
  "sub",
  "span",
  "div",
  "section",
  "article",
  "main",
  "figure",
  "figcaption",
  "img",
]);

/**
 * @param {string} input
 * @returns {{ title: string, bodyHtml: string, plainLength: number }}
 */
export function extractReadable(input) {
  const raw = (input || "").trim();
  if (!raw) {
    return { title: "Untitled", bodyHtml: "<p><em>Paste or fetch content to begin.</em></p>", plainLength: 0 };
  }

  // Plain text (no tags) → paragraphs
  if (!/<[a-z][\s\S]*>/i.test(raw)) {
    const paragraphs = raw
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
      .join("\n");
    const firstLine = raw.split("\n").find((l) => l.trim()) || "Untitled";
    return {
      title: firstLine.slice(0, 120),
      bodyHtml: paragraphs || `<p>${escapeHtml(raw)}</p>`,
      plainLength: raw.length,
    };
  }

  const doc = new DOMParser().parseFromString(wrapIfFragment(raw), "text/html");
  stripNoise(doc);

  const title =
    textContent(doc.querySelector("h1")) ||
    textContent(doc.querySelector("title")) ||
    textContent(doc.querySelector("h2")) ||
    "Untitled";

  const root =
    doc.querySelector("article") ||
    doc.querySelector("main") ||
    doc.querySelector('[role="main"]') ||
    pickBestContainer(doc.body) ||
    doc.body;

  const cleaned = sanitizeNode(root);
  let bodyHtml = cleaned.innerHTML.trim();
  if (!bodyHtml) {
    bodyHtml = `<p>${escapeHtml(doc.body.textContent || raw)}</p>`;
  }

  // Drop a leading h1 that duplicates the title
  bodyHtml = bodyHtml.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, "");

  const plainLength = (cleaned.textContent || "").replace(/\s+/g, " ").trim().length;
  return { title: title.trim() || "Untitled", bodyHtml, plainLength };
}

/**
 * @param {string} html
 * @param {{ title: string, kicker: string }} meta
 */
export function buildDocumentHtml(html, meta) {
  return [
    `<header class="doc-header">`,
    `  <p class="doc-kicker">${escapeHtml(meta.kicker)}</p>`,
    `  <h1 class="doc-title">${escapeHtml(meta.title)}</h1>`,
    `</header>`,
    `<div class="doc-body">`,
    html,
    `</div>`,
  ].join("\n");
}

function wrapIfFragment(html) {
  if (/<html[\s>]/i.test(html) || /<body[\s>]/i.test(html)) return html;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
}

function stripNoise(doc) {
  doc.querySelectorAll([...NOISE_TAGS].join(",")).forEach((el) => el.remove());
  doc.querySelectorAll("[hidden], [aria-hidden='true']").forEach((el) => el.remove());
}

/**
 * @param {HTMLElement | null} body
 * @returns {HTMLElement | null}
 */
function pickBestContainer(body) {
  if (!body) return null;
  const candidates = body.querySelectorAll("article, main, section, div");
  let best = null;
  let bestScore = 0;
  for (const el of candidates) {
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (text.length < 80) continue;
    const links = el.querySelectorAll("a").length;
    const paras = el.querySelectorAll("p, li").length;
    const score = text.length + paras * 40 - links * 15;
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

/**
 * @param {Node} node
 * @returns {HTMLElement}
 */
function sanitizeNode(node) {
  const out = document.createElement("div");
  for (const child of Array.from(node.childNodes)) {
    const cleaned = cleanNode(child);
    if (cleaned) out.appendChild(cleaned);
  }
  return out;
}

/**
 * @param {Node} node
 * @returns {Node | null}
 */
function cleanNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent || "";
    if (!t.trim()) return document.createTextNode(" ");
    return document.createTextNode(t);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  /** @type {HTMLElement} */
  const el = /** @type {HTMLElement} */ (node);
  const tag = el.tagName.toLowerCase();

  if (NOISE_TAGS.has(tag)) return null;

  if (tag === "br") return document.createElement("br");
  if (tag === "hr") return document.createElement("hr");
  if (tag === "img") {
    const src = el.getAttribute("src");
    if (!src || src.startsWith("javascript:")) return null;
    const img = document.createElement("img");
    img.setAttribute("src", src);
    const alt = el.getAttribute("alt");
    if (alt) img.setAttribute("alt", alt);
    img.setAttribute("loading", "lazy");
    return img;
  }

  const allowed = CONTENT_TAGS.has(tag) ? tag : "div";
  // Avoid wrapping everything in nested div noise when possible
  if (allowed === "div" || allowed === "section" || allowed === "span") {
    const frag = document.createDocumentFragment();
    let hasBlock = false;
    for (const child of Array.from(el.childNodes)) {
      const c = cleanNode(child);
      if (c) {
        if (c.nodeType === Node.ELEMENT_NODE) {
          const ct = /** @type {HTMLElement} */ (c).tagName;
          if (!["SPAN", "A", "EM", "STRONG", "B", "I", "CODE", "BR"].includes(ct)) hasBlock = true;
        }
        frag.appendChild(c);
      }
    }
    if (!hasBlock && frag.childNodes.length) {
      // Inline-ish content under a div → keep as paragraph if substantial
      const tmp = document.createElement("div");
      tmp.appendChild(frag.cloneNode(true));
      const text = (tmp.textContent || "").trim();
      if (text.length > 0 && el.children.length === 0) {
        const p = document.createElement("p");
        p.appendChild(frag);
        return p;
      }
    }
    const wrapper = document.createElement(allowed === "span" ? "span" : "div");
    wrapper.appendChild(frag);
    // unwrap single useless wrapper later via innerHTML path — keep simple
    if (wrapper.childNodes.length === 1 && wrapper.firstChild?.nodeType === Node.ELEMENT_NODE) {
      return wrapper.firstChild;
    }
    return wrapper.childNodes.length ? wrapper : null;
  }

  const clone = document.createElement(allowed);
  if (allowed === "a") {
    const href = el.getAttribute("href");
    if (href && !href.trim().toLowerCase().startsWith("javascript:")) {
      clone.setAttribute("href", href);
      clone.setAttribute("target", "_blank");
      clone.setAttribute("rel", "noopener noreferrer");
    }
  }

  for (const child of Array.from(el.childNodes)) {
    const c = cleanNode(child);
    if (c) clone.appendChild(c);
  }
  return clone.childNodes.length || ["td", "th", "li"].includes(allowed) ? clone : null;
}

function textContent(el) {
  return el?.textContent?.replace(/\s+/g, " ").trim() || "";
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
