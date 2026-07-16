import { createDoc, type Document } from "./types.js";

export const DEMOS: Record<string, () => Document> = {
  "demo://article": () =>
    createDoc({
      sourceUrl: "demo://article",
      title: "Why interfaces beat clever code",
      author: "I Am Working",
      kind: "article",
      site: "demo",
      sections: [
        {
          type: "p",
          text: "Most production bugs are not caused by missing algorithms. They come from unclear boundaries: who owns state, what can change, and what is promised to callers.",
        },
        { type: "h2", text: "The temptation of cleverness" },
        {
          type: "p",
          text: "A dense one-liner feels powerful in review. Six months later, nobody wants to touch it.",
        },
        {
          type: "blockquote",
          text: "Make the common path obvious. Hide the rare path behind an explicit door.",
        },
        { type: "h2", text: "What good interfaces look like" },
        {
          type: "ul",
          items: [
            "Small surface area with stable names",
            "Errors that say what to do next",
            "Inputs that are hard to misuse",
          ],
        },
        {
          type: "code",
          text: "// prefer\ncreateCheckoutSession(cart)\n\n// over\ndoThing(x, y, true, null)",
        },
      ],
    }),
  "demo://reddit": () =>
    createDoc({
      sourceUrl: "demo://reddit",
      title: "r/productivity",
      kind: "listing",
      site: "demo",
      sections: [],
      nav: [
        { id: "hot", label: "Hot" },
        { id: "new", label: "New" },
      ],
      items: [
        {
          id: "1",
          title: "What's a small tool that quietly improved your workflow?",
          subtitle: "r/productivity · u/buildkite · 2.1k points",
          preview: "Not the big rewrites — the tiny utilities…",
          author: "buildkite",
          body: [
            {
              type: "p",
              text: "Not the big rewrites — the tiny utilities you installed once and now open every day.",
            },
            { type: "h2", text: "Comments" },
            {
              type: "blockquote",
              text: "u/textmode · A window manager with keyboard tiling.",
            },
          ],
        },
        {
          id: "2",
          title: "Stop optimizing your morning routine",
          subtitle: "r/productivity · u/calmdev · 840 points",
          preview: "Pick one system and run it for 30 days…",
          author: "calmdev",
          body: [
            {
              type: "p",
              text: "Pick one system and run it for 30 days before you buy another notebook.",
            },
          ],
        },
      ],
      activeItemId: "1",
    }),
  "demo://hn": () =>
    createDoc({
      sourceUrl: "demo://hn",
      title: "Hacker News",
      kind: "listing",
      site: "demo",
      sections: [],
      items: [
        {
          id: "a",
          title: "Show HN: I Am Working – open any URL as Docs or Outlook",
          subtitle: "412 points · demo · 88 comments",
          body: [{ type: "p", text: "Paste a URL. Get a full app chrome you can actually work in." }],
        },
      ],
      activeItemId: "a",
    }),
};

export const DEMO_LINKS = [
  { url: "demo://article", label: "Sample article → Docs" },
  { url: "demo://reddit", label: "Sample feed → Outlook" },
  { url: "https://www.reddit.com/r/programming/", label: "r/programming (live)" },
  { url: "https://news.ycombinator.com/", label: "Hacker News (live)" },
];
