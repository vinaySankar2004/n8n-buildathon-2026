// "Plan": reads Claude's match and checks it against the menu, so only real categories and
// neighbourhoods go on. Anything it cannot use becomes a short reply asking again.
const req = $("Input").first().json;
const { menu } = $("Menu").first().json;
const client = $("Client").first().json;
const res = $input.first().json;
const raw = String(res.content?.find((c) => c.type === "text")?.text ?? "");
let a = {};
try {
  a = JSON.parse(raw.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, "$1"));
} catch {}
// "Who asked" looks up the name; without Slack's users:read permission it stays the user ID.
let profile = null;
try {
  profile = $("Who asked").first()?.json?.user;
} catch {}
const user_name = profile?.profile?.display_name || profile?.real_name || profile?.name || null;
const request = { ...req, user_name, parse: { model: res.model ?? null, usage: res.usage ?? null }, matched: a };
const src = menu.find((m) => m.source_id === a.source_id);
const example = `Try "@Newsroom make a video about graffiti in Mount Pleasant" or "@Newsroom how many noise complaints this week?"`;
if (a.kind === "unclear" || !src) {
  return [{ json: { ok: false, kind: "unclear", request, reply: a.reply || `I could not match that to the data. ${example}` } }];
}
const categories = [].concat(a.categories ?? a.category ?? []).filter(Boolean);
if (categories.some((c) => !src.categories.includes(c))) {
  return [{ json: { ok: false, kind: "unclear", request, reply: `I could not find that in ${src.label}. ${example}` } }];
}
const source = client.data_sources.find((s) => s.id === src.source_id);
const area = a.area && src.areas.includes(a.area) && source.area_field ? a.area : null;
// A neighbourhood needs its own 9 weeks of data, so Collect runs again with a filter.
const filtered = area && source.area_field
  ? { ...source, filter: [source.filter, `${source.area_field} = "${area.replace(/"/g, '\\"')}"`].filter(Boolean).join(" and ") }
  : null;
const kind = a.kind === "answer" ? "answer" : "video";
const topic = String(a.topic || "").trim();
return [{ json: { ok: true, kind, request: { ...request, kind }, source_id: src.source_id, categories, topic: topic ? topic.charAt(0).toUpperCase() + topic.slice(1) : null, area, filtered } }];
