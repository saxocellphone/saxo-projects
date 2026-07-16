import { extractReadable, buildDocumentHtml } from "./extract.js";
import { FORMATS, getFormat } from "./formats.js";
import { SAMPLES } from "./samples.js";

const els = {
  sourceHtml: document.getElementById("source-html"),
  sourceUrl: document.getElementById("source-url"),
  titleOverride: document.getElementById("title-override"),
  preview: document.getElementById("preview"),
  previewMeta: document.getElementById("preview-meta"),
  formatList: document.getElementById("format-list"),
  fontScale: document.getElementById("font-scale"),
  fetchStatus: document.getElementById("fetch-status"),
  btnFetch: document.getElementById("btn-fetch"),
  btnCopy: document.getElementById("btn-copy"),
  btnPrint: document.getElementById("btn-print"),
};

/** @type {string} */
let activeFormat = "tech-docs";

function init() {
  renderFormatList();
  wireTabs();
  wireSamples();
  wireActions();

  // Default demo so the product feels alive on first open
  loadSample("article");

  els.sourceHtml.addEventListener("input", scheduleRender);
  els.titleOverride.addEventListener("input", scheduleRender);
  els.fontScale.addEventListener("input", applyScale);
  applyScale();
}

function renderFormatList() {
  els.formatList.innerHTML = "";
  for (const format of FORMATS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "format-option" + (format.id === activeFormat ? " active" : "");
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", format.id === activeFormat ? "true" : "false");
    btn.dataset.format = format.id;
    btn.innerHTML = `<strong>${format.label}</strong><span>${format.description}</span>`;
    btn.addEventListener("click", () => {
      activeFormat = format.id;
      renderFormatList();
      render();
    });
    els.formatList.appendChild(btn);
  }
}

function wireTabs() {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const id = tab.dataset.tab;
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll(".tab-body").forEach((body) => {
        body.classList.toggle("hidden", body.id !== `tab-${id}`);
      });
    });
  });
}

function wireSamples() {
  document.querySelectorAll("[data-sample]").forEach((btn) => {
    btn.addEventListener("click", () => loadSample(btn.dataset.sample));
  });
}

function wireActions() {
  els.btnFetch.addEventListener("click", fetchUrl);
  els.sourceUrl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fetchUrl();
  });
  els.btnCopy.addEventListener("click", copyHtml);
  els.btnPrint.addEventListener("click", () => window.print());
}

function loadSample(key) {
  const sample = SAMPLES[key];
  if (!sample) return;
  els.sourceHtml.value = sample.html;
  els.titleOverride.value = sample.title;
  // switch to paste tab for clarity
  document.querySelector('.tab[data-tab="paste"]')?.click();
  render();
}

let renderTimer = 0;
function scheduleRender() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(render, 120);
}

function applyScale() {
  const scale = Number(els.fontScale.value || 100) / 100;
  els.preview.style.setProperty("--format-scale", String(scale));
}

function render() {
  const format = getFormat(activeFormat);
  const extracted = extractReadable(els.sourceHtml.value);
  const title = (els.titleOverride.value || "").trim() || extracted.title;

  els.preview.className = format.className;
  els.preview.dataset.format = format.id;
  els.preview.innerHTML = buildDocumentHtml(extracted.bodyHtml, {
    title,
    kicker: format.kicker,
  });

  const words = Math.max(1, Math.round(extracted.plainLength / 5));
  els.previewMeta.textContent = `${format.label} · ~${words.toLocaleString()} words`;
}

async function fetchUrl() {
  const url = (els.sourceUrl.value || "").trim();
  setFetchStatus("", "");
  if (!url) {
    setFetchStatus("Enter a URL first.", "error");
    return;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    setFetchStatus("That doesn’t look like a valid URL.", "error");
    return;
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    setFetchStatus("Only http(s) URLs are supported.", "error");
    return;
  }

  els.btnFetch.disabled = true;
  setFetchStatus("Fetching…", "");
  try {
    const res = await fetch(parsed.toString(), { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    els.sourceHtml.value = html;
    els.titleOverride.value = "";
    document.querySelector('.tab[data-tab="paste"]')?.click();
    render();
    setFetchStatus("Loaded into the editor.", "ok");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setFetchStatus(
      `Fetch failed (${msg}). Most sites block browser requests — paste the page HTML instead.`,
      "error",
    );
  } finally {
    els.btnFetch.disabled = false;
  }
}

function setFetchStatus(text, kind) {
  if (!text) {
    els.fetchStatus.hidden = true;
    els.fetchStatus.textContent = "";
    return;
  }
  els.fetchStatus.hidden = false;
  els.fetchStatus.textContent = text;
  els.fetchStatus.className = "status" + (kind ? ` ${kind}` : "");
}

async function copyHtml() {
  const html = els.preview.innerHTML;
  try {
    await navigator.clipboard.writeText(html);
    flashButton(els.btnCopy, "Copied");
  } catch {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = html;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    flashButton(els.btnCopy, "Copied");
  }
}

function flashButton(btn, label) {
  const prev = btn.textContent;
  btn.textContent = label;
  window.setTimeout(() => {
    btn.textContent = prev;
  }, 1200);
}

init();
