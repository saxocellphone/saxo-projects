/**
 * REST API implementing i-am-working/openapi.yaml (§13.3.1 http contract).
 */
import http from "node:http";
import { DEMO_LINKS } from "./demos.js";
import { loadDocument } from "./load.js";

const PORT = Number(process.env.PORT || 8787);

const SHELLS = [
  {
    id: "google-docs",
    label: "Google Docs",
    description: "Clean document page",
    bestFor: ["article"],
  },
  {
    id: "tech-docs",
    label: "Technical docs",
    description: "Sidebar TOC + reference page",
    bestFor: ["article", "thread"],
  },
  {
    id: "outlook",
    label: "Outlook",
    description: "Folders, inbox, reading pane",
    bestFor: ["listing", "thread"],
  },
];

const server = http.createServer(async (req, res) => {
  // CORS for local Vite
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  try {
    if (req.method === "GET" && url.pathname === "/healthz") {
      return send(res, 200, { ok: true });
    }
    if (req.method === "GET" && url.pathname === "/api/v1/shells") {
      return send(res, 200, { shells: SHELLS });
    }
    if (req.method === "GET" && url.pathname === "/api/v1/demos") {
      return send(res, 200, { demos: DEMO_LINKS });
    }
    if (req.method === "POST" && url.pathname === "/api/v1/documents") {
      const body = await readJson(req);
      const target = typeof body?.url === "string" ? body.url : "";
      const doc = await loadDocument(target);
      return send(res, 200, doc);
    }
    return send(res, 404, { error: "not found" });
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    const message = err instanceof Error ? err.message : String(err);
    return send(res, status, { error: message });
  }
});

function send(res: http.ServerResponse, status: number, obj: unknown): void {
  const data = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(data),
  });
  res.end(data);
}

function readJson(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("invalid JSON body"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`i-am-working API → http://127.0.0.1:${PORT}`);
  console.log("  GET  /healthz");
  console.log("  GET  /api/v1/shells");
  console.log("  GET  /api/v1/demos");
  console.log("  POST /api/v1/documents");
});
