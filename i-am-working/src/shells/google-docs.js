import { primaryBlocks } from "../model.js";
import { renderBlocks, esc } from "./render.js";

/**
 * @param {import('../model.js').Doc} doc
 * @param {{ onSelectItem?: (id: string) => void }} _handlers
 */
export function renderGoogleDocs(doc, _handlers) {
  const blocks = primaryBlocks(doc);
  const item = doc.items?.find((i) => i.id === doc.activeItemId);
  const title = item?.title || doc.title;

  return `
    <div class="shell shell-gdocs" data-shell="google-docs">
      <div class="gdocs-menubar">
        <div class="gdocs-file-icon" aria-hidden="true">W</div>
        <div class="gdocs-menu-meta">
          <div class="gdocs-doc-title">${esc(title)}</div>
          <div class="gdocs-menu-row">
            <span>File</span><span>Edit</span><span>View</span><span>Insert</span><span>Format</span><span>Tools</span>
          </div>
        </div>
        <div class="gdocs-share">Share</div>
      </div>
      <div class="gdocs-toolbar">
        <span>Normal text</span>
        <span class="sep"></span>
        <span><b>B</b></span><span><i>I</i></span><span><u>U</u></span>
        <span class="sep"></span>
        <span>🔗</span><span>🖼</span>
      </div>
      <div class="gdocs-page-wrap">
        <article class="gdocs-page">
          <h1 class="gdocs-h1">${esc(title)}</h1>
          ${doc.author ? `<p class="gdocs-byline">${esc(doc.author)}</p>` : ""}
          ${renderBlocks(blocks)}
        </article>
      </div>
    </div>
  `;
}
