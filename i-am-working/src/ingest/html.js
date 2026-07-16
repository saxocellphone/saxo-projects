import { createDoc } from "../model.js";

const NOISE = new Set([
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
  "template",
]);

/**
 * @param {string} html
 * @param {string} sourceUrl
 */
export function htmlToDoc(html, sourceUrl) {
  const doc = new DOMParser().parseFromString(wrap(html), "text/html");
  doc.querySelectorAll([...NOISE].join(",")).forEach((el) => el.remove());

  const title =
    text(doc.querySelector("h1")) ||
    text(doc.querySelector("title")) ||
    text(doc.querySelector("h2")) ||
    hostTitle(sourceUrl);

  const root =
    doc.querySelector("article") ||
    doc.querySelector("main") ||
    doc.querySelector('[role="main"]') ||
    pickContainer(doc.body) ||
    doc.body;

  const sections = blocksFrom(root);
  // drop leading h1 matching title
  if (sections[0]?.type === "h2" && sections[0].text === title) {
    /* keep */
  }

  return createDoc({
    sourceUrl,
    title,
    kind: "article",
    site: hostname(sourceUrl),
    sections: sections.length ? sections : [{ type: "p", text: text(doc.body) || "No readable content found." }],
  });
}

function wrap(html) {
  if (/<html[\s>]/i.test(html) || /<body[\s>]/i.test(html)) return html;
  return `<!DOCTYPE html><html><body>${html}</body></html>`;
}

function pickContainer(body) {
  if (!body) return null;
  let best = null;
  let bestScore = 0;
  for (const el of body.querySelectorAll("article, main, section, div")) {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (t.length < 120) continue;
    const score = t.length + el.querySelectorAll("p").length * 50 - el.querySelectorAll("a").length * 10;
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

/**
 * @param {Element} root
 * @returns {import('../model.js').Block[]}
 */
function blocksFrom(root) {
  /** @type {import('../model.js').Block[]} */
  const out = [];
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = /** @type {HTMLElement} */ (node);
    const tag = el.tagName.toLowerCase();
    if (NOISE.has(tag)) return;

    if (tag === "h1" || tag === "h2") {
      const t = text(el);
      if (t) out.push({ type: "h2", text: t });
      return;
    }
    if (tag === "h3" || tag === "h4") {
      const t = text(el);
      if (t) out.push({ type: "h3", text: t });
      return;
    }
    if (tag === "p") {
      const t = text(el);
      if (t) out.push({ type: "p", text: t });
      return;
    }
    if (tag === "blockquote") {
      const t = text(el);
      if (t) out.push({ type: "blockquote", text: t });
      return;
    }
    if (tag === "pre") {
      const t = el.textContent || "";
      if (t.trim()) out.push({ type: "code", text: t.replace(/\n$/, "") });
      return;
    }
    if (tag === "ul" || tag === "ol") {
      const items = [...el.querySelectorAll(":scope > li")].map((li) => text(li)).filter(Boolean);
      if (items.length) out.push({ type: tag, items });
      return;
    }
    if (tag === "li" || tag === "a" || tag === "span" || tag === "strong" || tag === "em") {
      return;
    }
    for (const child of el.childNodes) walk(child);
  };

  for (const child of root.childNodes) walk(child);

  // If structure was flat with only divs of text
  if (!out.length) {
    const chunks = (root.textContent || "")
      .split(/\n{2,}/)
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter((s) => s.length > 40);
    for (const c of chunks.slice(0, 40)) out.push({ type: "p", text: c });
  }
  return out;
}

function text(el) {
  return el?.textContent?.replace(/\s+/g, " ").trim() || "";
}

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function hostTitle(url) {
  return hostname(url) || "Untitled";
}
