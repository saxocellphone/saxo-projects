export type Block =
  | { type: "p" | "h2" | "h3" | "blockquote" | "code"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "html"; safeHtml: string };

export type Item = {
  id: string;
  title: string;
  subtitle?: string;
  preview?: string;
  author?: string;
  body: Block[];
  meta?: Record<string, string>;
};

export type NavItem = { id: string; label: string; url?: string };

export type Document = {
  sourceUrl: string;
  title: string;
  author?: string;
  summary?: string;
  kind: "article" | "thread" | "listing" | "unknown";
  site?: string;
  sections: Block[];
  items?: Item[];
  activeItemId?: string;
  nav?: NavItem[];
  fetchedAt?: string;
};

export type Shell = {
  id: "google-docs" | "tech-docs" | "outlook";
  label: string;
  description: string;
  bestFor?: string[];
};

export function selectItem(doc: Document, itemId: string): Document {
  if (!doc.items?.length) return doc;
  return { ...doc, activeItemId: itemId };
}

export function activeItem(doc: Document): Item | null {
  if (!doc.items?.length) return null;
  const id = doc.activeItemId || doc.items[0].id;
  return doc.items.find((i) => i.id === id) || doc.items[0];
}

export function primaryBlocks(doc: Document): Block[] {
  const item = activeItem(doc);
  if (item?.body?.length) return item.body;
  return doc.sections || [];
}

export function wordCount(doc: Document): number {
  const blocks = primaryBlocks(doc);
  const text = blocks
    .map((b) => ("text" in b ? b.text : "items" in b ? b.items.join(" ") : "") || "")
    .join(" ");
  return Math.max(1, Math.round(text.replace(/\s+/g, " ").trim().length / 5));
}
