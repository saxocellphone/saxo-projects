import { createDocument, listDemos, listShells, type DemoLink } from "./api";
import { selectItem, wordCount, type Document, type Shell } from "./model";
import { DEFAULT_SHELLS, defaultShellFor, renderShell } from "./shells";

const CHROME_STORAGE_KEY = "iamworking.chromeHidden";

type State = {
  url: string;
  shellId: Shell["id"];
  doc: Document | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string;
  autoShell: boolean;
  chromeHidden: boolean;
  shells: Shell[];
  demos: DemoLink[];
};

export function createApp(root: HTMLElement): void {
  const state: State = {
    url: "",
    shellId: "google-docs",
    doc: null,
    status: "idle",
    error: "",
    autoShell: true,
    chromeHidden: false,
    shells: DEFAULT_SHELLS,
    demos: [],
  };

  const ui = {
    urlInput: root.querySelector<HTMLInputElement>("#url-input")!,
    openBtn: root.querySelector<HTMLButtonElement>("#btn-open")!,
    shellSelect: root.querySelector<HTMLSelectElement>("#shell-select")!,
    status: root.querySelector<HTMLElement>("#status")!,
    stage: root.querySelector<HTMLElement>("#stage")!,
    openOriginal: root.querySelector<HTMLButtonElement>("#btn-original")!,
    demos: root.querySelector<HTMLElement>("#demo-links")!,
    hideChrome: root.querySelector<HTMLButtonElement>("#btn-hide-chrome"),
    showChrome: root.querySelector<HTMLButtonElement>("#btn-show-chrome"),
  };

  function paintShellSelect(): void {
    ui.shellSelect.innerHTML = state.shells
      .map((s) => `<option value="${s.id}">${s.label}</option>`)
      .join("");
    ui.shellSelect.value = state.shellId;
  }

  function paintDemos(): void {
    ui.demos.innerHTML = state.demos
      .map(
        (d) =>
          `<button type="button" class="demo-chip" data-url="${escapeAttr(d.url)}">${escapeHtml(d.label)}</button>`,
      )
      .join("");
  }

  ui.demos.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-url]");
    if (!btn) return;
    ui.urlInput.value = btn.getAttribute("data-url") || "";
    state.autoShell = true;
    void openUrl();
  });

  ui.openBtn.addEventListener("click", () => {
    state.autoShell = true;
    void openUrl();
  });
  ui.urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      state.autoShell = true;
      void openUrl();
    }
  });
  ui.shellSelect.addEventListener("change", () => {
    state.shellId = ui.shellSelect.value as Shell["id"];
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

  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target instanceof HTMLElement ? e.target.tagName : "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (e.target instanceof HTMLElement && e.target.isContentEditable) return;
    if (e.key === "b" || e.key === "B") {
      e.preventDefault();
      setChromeHidden(!state.chromeHidden);
    }
  });

  ui.stage.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-item-id]");
    if (!btn || !state.doc) return;
    const id = btn.getAttribute("data-item-id");
    if (!id) return;
    state.doc = selectItem(state.doc, id);
    paint();
  });

  const params = new URLSearchParams(location.search);
  const qUrl = params.get("url");
  const qShell = params.get("shell");
  const qChrome = params.get("chrome");
  if (qShell && state.shells.some((s) => s.id === qShell)) {
    state.shellId = qShell as Shell["id"];
    state.autoShell = false;
  }
  if (qChrome != null) {
    const hide = ["0", "hidden", "off", "false"].includes(qChrome);
    setChromeHidden(hide, { persist: false, sync: false });
  } else {
    try {
      if (localStorage.getItem(CHROME_STORAGE_KEY) === "1") {
        setChromeHidden(true, { persist: false, sync: false });
      }
    } catch {
      /* ignore */
    }
  }
  applyChromeVisibility();
  paintShellSelect();

  void bootstrap().then(() => {
    if (qUrl) {
      ui.urlInput.value = qUrl;
      void openUrl();
    } else {
      ui.urlInput.value = "demo://article";
      void openUrl();
    }
  });

  async function bootstrap(): Promise<void> {
    try {
      const [shells, demos] = await Promise.all([listShells(), listDemos()]);
      if (shells.length) state.shells = shells;
      state.demos = demos;
    } catch {
      state.demos = [
        { url: "demo://article", label: "Sample article → Docs" },
        { url: "demo://reddit", label: "Sample feed → Outlook" },
        { url: "https://news.ycombinator.com/", label: "Hacker News (live)" },
      ];
    }
    paintShellSelect();
    paintDemos();
  }

  async function openUrl(): Promise<void> {
    const url = ui.urlInput.value.trim();
    state.url = url;
    state.status = "loading";
    state.error = "";
    paintChrome();
    try {
      const doc = await createDocument(url);
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

  function paint(): void {
    paintChrome();
    if (state.status === "loading") {
      ui.stage.innerHTML = `<div class="stage-msg"><div class="spinner"></div><p>Rebuilding as ${shellLabel(state.shellId)}…</p></div>`;
      return;
    }
    if (state.status === "error") {
      ui.stage.innerHTML = `<div class="stage-msg error"><p><strong>Couldn’t open that URL</strong></p><pre class="error-detail">${escapeHtml(state.error)}</pre><p class="hint">Start the API: <code>cd server && npm run dev</code> (and Vite frontend).</p></div>`;
      return;
    }
    if (!state.doc) {
      ui.stage.innerHTML = `<div class="stage-msg"><p>Paste a URL above to regenerate the site.</p></div>`;
      return;
    }
    ui.stage.innerHTML = renderShell(state.shellId, state.doc);
  }

  function paintChrome(): void {
    const ready = state.status === "ready" && state.doc;
    ui.openOriginal.disabled = !ready || !!state.doc?.sourceUrl?.startsWith("demo:");
    if (state.status === "loading") {
      ui.status.textContent = "Loading…";
      ui.status.dataset.kind = "loading";
    } else if (state.status === "error") {
      ui.status.textContent = "Error";
      ui.status.dataset.kind = "error";
    } else if (ready && state.doc) {
      ui.status.textContent = `${shellLabel(state.shellId)} · ~${wordCount(state.doc).toLocaleString()} words · ${state.doc.kind}`;
      ui.status.dataset.kind = "ok";
    } else {
      ui.status.textContent = "Ready";
      ui.status.dataset.kind = "";
    }
    applyChromeVisibility();
  }

  function setChromeHidden(
    hidden: boolean,
    opts: { persist?: boolean; sync?: boolean } = {},
  ): void {
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

  function applyChromeVisibility(): void {
    root.classList.toggle("chrome-hidden", state.chromeHidden);
    if (ui.showChrome) ui.showChrome.hidden = !state.chromeHidden;
  }

  function syncQuery(): void {
    if (!state.doc && !state.url) return;
    const p = new URLSearchParams();
    if (state.url || state.doc?.sourceUrl) {
      p.set("url", state.url || state.doc!.sourceUrl);
    }
    p.set("shell", state.shellId);
    if (state.chromeHidden) p.set("chrome", "0");
    const qs = p.toString();
    history.replaceState(null, "", qs ? `${location.pathname}?${qs}` : location.pathname);
  }

  function shellLabel(id: string): string {
    return state.shells.find((s) => s.id === id)?.label || id;
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replaceAll("'", "&#39;");
}
