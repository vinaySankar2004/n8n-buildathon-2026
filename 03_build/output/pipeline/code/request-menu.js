// "Menu": what each of the client's data sources holds, from Collect, for Claude to match the
// request against. Categories are listed most common first.
const req = $("Input").first().json;
const collected = $("1 Collect").all().map((i) => i.json).filter((c) => c.ok);
const total = (t) => t.weekly.reduce((s, w) => s + w.count, 0);
const menu = collected.map((c) => ({
  source_id: c.source_id,
  label: c.dataset,
  unit: c.unit,
  categories: [...c.types].sort((a, b) => total(b) - total(a)).map((t) => t.type),
  areas: [...new Set(c.types.flatMap((t) => t.by_area.map((a) => a.area)))].sort(),
}));
// Time series (such as the unemployment rate) are listed too; Plan fetches them on demand.
for (const s of $("Client").first().json.series_sources || []) {
  menu.push({ source_id: s.id, label: s.label, unit: s.unit, kind: "series", categories: [s.topic], areas: [] });
}
if (!menu.length) return [{ json: { ok: false, menu, reason: "None of the data sources answered." } }];
return [{ json: {
  ok: true,
  menu,
  claude_body: {
    model: "__REQUEST_MODEL__",
    max_tokens: 2000,
    output_config: { effort: "low" },
    system: __REQUEST_PROMPT__,
    messages: [{ role: "user", content: JSON.stringify({ request: req.text, sources: menu }) }],
  },
} }];
