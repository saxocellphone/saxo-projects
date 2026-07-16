import { createDoc, type Block, type Document, type Item } from "./types.js";

export function isRedditUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /(^|\.)reddit\.com$/i.test(u.hostname) || u.hostname === "redd.it";
  } catch {
    return false;
  }
}

export function isHnUrl(url: string): boolean {
  try {
    return new URL(url).hostname === "news.ycombinator.com";
  } catch {
    return false;
  }
}

export async function loadReddit(url: string): Promise<Document> {
  const jsonUrl = toRedditJsonUrl(url);
  const res = await fetch(jsonUrl, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Reddit API HTTP ${res.status}`);
  const data = await res.json();

  if (Array.isArray(data) && data[0]?.data?.children) {
    return threadFromReddit(data, url);
  }
  if (data?.data?.children) {
    return listingFromReddit(data, url);
  }
  throw new Error("Unrecognized Reddit JSON shape");
}

function toRedditJsonUrl(url: string): string {
  const u = new URL(url);
  u.hash = "";
  let path = u.pathname.replace(/\/$/, "");
  if (!path.endsWith(".json")) path += ".json";
  u.pathname = path;
  u.search = "?raw_json=1";
  if (u.hostname === "reddit.com") u.hostname = "www.reddit.com";
  return u.toString();
}

function listingFromReddit(data: any, sourceUrl: string): Document {
  const children = data.data.children.filter((c: any) => c.kind === "t3");
  const items: Item[] = children.map((c: any, i: number) => {
    const p = c.data;
    return {
      id: p.id || String(i),
      title: p.title || "(no title)",
      subtitle: `r/${p.subreddit} · u/${p.author} · ${p.score ?? 0} points`,
      preview: (p.selftext || p.title || "").slice(0, 140),
      author: p.author,
      body: postBody(p),
    };
  });
  const sub = children[0]?.data?.subreddit || "reddit";
  return createDoc({
    sourceUrl,
    title: `r/${sub}`,
    kind: "listing",
    site: "reddit.com",
    sections: [],
    items,
    activeItemId: items[0]?.id,
    nav: [
      { id: "hot", label: "Hot" },
      { id: "new", label: "New" },
      { id: "top", label: "Top" },
    ],
  });
}

function threadFromReddit(data: any, sourceUrl: string): Document {
  const post = data[0].data.children.find((c: any) => c.kind === "t3")?.data;
  if (!post) throw new Error("No post in Reddit thread");
  const body = postBody(post);
  const comments = flattenComments(data[1]?.data?.children || []);
  if (comments.length) {
    body.push({ type: "h2", text: "Comments" });
    for (const c of comments.slice(0, 40)) {
      body.push({ type: "blockquote", text: `u/${c.author} · ${c.score} points\n${c.body}` });
    }
  }
  const item: Item = {
    id: post.id,
    title: post.title,
    subtitle: `r/${post.subreddit} · u/${post.author}`,
    author: post.author,
    body,
  };
  return createDoc({
    sourceUrl,
    title: post.title,
    author: post.author,
    kind: "thread",
    site: "reddit.com",
    sections: body,
    items: [item],
    activeItemId: item.id,
    nav: [{ id: post.subreddit, label: `r/${post.subreddit}` }],
  });
}

function postBody(p: any): Block[] {
  const body: Block[] = [];
  if (p.selftext) {
    for (const para of p.selftext.split(/\n{2,}/)) {
      const t = para.trim();
      if (!t) continue;
      body.push({ type: "p", text: t.replace(/\n/g, " ") });
    }
  } else if (p.url && !p.is_self) {
    body.push({ type: "p", text: `Link post: ${p.url}` });
  } else {
    body.push({ type: "p", text: "(no text body)" });
  }
  return body;
}

function flattenComments(children: any[], depth = 0): { author: string; score: number; body: string }[] {
  const out: { author: string; score: number; body: string }[] = [];
  for (const c of children) {
    if (c.kind !== "t1" || !c.data) continue;
    const d = c.data;
    if (d.body) out.push({ author: d.author || "[deleted]", score: d.score ?? 0, body: d.body });
    const replies = d.replies?.data?.children;
    if (Array.isArray(replies)) out.push(...flattenComments(replies, depth + 1));
  }
  return out;
}

export async function loadHn(url: string): Promise<Document> {
  const u = new URL(url);
  const id = u.searchParams.get("id");
  if (u.pathname.includes("item") && id) return loadHnItem(id, url);
  return loadHnFront(url);
}

async function loadHnFront(sourceUrl: string): Promise<Document> {
  const res = await fetch("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30");
  if (!res.ok) throw new Error(`HN API HTTP ${res.status}`);
  const data = await res.json();
  const items: Item[] = (data.hits || []).map((h: any, i: number) => ({
    id: String(h.objectID || i),
    title: h.title || h.story_title || "(untitled)",
    subtitle: `${h.points ?? 0} points · ${h.author || "?"} · ${h.num_comments ?? 0} comments`,
    preview: h.url || "",
    author: h.author,
    body: [
      { type: "p", text: h.title || "" },
      h.url ? { type: "p", text: h.url } : { type: "p", text: "Discussion on HN" },
    ],
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
    ],
  });
}

async function loadHnItem(id: string, sourceUrl: string): Promise<Document> {
  const res = await fetch(`https://hn.algolia.com/api/v1/items/${id}`);
  if (!res.ok) throw new Error(`HN item HTTP ${res.status}`);
  const item = await res.json();
  const body: Block[] = [];
  if (item.url) body.push({ type: "p", text: item.url });
  if (item.text) {
    const plain = String(item.text).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (plain) body.push({ type: "p", text: plain });
  }
  const row: Item = {
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
