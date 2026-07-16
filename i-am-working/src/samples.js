export const SAMPLES = {
  article: {
    title: "Why interfaces beat clever code",
    html: `<!DOCTYPE html><html><head><title>Why interfaces beat clever code</title></head><body>
<article>
  <h1>Why interfaces beat clever code</h1>
  <p>Most production bugs are not caused by missing algorithms. They come from unclear boundaries: who owns state, what can change, and what is promised to callers.</p>
  <h2>The temptation of cleverness</h2>
  <p>A dense one-liner feels powerful in review. Six months later, nobody wants to touch it. Clever code optimizes for the writer's dopamine; durable code optimizes for the next reader's confidence.</p>
  <blockquote>Make the common path obvious. Hide the rare path behind an explicit door.</blockquote>
  <h2>What good interfaces look like</h2>
  <ul>
    <li>Small surface area with stable names</li>
    <li>Errors that say what to do next</li>
    <li>Inputs that are hard to misuse</li>
  </ul>
  <h2>A practical rule</h2>
  <p>If you need a paragraph to explain a function name, rename the function. If you need a diagram to explain a module boundary, the boundary is wrong—or the diagram belongs in the docs next to it.</p>
  <pre><code>// prefer
createCheckoutSession(cart)

// over
doThing(x, y, true, null)</code></pre>
  <p>Write code that looks boring. Boring systems ship.</p>
</article></body></html>`,
  },
  reddit: {
    title: "What's a small tool that quietly improved your workflow?",
    html: `<html><body>
<main>
  <h1>What's a small tool that quietly improved your workflow?</h1>
  <p>Not the big rewrites — the tiny utilities you installed once and now open every day.</p>
  <p>For me it was a clipboard history manager. I used to lose terminal snippets constantly. Now I treat my clipboard like a tiny scratch buffer.</p>
  <hr>
  <h2>Comments</h2>
  <p><strong>u/buildkite</strong> — A window manager with keyboard tiling. Mouse travel dropped a lot once resizing stopped being a drag-and-pray sport.</p>
  <blockquote>Seconded. Combined with a launcher, most days I barely touch the trackpad.</blockquote>
  <p><strong>u/textmode</strong> — <code>ripgrep</code> everywhere. Once you get used to instant search across a monorepo, IDE search feels sleepy.</p>
  <p><strong>u/papertrail</strong> — A plain markdown daily note. Zero features. That constraint is the feature.</p>
</main>
</body></html>`,
  },
  docs: {
    title: "checkout-api: rejecting invalid SKUs",
    html: `<html><body>
<article>
  <h1>checkout-api: rejecting invalid SKUs</h1>
  <p>Notes from the edge-case review on cart validation. Goal: fail closed before payment intent creation.</p>
  <h2>Current behavior</h2>
  <p>The handler accepts any non-empty string as a SKU, then the pricing service 404s later. Users see a generic "something went wrong" after they've already entered card details.</p>
  <h2>Proposed check</h2>
  <ol>
    <li>Normalize SKU: trim, uppercase</li>
    <li>Lookup against catalog snapshot used for the request</li>
    <li>Return <code>400 invalid_sku</code> with the offending lines</li>
  </ol>
  <h2>Error shape</h2>
  <pre><code>{
  "code": "invalid_sku",
  "message": "one or more line items reference unknown SKUs",
  "details": [{ "sku": "HAT-42", "index": 2 }]
}</code></pre>
  <h2>Open questions</h2>
  <ul>
    <li>Do we allow discontinued SKUs still in open carts?</li>
    <li>Should agents get a stricter policy than humans?</li>
  </ul>
</article></body></html>`,
  },
};
