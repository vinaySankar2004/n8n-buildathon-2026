// "Mood request": each picked thread with its top comments (no usernames, no bot or moderator
// posts), for Claude to read how people are reacting.
const run = $("Input").first().json;
const cfg = run.client?.reddit || {};
const per = cfg.comments_per_thread || 6;
const threads = $("Pick threads").all().map((i) => i.json);
const byThread = new Map(threads.map((t) => [`t3_${t.id}`, []]));
for (const { json: c } of $input.all()) {
  if (!c || !c.body || !byThread.has(c.link_id)) continue;
  if (c.distinguished || c.stickied || /^(automoderator|\[deleted\])$/i.test(String(c.author)) || /^\[(removed|deleted)\]$/.test(c.body)) continue;
  byThread.get(c.link_id).push({ text: String(c.body).replace(/\s+/g, " ").trim().slice(0, 400), score: c.score ?? 0 });
}
const withComments = threads.map((t, k) => ({
  ...t,
  ref: `p${k + 1}`,
  comments: (byThread.get(`t3_${t.id}`) || []).sort((a, b) => b.score - a.score).slice(0, per),
}));
const ask = {
  topic: run.story.topic,
  neighbourhood: run.story.area || null,
  threads: withComments.map((t) => ({ id: t.ref, subreddit: `r/${t.subreddit}`, title: t.title, text: t.text, comments: t.comments.map((c) => c.text) })),
};
return [{ json: { threads: withComments, mood_body: {
  model: "__REQUEST_MODEL__",
  max_tokens: 1500,
  system: __MOOD_PROMPT__,
  messages: [{ role: "user", content: JSON.stringify(ask, null, 2) }],
} } }];
