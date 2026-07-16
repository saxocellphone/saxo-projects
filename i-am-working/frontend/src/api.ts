import type { Document, Shell } from "./model";

export type DemoLink = { url: string; label: string };

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data as { error?: string }).error || `HTTP ${res.status}`;
    throw new Error(err);
  }
  return data as T;
}

/** POST /api/v1/documents — openapi createDocument */
export async function createDocument(url: string): Promise<Document> {
  const res = await fetch("/api/v1/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ url }),
  });
  return json<Document>(res);
}

/** GET /api/v1/shells */
export async function listShells(): Promise<Shell[]> {
  const res = await fetch("/api/v1/shells", { headers: { Accept: "application/json" } });
  const data = await json<{ shells: Shell[] }>(res);
  return data.shells;
}

/** GET /api/v1/demos */
export async function listDemos(): Promise<DemoLink[]> {
  const res = await fetch("/api/v1/demos", { headers: { Accept: "application/json" } });
  const data = await json<{ demos: DemoLink[] }>(res);
  return data.demos;
}
