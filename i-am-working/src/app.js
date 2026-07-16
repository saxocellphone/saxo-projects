import { loadUrl, DEMO_LINKS } from "./ingest/index.js";
import { selectItem, wordCount } from "./model.js";
import { SHELLS, defaultShellFor, renderShell } from "./shells/index.js";

const CHROME_STORAGE_KEY = "iamworking.chromeHidden";

/**
 * @typedef {{
 *   url: string,
 *   shellId: string,
 *   doc: import('./model.js').Doc | null,
 *   status: 'idle'|'loading'|'ready'|'error',
 *   error: string,
 *   autoShell: boolean,
 *   chromeHidden: boolean
 * }} State
 */

export function createApp(root) {
  /** @type {State} */
  let state = {
    url: "",
    shellId: "google-docs",
    doc: null,
    status: "idle",
    error: "",
    autoShell: true,
    chromeHidden: false,
  };

  const ui = {
    urlInput: root.querySelector("#url-input"),
    openBtn: root.querySelector("#btn-open"),
    shellSelect: root.querySelector("#shell-select"),
    status: root.querySelector("#status"),
    stage: root.querySelector("#stage"),
    openOriginal: root.querySelector("#btn-original"),
    demos: root.querySelector("#demo-links"),
    hideChrome: root.querySelector("#btn-hide-chrome"),
    showChrome: root.querySelector("#btn-show-chrome"),
  };

  // Populate shell select
  ui.shellSelect.innerHTML = SHELLS.map(
    (s) => `<option value="${s.id}">${s.label}</option>`,
  ).join("");

  // Demo chips
  ui.demos.innerHTML = DEMO_LINKS.map(
    (d) =>
      `<button type="button" class="demo-chip" data-url="${escapeAttr(d.url)}">${escapeHtml(d.label)}</button>`,
  ).join("");

  ui.demos.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-url]");
    if (!btn) return;
    ui.urlInput.value = btn.getAttribute("data-url") || "";
    state.autoShell = true;
    openUrl();
  });

  ui.openBtn.addEventListener("click", () => {
    state.autoShell = true;
    openUrl();
  });
  ui.urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      state.autoShell = true;
      openUrl();
    }
  });
  ui.shellSelect.addEventListener("change", () => {
    state.shellId = ui.shellSelect.value;
    state.autoShell = false;
    paint();
    syncQuery();
  });
  ui.openOriginal.addEventListener("click", () => {
    if (state.doc?.sourceUrl && !state.doc.sourceUrl.startsWith("demo:")) {
      window.open(state.doc.sourceUrl, "_blank", "noopener,noreferrer");
    }
  });

  ui.hideChrome?.addEventListener("click", () => setChromeHidden(true));
  ui.showChrome?.addEventListener("click", () => setChromeHidden(false));

  // Toggle chrome: "b" (bar), except when typing in inputs
  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target instanceof HTMLElement ? e.target.tagName : "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable) {
      return;
    }
    if (e.key === "b" || e.key === "B") {
      e.preventDefault();
      setChromeHidden(!state.chromeHidden);
    }
  });

  // Outlook message clicks (delegation)
  ui.stage.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-item-id]");
    if (!btn || !state.doc) return;
    const id = btn.getAttribute("data-item-id");
    if (!id) return;
    state.doc = selectItem(state.doc, id);
    paint();
  });

  // Deep link
  const params = new URLSearchParams(location.search);
  const qUrl = params.get("url");
  const qShell = params.get("shell");
  const qChrome = params.get("chrome");
  if (qShell && SHELLS.some((s) => s.id === qShell)) {
    state.shellId = qShell;
    state.autoShell = false;
    ui.shellSelect.value = qShell;
  }
  // chrome=0|hidden|off  or  chrome=1|shown|on
  if (qChrome != null) {
    const hide =
      qChrome === "0" ||
      qChrome === "hidden" ||
      qChrome === "off" ||
      qChrome === "false";
    setChromeHidden(hide, { persist: false, sync: false });
  } else {
    try {
      if (localStorage.getItem(CHROME_STORAGE_KEY) === "1") {
        setChromeHidden(true, { persist: false, sync: false });
      }
    } catch {
      /* private mode */
    }
  }
  applyChromeVisibility();

  if (qUrl) {
    ui.urlInput.value = qUrl;
    openUrl();
  } else {
    // Start with demo article so the product feels alive
    ui.urlInput.value = "demo://article";
    openUrl();
  }

  async function openUrl() {
    const url = ui.urlInput.value.trim();
    state.url = url;
    state.status = "loading";
    state.error = "";
    paintChrome();
    try {
      const doc = await loadUrl(url);
      state.doc = doc;
      state.status = "ready";
      if (state.autoShell) {
        state.shellId = defaultShellFor(doc);
        ui.shellSelect.value = state.shellId;
      }
      paint();
      syncQuery();
    } catch (err) {
      state.status = "error";
      state.error = err instanceof Error ? err.message : String(err);
      state.doc = null;
      paint();
    }
  }

  function paint() {
    paintChrome();
    if (state.status === "loading") {
      ui.stage.innerHTML = `<div class="stage-msg"><div class="spinner"></div><p>Rebuilding as ${shellLabel(state.shellId)}…</p></div>`;
      return;
    }
    if (state.status === "error") {
      ui.stage.innerHTML = `<div class="stage-msg error"><p><strong>Couldn’t open that URL</strong></p><pre class="error-detail">${escapeHtml(state.error)}</pre><p class="hint">Use <code>python3 server.py</code> (not <code>http.server</code>) so the local proxy can load sites like Gutenberg.</p></div>`;
      return;
    }
    if (!state.doc) {
      ui.stage.innerHTML = `<div class="stage-msg"><p>Paste a URL above to regenerate the site.</p></div>`;
      return;
    }
    ui.stage.innerHTML = renderShell(state.shellId, state.doc, {});
  }

  function paintChrome() {
    const ready = state.status === "ready" && state.doc;
    ui.openOriginal.disabled = !ready || !!state.doc?.sourceUrl?.startsWith("demo:");
    if (state.status === "loading") {
      ui.status.textContent = "Loading…";
      ui.status.dataset.kind = "loading";
    } else if (state.status === "error") {
      ui.status.textContent = "Error";
      ui.status.dataset.kind = "error";
    } else if (ready) {
      ui.status.textContent = `${shellLabel(state.shellId)} · ~${wordCount(state.doc).toLocaleString()} words · ${state.doc.kind}`;
      ui.status.dataset.kind = "ok";
    } else {
      ui.status.textContent = "Ready";
      ui.status.dataset.kind = "";
    }
    applyChromeVisibility();
  }

  /**
   * @param {boolean} hidden
   * @param {{ persist?: boolean, sync?: boolean }} [opts]
   */
  function setChromeHidden(hidden, opts = {}) {
    const { persist = true, sync = true } = opts;
    state.chromeHidden = !!hidden;
    applyChromeVisibility();
    if (persist) {
      try {
        localStorage.setItem(CHROME_STORAGE_KEY, state.chromeHidden ? "1" : "0");
      } catch {
        /* ignore */
      }
    }
    if (sync) syncQuery();
  }

  function applyChromeVisibility() {
    root.classList.toggle("chrome-hidden", state.chromeHidden);
    if (ui.showChrome) {
      ui.showChrome.hidden = !state.chromeHidden;
    }
  }

  function syncQuery() {
    if (!state.doc && !state.url) return;
    const p = new URLSearchParams();
    if (state.url || state.doc?.sourceUrl) {
      p.set("url", state.url || state.doc.sourceUrl);
    }
    p.set("shell", state.shellId);
    if (state.chromeHidden) p.set("chrome", "0");
    const qs = p.toString();
    const next = qs ? `${location.pathname}?${qs}` : location.pathname;
    history.replaceState(null, "", next);
  }

  function shellLabel(id) {
    return SHELLS.find((s) => s.id === id)?.label || id;
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll("'", "&#39;");
}
