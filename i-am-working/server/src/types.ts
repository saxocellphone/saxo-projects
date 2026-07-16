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
};

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
  nav?: { id: string; label: string; url?: string }[];
  fetchedAt?: string;
};

export function createDoc(partial: Partial<Document> & Pick<Document, "sourceUrl" | "title">): Document {
  return {
    sourceUrl: partial.sourceUrl,
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
