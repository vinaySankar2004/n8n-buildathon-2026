// "What to search": one item per subreddit and search, for "Search Reddit". Falls back to the
// story's topic words when Claude's answer cannot be read.
const run = $("Input").first().json;
const cfg = run.client?.reddit || {};
const res = $input.first().json;
const raw = String(res.content?.find((c) => c.type === "text")?.text ?? "");
let queries = [];
try { queries = JSON.parse(raw.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, "$1")).queries || []; } catch {}
queries = queries.map((q) => String(q).trim()).filter(Boolean).slice(0, 2);
if (!queries.length) {
  const generic = /^(case|request|concern|service|inquiry|general|other|report|complaint|issue)$/i;
  queries = [String(run.story.topic || run.story.type).split(/\s+/).filter((w) => !generic.test(w)).slice(-2).join(" ")];
}
const subs = (cfg.subreddits || ["vancouver"]).slice(0, 3);
return subs.flatMap((subreddit) => queries.map((keyword) => ({ json: { subreddit, keyword } })));
