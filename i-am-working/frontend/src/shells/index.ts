import type { Document, Shell } from "../model";
import { activeItem, primaryBlocks } from "../model";
import { esc, renderBlocks } from "./render";

export const DEFAULT_SHELLS: Shell[] = [
  {
    id: "google-docs",
    label: "Google Docs",
    description: "Clean document page",
    bestFor: ["article"],
  },
  {
    id: "tech-docs",
    label: "Technical docs",
    description: "Sidebar TOC + reference page",
    bestFor: ["article", "thread"],
  },
  {
    id: "outlook",
    label: "Outlook",
    description: "Folders, inbox, reading pane",
    bestFor: ["listing", "thread"],
  },
];

export function defaultShellFor(doc: Document): Shell["id"] {
  if (doc.kind === "listing" || doc.kind === "thread") return "outlook";
  return "google-docs";
}

export function renderShell(shellId: string, doc: Document): string {
  switch (shellId) {
    case "tech-docs":
      return renderTechDocs(doc);
    case "outlook":
      return renderOutlook(doc);
    case "google-docs":
    default:
      return renderGoogleDocs(doc);
  }
}

function renderGoogleDocs(doc: Document): string {
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

function renderTechDocs(doc: Document): string {
  const blocks = primaryBlocks(doc);
  const toc = blocks
    .filter((b) => b.type === "h2" || b.type === "h3")
    .map((b, i) => ({
      id: `sec-${i}`,
      level: b.type === "h2" ? 2 : 3,
      text: "text" in b ? b.text : "",
    }));

  let headingIdx = 0;
  const body = blocks
    .map((b) => {
      if (b.type === "h2" || b.type === "h3") {
        const id = `sec-${headingIdx++}`;
        const tag = b.type === "h2" ? "h2" : "h3";
        return `<${tag} id="${id}">${esc("text" in b ? b.text : "")}</${tag}>`;
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

function renderOutlook(doc: Document): string {
  const items =
    doc.items && doc.items.length > 0
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
    doc.nav && doc.nav.length > 0
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
