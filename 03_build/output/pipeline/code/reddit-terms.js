// "Search terms": what to search Reddit for. Claude Haiku turns the story into one or two short
// searches, the way residents write post titles. Settings come from the client's config (reddit).
const run = $input.first().json;
const s = run.story;
const ask = { topic: s.topic, category: s.type, neighbourhood: s.area || null, city: run.client?.web_search?.location?.city || null, asked_in_slack: run.request?.text || null };
return [{ json: { ...run, terms_body: {
  model: "__REQUEST_MODEL__",
  max_tokens: 1000,
  system: __TERMS_PROMPT__,
  messages: [{ role: "user", content: JSON.stringify(ask, null, 2) }],
} } }];
