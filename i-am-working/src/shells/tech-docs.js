import { primaryBlocks } from "../model.js";
import { renderBlocks, esc } from "./render.js";

/**
 * @param {import('../model.js').Doc} doc
 */
export function renderTechDocs(doc) {
  const blocks = primaryBlocks(doc);
  const toc = blocks
    .filter((b) => b.type === "h2" || b.type === "h3")
    .map((b, i) => ({
      id: `sec-${i}`,
      level: b.type === "h2" ? 2 : 3,
      text: b.text || "",
    }));

  let headingIdx = 0;
  const body = blocks
    .map((b) => {
      if (b.type === "h2" || b.type === "h3") {
        const id = `sec-${headingIdx++}`;
        const tag = b.type === "h2" ? "h2" : "h3";
        return `<${tag} id="${id}">${esc(b.text)}</${tag}>`;
      }
      return renderBlocks([b]);
    })
    .join("\n");

  const item = doc.items?.find((i) => i.id === doc.activeItemId);
  const title = item?.title || doc.title;

  return `
    <div class="shell shell-tech" data-shell="tech-docs">
      <aside class="tech-sidebar">
        <div class="tech-brand">${esc(doc.site || "docs")}</div>
        <div class="tech-search">Search docs</div>
        <nav class="tech-nav">
          ${
            toc.length
              ? toc
                  .map(
                    (t) =>
                      `<a class="tech-nav-item level-${t.level}" href="#${t.id}">${esc(t.text)}</a>`,
                  )
                  .join("")
              : `<a class="tech-nav-item level-2" href="#">${esc(title)}</a>`
          }
        </nav>
      </aside>
      <main class="tech-main">
        <header class="tech-header">
          <p class="tech-kicker">Documentation</p>
          <h1>${esc(title)}</h1>
          ${doc.summary ? `<p class="tech-summary">${esc(doc.summary)}</p>` : ""}
        </header>
        <div class="tech-body">${body}</div>
      </main>
    </div>
  `;
}
