// "Pick threads": keeps recent, open threads from the searches, most discussed first. Drops
// anything marked over 18, removed or locked, and repeats across searches. No usernames are kept.
const run = $("Input").first().json;
const cfg = run.client?.reddit || {};
const days = cfg.days || 30;
const since = Date.now() / 1000 - days * 86400;
const seen = new Set();
const picked = [];
for (const { json: p } of $input.all()) {
  if (!p || !p.id || p.error || seen.has(p.id)) continue;
  seen.add(p.id);
  if (p.over_18 || p.removed_by_category || p.locked || p.stickied) continue;
  if (!p.created_utc || p.created_utc < since) continue;
  picked.push({
    id: p.id,
    subreddit: p.subreddit,
    title: String(p.title || "").trim(),
    text: String(p.selftext || "").replace(/\s+/g, " ").trim().slice(0, 500),
    url: `https://www.reddit.com${p.permalink}`,
    score: p.score ?? null,
    num_comments: p.num_comments ?? 0,
    created: new Date(p.created_utc * 1000).toISOString(),
  });
}
picked.sort((a, b) => b.num_comments - a.num_comments || (b.score || 0) - (a.score || 0));
const keep = picked.slice(0, cfg.max_threads || 4);
// "Read comments" needs at least one item; an empty marker means there is nothing to read.
return keep.length ? keep.map((json) => ({ json })) : [{ json: { none: true } }];
