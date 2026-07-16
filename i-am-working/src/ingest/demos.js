import { createDoc } from "../model.js";

/** Built-in demos that work offline (no network). */
export const DEMOS = {
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
          text: "A dense one-liner feels powerful in review. Six months later, nobody wants to touch it. Clever code optimizes for the writer's dopamine; durable code optimizes for the next reader's confidence.",
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
        { type: "h2", text: "A practical rule" },
        {
          type: "p",
          text: "If you need a paragraph to explain a function name, rename the function. Write code that looks boring. Boring systems ship.",
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
              text: "Not the big rewrites — the tiny utilities you installed once and now open every day. For me it was a clipboard history manager.",
            },
            { type: "h2", text: "Comments" },
            {
              type: "blockquote",
              text: "u/textmode · A window manager with keyboard tiling. Mouse travel dropped a lot.",
            },
            {
              type: "blockquote",
              text: "u/papertrail · A plain markdown daily note. Zero features. That constraint is the feature.",
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
              text: "Pick one system and run it for 30 days before you buy another notebook or app. Consistency beats aesthetics.",
            },
          ],
        },
        {
          id: "3",
          title: "Deep work blocks that actually stick",
          subtitle: "r/productivity · u/focus · 612 points",
          preview: "Calendar holds + phone in another room…",
          author: "focus",
          body: [
            {
              type: "p",
              text: "Calendar holds + phone in another room. Protect the first 90 minutes like a meeting with your future self.",
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
          body: [
            { type: "p", text: "Paste a URL. Get a full app chrome you can actually work in." },
          ],
        },
        {
          id: "b",
          title: "The case for boring interfaces",
          subtitle: "256 points · alice · 40 comments",
          body: [{ type: "p", text: "Discussion thread about API design and naming." }],
        },
      ],
      activeItemId: "a",
    }),
};

export function isDemoUrl(url) {
  return url in DEMOS || url.startsWith("demo://");
}

export function loadDemo(url) {
  const fn = DEMOS[url];
  if (!fn) throw new Error(`Unknown demo: ${url}`);
  return fn();
}

export const DEMO_LINKS = [
  { url: "demo://article", label: "Sample article → Docs" },
  { url: "demo://reddit", label: "Sample feed → Outlook" },
  {
    url: "https://www.reddit.com/r/programming/.json",
    label: "r/programming (live)",
  },
  {
    url: "https://news.ycombinator.com/",
    label: "Hacker News (live)",
  },
];
