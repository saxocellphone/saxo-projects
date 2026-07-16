/**
 * Shell-agnostic document model.
 * Every ingest adapter produces a Doc; every shell renders a Doc.
 */

/**
 * @typedef {{ id: string, label: string, url?: string }} NavItem
 * @typedef {{
 *   type: 'p'|'h2'|'h3'|'blockquote'|'code'|'ul'|'ol'|'html',
 *   text?: string,
 *   items?: string[],
 *   safeHtml?: string
 * }} Block
 * @typedef {{
 *   id: string,
 *   title: string,
 *   subtitle?: string,
 *   preview?: string,
 *   author?: string,
 *   body: Block[],
 *   meta?: Record<string,string>
 * }} Item
 * @typedef {{
 *   sourceUrl: string,
 *   title: string,
 *   author?: string,
 *   summary?: string,
 *   kind: 'article'|'thread'|'listing'|'unknown',
 *   site?: string,
 *   sections: Block[],
 *   items?: Item[],
 *   activeItemId?: string,
 *   nav?: NavItem[],
 *   fetchedAt?: string
 * }} Doc
 */

/**
 * @param {Partial<Doc>} partial
 * @returns {Doc}
 */
export function createDoc(partial) {
  return {
    sourceUrl: partial.sourceUrl || "",
    title: partial.title || "Untitled",
    author: partial.author,
    summary: partial.summary,
    kind: partial.kind || "unknown",
    site: partial.site,
    sections: partial.sections || [],
    items: partial.items,
    activeItemId: partial.activeItemId,
    nav: partial.nav,
    fetchedAt: partial.fetchedAt || new Date().toISOString(),
  };
}

/** @param {Doc} doc @param {string} itemId */
export function selectItem(doc, itemId) {
  if (!doc.items?.length) return doc;
  return { ...doc, activeItemId: itemId };
}

/** @param {Doc} doc */
export function activeItem(doc) {
  if (!doc.items?.length) return null;
  const id = doc.activeItemId || doc.items[0].id;
  return doc.items.find((i) => i.id === id) || doc.items[0];
}

/** Flatten article sections + active item body for simple readers */
export function primaryBlocks(doc) {
  const item = activeItem(doc);
  if (item?.body?.length) return item.body;
  return doc.sections || [];
}

export function wordCount(doc) {
  const blocks = primaryBlocks(doc);
  const text = blocks
    .map((b) => b.text || (b.items || []).join(" ") || "")
    .join(" ");
  return Math.max(1, Math.round(text.replace(/\s+/g, " ").trim().length / 5));
}
