/**
 * Shared block rendering for shells.
 * @param {import('../model.js').Block[]} blocks
 * @returns {string}
 */
export function renderBlocks(blocks) {
  return (blocks || []).map(renderBlock).join("\n");
}

/** @param {import('../model.js').Block} b */
function renderBlock(b) {
  switch (b.type) {
    case "h2":
      return `<h2>${esc(b.text)}</h2>`;
    case "h3":
      return `<h3>${esc(b.text)}</h3>`;
    case "blockquote":
      return `<blockquote>${esc(b.text).replaceAll("\n", "<br>")}</blockquote>`;
    case "code":
      return `<pre><code>${esc(b.text)}</code></pre>`;
    case "ul":
      return `<ul>${(b.items || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
    case "ol":
      return `<ol>${(b.items || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ol>`;
    case "html":
      return `<div class="safe-html">${b.safeHtml || ""}</div>`;
    case "p":
    default:
      return `<p>${esc(b.text)}</p>`;
  }
}

export function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
