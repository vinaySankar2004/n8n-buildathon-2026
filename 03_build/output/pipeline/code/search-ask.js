// "Search request": the web search Claude runs for a story someone asked for in Slack. Uses the
// Anthropic web search tool (basic variant, so every finding comes back with the exact words it
// cites from the page). Settings come from the client's config (web_search).
const run = $input.first().json;
const ws = run.client?.web_search || {};
const s = run.story;
const ask = {
  asked_in_slack: run.request?.text || null,
  topic: s.topic,
  neighbourhood: s.area || null,
  city: ws.location?.city || null,
  data_week: `${s.week_start} to ${s.week_ending}`,
  data_says: `${s.this_week} ${s.unit} this week against an average of ${s.avg_prev_8_weeks} a week over the 8 weeks before`,
};
const tool = { type: "web_search_20250305", name: "web_search", max_uses: ws.max_searches || 3 };
if (ws.location) tool.user_location = { type: "approximate", ...ws.location };
if (ws.blocked_domains?.length) tool.blocked_domains = ws.blocked_domains;
return [{ json: { ...run, search_body: {
  model: "__MODEL__",
  max_tokens: 4000,
  output_config: { effort: "low" },
  system: __SEARCH_PROMPT__,
  tools: [tool],
  messages: [{ role: "user", content: JSON.stringify(ask, null, 2) }],
} } }];
