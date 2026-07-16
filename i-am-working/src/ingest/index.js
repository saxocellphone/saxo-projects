import { fetchPageHtml } from "./fetch.js";
import { htmlToDoc } from "./html.js";
import { isRedditUrl, loadReddit } from "./reddit.js";
import { isHnUrl, loadHn } from "./hn.js";
import { isDemoUrl, loadDemo } from "./demos.js";

/**
 * Load any URL (or demo://) into a Doc.
 * @param {string} rawUrl
 * @returns {Promise<import('../model.js').Doc>}
 */
export async function loadUrl(rawUrl) {
  const url = (rawUrl || "").trim();
  if (!url) throw new Error("Enter a URL");

  if (isDemoUrl(url)) return loadDemo(url);

  // Reddit public JSON (page or …/.json)
  if (isRedditUrl(url) || /reddit\.com\/.*\.json/i.test(url)) {
    return loadReddit(url);
  }

  if (isHnUrl(url)) return loadHn(url);

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("That doesn’t look like a valid URL");
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("Only http(s) URLs are supported");
  }

  const { html, finalUrl, via } = await fetchPageHtml(parsed.toString());
  const doc = htmlToDoc(html, finalUrl);
  doc.summary = `Fetched via ${via}`;
  return doc;
}

export { DEMO_LINKS } from "./demos.js";
