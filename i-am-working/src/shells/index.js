import { renderGoogleDocs } from "./google-docs.js";
import { renderTechDocs } from "./tech-docs.js";
import { renderOutlook } from "./outlook.js";

/** @typedef {{ id: string, label: string, description: string, bestFor: string[] }} ShellInfo */

/** @type {ShellInfo[]} */
export const SHELLS = [
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

/**
 * Pick a good default shell for a doc kind.
 * @param {import('../model.js').Doc} doc
 */
export function defaultShellFor(doc) {
  if (doc.kind === "listing" || doc.kind === "thread") return "outlook";
  if (doc.kind === "article") return "google-docs";
  return "google-docs";
}

/**
 * @param {string} shellId
 * @param {import('../model.js').Doc} doc
 * @param {{ onSelectItem?: (id: string) => void }} handlers
 */
export function renderShell(shellId, doc, handlers = {}) {
  switch (shellId) {
    case "tech-docs":
      return renderTechDocs(doc, handlers);
    case "outlook":
      return renderOutlook(doc, handlers);
    case "google-docs":
    default:
      return renderGoogleDocs(doc, handlers);
  }
}
