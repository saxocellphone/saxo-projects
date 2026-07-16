import { DEMOS } from "./demos.js";
import { isHnUrl, isRedditUrl, loadHn, loadReddit } from "./adapters.js";
import { fetchPageHtml, htmlToDoc } from "./fetch.js";
import type { Document } from "./types.js";

/** Resolve a URL (or demo://) into a Document — implements createDocument. */
export async function loadDocument(rawUrl: string): Promise<Document> {
  const url = (rawUrl || "").trim();
  if (!url) throw Object.assign(new Error("url is required"), { status: 400 });

  if (url in DEMOS || url.startsWith("demo://")) {
    const fn = DEMOS[url];
    if (!fn) throw Object.assign(new Error(`Unknown demo: ${url}`), { status: 400 });
    return fn();
  }

  if (isRedditUrl(url) || /reddit\.com\/.*\.json/i.test(url)) {
    return loadReddit(url);
  }
  if (isHnUrl(url)) return loadHn(url);

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw Object.assign(new Error("That doesn’t look like a valid URL"), { status: 400 });
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw Object.assign(new Error("Only http(s) URLs are supported"), { status: 400 });
  }

  try {
    const { html, finalUrl, via } = await fetchPageHtml(parsed.toString());
    const doc = htmlToDoc(html, finalUrl);
    doc.summary = `Fetched via ${via}`;
    return doc;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw Object.assign(new Error(msg), { status: 502 });
  }
}
