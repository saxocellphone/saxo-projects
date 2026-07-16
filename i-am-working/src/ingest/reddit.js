import { createDoc } from "../model.js";

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isRedditUrl(url) {
  try {
    const u = new URL(url);
    return /(^|\.)reddit\.com$/i.test(u.hostname) || u.hostname === "redd.it";
  } catch {
    return false;
  }
}

/**
 * Fetch Reddit listing or comments via public JSON.
 * @param {string} url
 */
export async function loadReddit(url) {
  const jsonUrl = toJsonUrl(url);
  const res = await fetch(jsonUrl, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Reddit API HTTP ${res.status}`);
  const data = await res.json();

  // comments page: [listing, comments]
  if (Array.isArray(data) && data[0]?.data?.children) {
    return threadFromListing(data, url);
  }
  // subreddit / listing
  if (data?.data?.children) {
    return listingFrom(data, url);
  }
  throw new Error("Unrecognized Reddit JSON shape");
}

function toJsonUrl(url) {
  const u = new URL(url);
  // strip tracking
  u.hash = "";
  let path = u.pathname.replace(/\/$/, "");
  if (!path.endsWith(".json")) path += ".json";
  u.pathname = path;
  u.search = u.search && !u.search.includes("raw_json") ? `${u.search}&raw_json=1` : "?raw_json=1";
  // old.reddit often friendlier; www works too
  if (u.hostname === "www.reddit.com" || u.hostname === "reddit.com") {
    u.hostname = "www.reddit.com";
  }
  return u.toString();
}

function listingFrom(data, sourceUrl) {
  const children = data.data.children.filter((c) => c.kind === "t3");
  /** @type {import('../model.js').Item[]} */
  const items = children.map((c, i) => {
    const p = c.data;
    const body = postBody(p);
    return {
      id: p.id || String(i),
      title: p.title || "(no title)",
      subtitle: `r/${p.subreddit} · u/${p.author} · ${p.score ?? 0} points`,
      preview: (p.selftext || p.title || "").slice(0, 140),
      author: p.author,
      body,
      meta: { subreddit: p.subreddit, permalink: p.permalink },
    };
  });

  const sub = children[0]?.data?.subreddit || pathSub(sourceUrl) || "reddit";
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

function threadFromListing(data, sourceUrl) {
  const post = data[0].data.children.find((c) => c.kind === "t3")?.data;
  if (!post) throw new Error("No post in Reddit thread");

  const comments = flattenComments(data[1]?.data?.children || []);
  const body = postBody(post);
  if (comments.length) {
    body.push({ type: "h2", text: "Comments" });
    for (const c of comments.slice(0, 40)) {
      body.push({
        type: "blockquote",
        text: `u/${c.author} · ${c.score} points\n${c.body}`,
      });
    }
  }

  const item = {
    id: post.id,
    title: post.title,
    subtitle: `r/${post.subreddit} · u/${post.author}`,
    preview: (post.selftext || "").slice(0, 140),
    author: post.author,
    body,
    meta: { subreddit: post.subreddit },
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

function postBody(p) {
  /** @type {import('../model.js').Block[]} */
  const body = [];
  if (p.selftext) {
    for (const para of p.selftext.split(/\n{2,}/)) {
      const t = para.trim();
      if (!t) continue;
      if (t.startsWith("    ") || t.startsWith("```")) body.push({ type: "code", text: t.replace(/```/g, "") });
      else body.push({ type: "p", text: t.replace(/\n/g, " ") });
    }
  } else if (p.url && !p.is_self) {
    body.push({ type: "p", text: `Link post: ${p.url}` });
  } else {
    body.push({ type: "p", text: "(no text body)" });
  }
  return body;
}

function flattenComments(children, depth = 0) {
  const out = [];
  for (const c of children) {
    if (c.kind !== "t1" || !c.data) continue;
    const d = c.data;
    if (d.body) {
      out.push({
        author: d.author || "[deleted]",
        score: d.score ?? 0,
        body: d.body,
        depth,
      });
    }
    const replies = d.replies?.data?.children;
    if (Array.isArray(replies)) out.push(...flattenComments(replies, depth + 1));
  }
  return out;
}

function pathSub(url) {
  const m = url.match(/reddit\.com\/r\/([^/]+)/i);
  return m?.[1];
}
