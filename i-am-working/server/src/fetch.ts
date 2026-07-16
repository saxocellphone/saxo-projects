import dns from "node:dns/promises";
import net from "node:net";
import { createDoc, type Block, type Document } from "./types.js";

const MAX_BYTES = 5_000_000;
const TIMEOUT_MS = 25_000;
const UA =
  "Mozilla/5.0 (compatible; IAmWorking/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchPageHtml(url: string): Promise<{ html: string; finalUrl: string; via: string }> {
  const target = new URL(url);
  if (!/^https?:$/.test(target.protocol)) {
    throw new Error("Only http(s) URLs are supported");
  }
  await assertPublicHost(target.hostname);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(target.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`upstream HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error(`response larger than ${MAX_BYTES} bytes`);
    return {
      html: buf.toString("utf8"),
      finalUrl: res.url || target.toString(),
      via: "server-fetch",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function assertPublicHost(host: string): Promise<void> {
  if (!host || host.toLowerCase() === "localhost") {
    throw new Error("refusing non-public host (SSRF protection)");
  }
  let addrs: string[];
  try {
    const results = await dns.lookup(host, { all: true });
    addrs = results.map((r) => r.address);
  } catch {
    throw new Error(`cannot resolve host ${host}`);
  }
  for (const addr of addrs) {
    if (isPrivateIp(addr)) {
      throw new Error("refusing non-public host (SSRF protection)");
    }
  }
}

function isPrivateIp(addr: string): boolean {
  if (net.isIP(addr) === 0) return true;
  // crude private/link-local checks
  if (addr === "127.0.0.1" || addr === "::1") return true;
  if (addr.startsWith("10.") || addr.startsWith("192.168.") || addr.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(addr)) return true;
  if (addr.startsWith("fc") || addr.startsWith("fd") || addr.startsWith("fe80")) return true;
  return false;
}

/** Lightweight HTML → Document (no DOMParser in Node — regex/heuristic extract). */
export function htmlToDoc(html: string, sourceUrl: string): Document {
  const title =
    match1(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)?.replace(/<[^>]+>/g, "").trim() ||
    match1(html, /<title[^>]*>([\s\S]*?)<\/title>/i)?.replace(/<[^>]+>/g, "").trim() ||
    hostname(sourceUrl) ||
    "Untitled";

  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "");

  const article = match1(body, /<article[^>]*>([\s\S]*?)<\/article>/i);
  if (article) body = article;

  const sections: Block[] = [];
  const re = /<(h2|h3|p|blockquote|pre|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) && sections.length < 200) {
    const tag = m[1].toLowerCase();
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (tag === "h2") sections.push({ type: "h2", text });
    else if (tag === "h3") sections.push({ type: "h3", text });
    else if (tag === "blockquote") sections.push({ type: "blockquote", text });
    else if (tag === "pre") sections.push({ type: "code", text });
    else if (tag === "li") {
      const last = sections[sections.length - 1];
      if (last && last.type === "ul") last.items.push(text);
      else sections.push({ type: "ul", items: [text] });
    } else sections.push({ type: "p", text });
  }

  if (!sections.length) {
    const plain = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    for (const chunk of plain.split(/(?<=\.)\s+/).slice(0, 40)) {
      if (chunk.length > 40) sections.push({ type: "p", text: chunk });
    }
  }

  return createDoc({
    sourceUrl,
    title,
    kind: "article",
    site: hostname(sourceUrl),
    sections: sections.length ? sections : [{ type: "p", text: "No readable content found." }],
  });
}

function match1(s: string, re: RegExp): string | undefined {
  const m = s.match(re);
  return m?.[1];
}

function hostname(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}
