/** @typedef {{ id: string, label: string, description: string, className: string, kicker: string }} FormatPreset */

/** @type {FormatPreset[]} */
export const FORMATS = [
  {
    id: "tech-docs",
    label: "Technical docs",
    description: "Read-the-Docs / MDN style reference pages",
    className: "format-tech-docs",
    kicker: "Documentation",
  },
  {
    id: "google-docs",
    label: "Google Docs",
    description: "Clean white page, Arial body text",
    className: "format-google-docs",
    kicker: "Document",
  },
  {
    id: "medium",
    label: "Medium",
    description: "Longform blog reading experience",
    className: "format-medium",
    kicker: "Story",
  },
  {
    id: "newspaper",
    label: "Newspaper",
    description: "Broadsheet columns and drop cap",
    className: "format-newspaper",
    kicker: "The Daily Read",
  },
  {
    id: "email",
    label: "Email",
    description: "Inbox reading pane",
    className: "format-email",
    kicker: "Inbox · message",
  },
  {
    id: "reddit",
    label: "Reddit",
    description: "Post card on dark Reddit UI",
    className: "format-reddit",
    kicker: "Posted by u/reader",
  },
  {
    id: "manpage",
    label: "Man page",
    description: "Terminal manual-page aesthetic",
    className: "format-manpage",
    kicker: "NAME",
  },
  {
    id: "academic",
    label: "Academic paper",
    description: "Double-spaced Times manuscript",
    className: "format-academic",
    kicker: "Working paper",
  },
];

export function getFormat(id) {
  return FORMATS.find((f) => f.id === id) || FORMATS[0];
}
