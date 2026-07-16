import { createDoc } from "../model.js";

/**
 * @param {string} url
 */
export function isHnUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname === "news.ycombinator.com";
  } catch {
    return false;
  }
}

/**
 * @param {string} url
 */
export async function loadHn(url) {
  const u = new URL(url);
  const id = u.searchParams.get("id");
  if (u.pathname.includes("item") && id) {
    return loadItem(id, url);
  }
  return loadFrontPage(url);
}

async function loadFrontPage(sourceUrl) {
  // Algolia front-page style: top stories via firebase + parallel fetch is heavy;
  // use HN Algolia search API for front page.
  const res = await fetch("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30");
  if (!res.ok) throw new Error(`HN API HTTP ${res.status}`);
  const data = await res.json();
  const items = (data.hits || []).map((h, i) => ({
    id: String(h.objectID || i),
    title: h.title || h.story_title || "(untitled)",
    subtitle: `${h.points ?? 0} points · ${h.author || "?"} · ${h.num_comments ?? 0} comments`,
    preview: h.url || h.story_text || "",
    author: h.author,
    body: [
      { type: "p", text: h.title || "" },
      h.url ? { type: "p", text: h.url } : { type: "p", text: "Discussion on HN" },
      {
        type: "p",
        text: `${h.points ?? 0} points by ${h.author || "unknown"} · ${h.num_comments ?? 0} comments`,
      },
    ],
    meta: { hnUrl: `https://news.ycombinator.com/item?id=${h.objectID}` },
  }));

  return createDoc({
    sourceUrl,
    title: "Hacker News",
    kind: "listing",
    site: "news.ycombinator.com",
    sections: [],
    items,
    activeItemId: items[0]?.id,
    nav: [
      { id: "top", label: "Top" },
      { id: "new", label: "New" },
      { id: "ask", label: "Ask" },
    ],
  });
}

async function loadItem(id, sourceUrl) {
  const res = await fetch(`https://hn.algolia.com/api/v1/items/${id}`);
  if (!res.ok) throw new Error(`HN item HTTP ${res.status}`);
  const item = await res.json();

  /** @type {import('../model.js').Block[]} */
  const body = [];
  if (item.url) body.push({ type: "p", text: item.url });
  if (item.text) {
    // HN text is HTML
    const tmp = document.createElement("div");
    tmp.innerHTML = item.text;
    const plain = tmp.textContent || "";
    for (const p of plain.split(/\n{2,}/)) {
      if (p.trim()) body.push({ type: "p", text: p.trim() });
    }
  }
  const comments = [];
  walkComments(item.children || [], comments);
  if (comments.length) {
    body.push({ type: "h2", text: "Comments" });
    for (const c of comments.slice(0, 50)) {
      body.push({ type: "blockquote", text: `${c.author}: ${c.text}` });
    }
  }

  const row = {
    id: String(item.id),
    title: item.title || "HN item",
    subtitle: `${item.points ?? 0} points · ${item.author || "?"}`,
    author: item.author,
    body,
  };

  return createDoc({
    sourceUrl,
    title: item.title || "HN item",
    author: item.author,
    kind: "thread",
    site: "news.ycombinator.com",
    sections: body,
    items: [row],
    activeItemId: row.id,
  });
}

function walkComments(children, out) {
  for (const c of children || []) {
    if (c.type && c.type !== "comment") continue;
    if (c.text) {
      const tmp = document.createElement("div");
      tmp.innerHTML = c.text;
      out.push({ author: c.author || "?", text: (tmp.textContent || "").trim() });
    }
    if (c.children?.length) walkComments(c.children, out);
  }
}
