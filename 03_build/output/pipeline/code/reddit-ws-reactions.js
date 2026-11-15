// "Reactions": what people on Reddit are saying, from the web search, added to the run as
// `reactions`. Opinion only: the number guard never reads it. Quotes are the exact words the search
// cited from each thread page, with usernames taken out; threads are the Reddit pages cited.
const run = $("Reddit search request").first().json;
const { reddit_body, ...rest } = run;
const cfg = run.client?.reddit || {};
const res = $input.first().json;
const blocks = Array.isArray(res.content) ? res.content : [];
const sub = (u) => String(u).match(/reddit\.com\/r\/([^/]+)/i)?.[1] || "";
const tidy = (t) => String(t || "").replace(/^#+\s*/gm, "").replace(/\bu\/[A-Za-z0-9_-]+/g, "a user").replace(/\s+/g, " ").trim();
const clip = (t, n) => (t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "..." : t);

const queries = blocks.filter((b) => b.type === "server_tool_use" && b.name === "web_search").map((b) => b.input?.query).filter(Boolean);
const seen = new Map();
for (const b of blocks) {
  if (b.type !== "web_search_tool_result" || !Array.isArray(b.content)) continue;
  for (const r of b.content) if (r.url && !seen.has(r.url)) seen.set(r.url, { title: r.title, page_age: r.page_age ?? null });
}
const threads = new Map();
const sentences = [];
const quotes = [];
for (const b of blocks) {
  if (b.type !== "text" || !b.citations?.length) continue;
  const cites = b.citations.filter((c) => c.type === "web_search_result_location" && /reddit\.com\/r\//i.test(c.url || ""));
  if (!cites.length) continue;
  sentences.push(b.text.trim());
  for (const c of cites) {
    if (!threads.has(c.url)) {
      threads.set(c.url, { ref: `p${threads.size + 1}`, subreddit: sub(c.url), title: String(c.title || seen.get(c.url)?.title || "Reddit thread").replace(/\s*:\s*r\/\w+\s*$/i, ""), url: c.url, page_age: seen.get(c.url)?.page_age ?? null });
    }
    const q = clip(tidy(c.cited_text), 240);
    if (q && !quotes.some((x) => x.text === q)) quotes.push({ thread: threads.get(c.url).ref, text: q });
  }
}
const failed = !!res.error || !blocks.length;
const list = [...threads.values()].slice(0, cfg.max_threads || 4);
const keep = new Set(list.map((t) => t.ref));
const searches = res.usage?.server_tool_use?.web_search_requests ?? queries.length;
const reactions = {
  source: "Reddit",
  via: "web search on reddit.com",
  note: "Opinion and experience from Reddit, never data. No number from here may appear in a script.",
  searched: queries.map((q) => `"${q}"`),
  threads_found: seen.size,
  threads: list,
  relevant: list.length > 0,
  summary: list.length ? clip(sentences.join(" "), 500) : "",
  themes: [],
  quotes: quotes.filter((q) => keep.has(q.thread)).slice(0, 3),
  calls: res.usage ? [{ what: `Read Reddit reactions (web search, ${searches} searches)`, model: res.model, usage: res.usage, searches }] : [],
  error: failed ? String(res.error?.message || res.error || "no answer from the search") : null,
};
return [{ json: { ...rest, reactions } }];
