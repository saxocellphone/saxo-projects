import { activeItem, primaryBlocks } from "../model.js";
import { renderBlocks, esc } from "./render.js";

/**
 * MSOutlookit-style: folders + message list + reading pane.
 * @param {import('../model.js').Doc} doc
 * @param {{ onSelectItem?: (id: string) => void }} handlers
 */
export function renderOutlook(doc, handlers) {
  const items =
    doc.items?.length > 0
      ? doc.items
      : [
          {
            id: "solo",
            title: doc.title,
            subtitle: doc.author || doc.site || "",
            preview: doc.summary || "",
            body: doc.sections,
          },
        ];

  const active = activeItem({ ...doc, items }) || items[0];
  const folders =
    doc.nav?.length > 0
      ? doc.nav
      : [
          { id: "inbox", label: "Inbox" },
          { id: "sent", label: "Sent Items" },
          { id: "drafts", label: "Drafts" },
        ];

  const list = items
    .map((it) => {
      const on = it.id === active?.id;
      return `
        <button type="button" class="ol-msg ${on ? "active" : ""}" data-item-id="${esc(it.id)}">
          <div class="ol-msg-from">${esc(it.author || it.subtitle || doc.site || "Unknown")}</div>
          <div class="ol-msg-subject">${esc(it.title)}</div>
          <div class="ol-msg-preview">${esc(it.preview || it.subtitle || "")}</div>
        </button>
      `;
    })
    .join("");

  const bodyBlocks = active ? active.body || primaryBlocks(doc) : [];

  // Store handler via global dispatch — app wires click delegation
  void handlers;

  return `
    <div class="shell shell-outlook" data-shell="outlook">
      <div class="ol-titlebar">
        <span class="ol-app-name">Mail – ${esc(doc.title)}</span>
        <span class="ol-window-controls">— □ ×</span>
      </div>
      <div class="ol-ribbon">
        <span class="ol-ribbon-tab active">Home</span>
        <span class="ol-ribbon-tab">Send / Receive</span>
        <span class="ol-ribbon-tab">Folder</span>
        <span class="ol-ribbon-tab">View</span>
      </div>
      <div class="ol-body">
        <aside class="ol-folders">
          <div class="ol-folder-head">Favorites</div>
          ${folders
            .map(
              (f, i) =>
                `<div class="ol-folder ${i === 0 ? "active" : ""}">${esc(f.label)}</div>`,
            )
            .join("")}
          <div class="ol-folder-head">Folders</div>
          <div class="ol-folder">Inbox <span class="ol-count">${items.length}</span></div>
          <div class="ol-folder">Archive</div>
          <div class="ol-folder">Junk</div>
        </aside>
        <section class="ol-list" aria-label="Messages">
          <div class="ol-list-head">
            <strong>Inbox</strong>
            <span>${items.length} items</span>
          </div>
          <div class="ol-list-items">${list}</div>
        </section>
        <section class="ol-reading" aria-label="Reading pane">
          ${
            active
              ? `
            <header class="ol-reading-head">
              <h1>${esc(active.title)}</h1>
              <div class="ol-reading-meta">
                <span>${esc(active.subtitle || active.author || "")}</span>
                <span>${esc(doc.site || "")}</span>
              </div>
            </header>
            <div class="ol-reading-body">${renderBlocks(bodyBlocks)}</div>
          `
              : `<p class="ol-empty">Select a message</p>`
          }
        </section>
      </div>
      <div class="ol-statusbar">
        <span>${esc(doc.sourceUrl || "")}</span>
        <span>${items.length} items</span>
      </div>
    </div>
  `;
}
