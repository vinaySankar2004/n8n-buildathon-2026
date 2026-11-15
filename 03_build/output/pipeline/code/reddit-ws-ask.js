// "Reddit search request": how people are reacting on Reddit, found with Anthropic's web search
// limited to reddit.com (Reddit's own API needs an approved app). Settings come from the client's
// config (reddit). Opinion only: nothing found here is a source for numbers.
const run = $input.first().json;
const cfg = run.client?.reddit || {};
const s = run.story;
const ask = {
  topic: s.topic,
  category: s.type,
  neighbourhood: s.area || null,
  city: run.client?.web_search?.location?.city || null,
  subreddits: (cfg.subreddits || []).map((x) => `r/${x}`),
  asked_in_slack: run.request?.text || null,
};
return [{ json: { ...run, reddit_body: {
  model: "__MODEL__",
  max_tokens: 3000,
  output_config: { effort: "low" },
  system: __REDDIT_WS_PROMPT__,
  tools: [{ type: "web_search_20250305", name: "web_search", max_uses: cfg.max_searches || 2, allowed_domains: ["reddit.com"] }],
  messages: [{ role: "user", content: JSON.stringify(ask, null, 2) }],
} } }];
