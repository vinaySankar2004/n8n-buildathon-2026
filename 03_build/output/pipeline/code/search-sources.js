// "Web sources": turns the web search into sources for Write, the editor and the trace.
// Every source is a page Claude cited, kept with the exact words it was cited for (`summary`),
// so the number guard and the editor check against the page's own words, not Claude's.
// They join the feed reports as ids w1, w2...; a search that fails is noted and skipped.
const run = $("Search request").first().json;
const { search_body, ...rest } = run;
const res = $input.first().json;
const ws = run.client?.web_search || {};
const blocks = Array.isArray(res.content) ? res.content : [];
const clip = (s, n) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "..." : s);
// n8n's Code sandbox has no URL object, so the host is read with a pattern.
const host = (u) => (String(u).match(/^https?:\/\/([^/?#:]+)/i)?.[1] || "").toLowerCase().replace(/^www\./, "");
// Cited text can carry page markup: headings, "Share this article", runs of blank lines.
const tidy = (t) => String(t || "")
  .replace(/^#+\s*/gm, "")
  .replace(/^\s*(share this article|advertisement|read more)\s*$/gim, "")
  .replace(/^…\s*/, "")
  .replace(/\s+/g, " ")
  .trim();

const queries = blocks.filter((b) => b.type === "server_tool_use" && b.name === "web_search").map((b) => b.input?.query).filter(Boolean);
const results = new Map(); // url -> what the search returned for it
for (const b of blocks) {
  if (b.type !== "web_search_tool_result") continue;
  if (!Array.isArray(b.content)) continue; // an error object, such as max_uses_exceeded
  for (const r of b.content) if (r.url && !results.has(r.url)) results.set(r.url, { title: r.title, page_age: r.page_age ?? null });
}

// Each cited sentence becomes a finding; each page it cites becomes (or adds to) a source.
const sources = new Map();
const findings = [];
for (const b of blocks) {
  if (b.type !== "text" || !b.citations?.length) continue;
  const claim = b.text.trim();
  const urls = [];
  for (const c of b.citations) {
    if (c.type !== "web_search_result_location" || !c.url) continue;
    const s = sources.get(c.url) || { url: c.url, title: c.title || results.get(c.url)?.title || host(c.url), quotes: [], claims: [] };
    const q = tidy(c.cited_text);
    if (q && !s.quotes.includes(q)) s.quotes.push(q);
    if (claim && !s.claims.includes(claim)) s.claims.push(claim);
    sources.set(c.url, s);
    urls.push(c.url);
  }
  if (urls.length) findings.push({ claim, urls });
}
const summaryText = blocks.filter((b) => b.type === "text").map((b) => b.text).join("").trim();

const web = [...sources.values()].slice(0, ws.max_sources || 6).map((s, k) => ({
  id: `w${k + 1}`,
  source: host(s.url),
  feed: "web",
  title: s.title,
  summary: clip(s.quotes.join(" ... "), 600),
  claims: s.claims,
  url: s.url,
  published: null,
  page_age: results.get(s.url)?.page_age ?? null,
}));

const failed = res.error || res.type === "error" || !blocks.length;
const searches = res.usage?.server_tool_use?.web_search_requests ?? queries.length;
const web_search = {
  model: res.model ?? null,
  usage: res.usage ?? null,
  stop_reason: res.stop_reason ?? null,
  searches,
  queries,
  results_seen: results.size,
  sources_kept: web.length,
  findings,
  summary: failed ? null : clip(summaryText, 600),
  error: failed ? (res.error?.message || res.error || "no answer") : null,
};
const checked = failed
  ? { feed: "Web search", ok: false, reason: String(web_search.error) }
  : { feed: `Web search: ${queries.join("; ") || "no query"}`, ok: true, items: results.size, recent: web.length };
return [{ json: { ...rest, reports: [...(rest.reports || []), ...web], feeds_checked: [...(rest.feeds_checked || []), checked], web_search } }];
