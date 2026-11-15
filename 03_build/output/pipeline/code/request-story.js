// "Requested story": the story for exactly what was asked, in the same shape Score hands to Write,
// plus a one-line answer built from the numbers (no model writes it). No bar to pass: a request
// gets its data whatever the size.
const plan = $("Plan").first().json;
const { data_sources, ...client } = $("Client").first().json;
const c = plan.filtered ? $input.first().json : $("1 Collect").all().map((i) => i.json).find((x) => x.ok && x.source_id === plan.source_id);
if (!c || !c.ok) return [{ json: { ok: false, kind: "unclear", request: plan.request, reply: `I could not get that data just now: ${c?.reason || "no answer from the city"}.` } }];

const round1 = (x) => Math.round(x * 10) / 10;
const topicOf = (t) => t.replace(/\s*-\s*311$/i, "").replace(/\s+(Request\s+)?Case$/i, "").trim();
const types = plan.categories.length ? c.types.filter((t) => plan.categories.includes(t.type)) : c.types;
const weekly = c.weeks.map((we, k) => ({ week_ending: we, count: types.reduce((s, t) => s + (t.weekly[k]?.count || 0), 0) }));
const areas = new Map();
let unknown = 0;
for (const t of types) {
  for (const a of t.by_area) areas.set(a.area, (areas.get(a.area) || 0) + a.count);
  unknown += t.unknown_area || 0;
}
const by_area = plan.area ? [] : [...areas].map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count).slice(0, 10);
const counts = weekly.map((w) => w.count);
const thisWeek = counts[8];
const avg = round1(counts.slice(0, 8).reduce((a, b) => a + b, 0) / 8);
const ratio = avg ? round1(thisWeek / avg) : null;
const pct = avg ? Math.round(((thisWeek - avg) / avg) * 100) : null;
const direction = !avg ? (thisWeek ? "up" : "flat") : ratio >= 1.2 ? "up" : ratio <= 0.8 ? "down" : "flat";
const topic = plan.topic || (plan.categories.length === 1 ? topicOf(plan.categories[0]) : c.dataset);
const story = {
  week_start: c.week_start,
  week_ending: c.week_ending,
  dataset: c.dataset,
  source_note: c.source_note,
  source_url: c.source_url,
  unit: c.unit,
  type: plan.categories.length ? plan.categories.join("; ") : `all ${c.dataset}`,
  topic,
  area: plan.area,
  direction,
  this_week: thisWeek,
  avg_prev_8_weeks: avg,
  ratio,
  pct_change: pct,
  chart_kind: by_area.length >= 3 ? "by_area" : "weekly",
  by_area,
  unknown_area: unknown,
  weekly,
};
const change = !avg ? "none in the 8 weeks before" : direction === "up" ? `${ratio}× the usual level` : direction === "down" ? `down ${Math.abs(pct)}% from the usual level` : "about the usual level";
const answer = [
  `*${topic}${plan.area ? ` in ${plan.area}` : ""}*: ${thisWeek} ${c.unit} in the week ${c.week_start} to ${c.week_ending}, against an average of ${avg} a week over the 8 weeks before (${change}).`,
  by_area.length ? `Most this week: ${by_area.slice(0, 3).map((a) => `${a.area} ${a.count}`).join(", ")}.` : "",
  `Source: <${c.source_url}|${c.source_note}>`,
].filter(Boolean).join("\n");
return [{ json: {
  ok: true,
  kind: plan.kind,
  run_id: `request-${plan.request.ts}`,
  trigger: "Slack request",
  started_at: plan.request.at,
  request: plan.request,
  client,
  story,
  runners_up: [],
  sources_checked: c.dataset,
  sources_failed: [],
  answer,
  answer_line: answer.split("\n")[0].replace(/\*/g, ""),
} }];
