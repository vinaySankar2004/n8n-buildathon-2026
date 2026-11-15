// "Series story": a time series someone asked for in Slack (such as Vancouver's unemployment rate),
// as a run for Context and Write, plus a one-line answer built from the numbers. Every value on
// the chart and in the story is a value Statistics Canada published.
const plan = $("Plan").first().json;
const { data_sources, ...client } = $("Client").first().json;
const s = plan.series;
const raw = $input.first().json;
const pts = (Array.isArray(raw) ? raw[0] : raw?.[0] ?? raw)?.object?.vectorDataPoint
  || (Array.isArray(raw?.body) ? raw.body[0]?.object?.vectorDataPoint : null)
  || [];
const values = pts.filter((p) => p.value !== null && p.value !== undefined).map((p) => ({ month: String(p.refPer).slice(0, 7), value: Number(p.value) }));
if (values.length < 2) {
  return [{ json: { ok: false, kind: "unclear", request: plan.request, reply: `I could not get ${s.label} from Statistics Canada just now. Try again in a minute.` } }];
}
const name = (m) => new Date(m + "-15T12:00:00Z").toLocaleDateString("en-CA", { month: "long", year: "numeric", timeZone: "UTC" });
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (m) => `${MON[Number(m.slice(5, 7)) - 1]} \u2019${m.slice(2, 4)}`;
const first = values[0], last = values[values.length - 1];
const high = values.reduce((a, b) => (b.value > a.value ? b : a));
const low = values.reduce((a, b) => (b.value < a.value ? b : a));
const yearAgo = values.length > 12 ? values[values.length - 13] : first;
const change = Math.round((last.value - first.value) * 10) / 10;
// At most 9 points on the chart, evenly spaced, always ending on the latest month.
const step = Math.max(1, Math.ceil((values.length - 1) / 8));
const points = [];
for (let i = values.length - 1; i >= 0 && points.length < 9; i -= step) points.unshift(values[i]);
const period = values.length % 12 === 0 ? `the last ${values.length / 12} year${values.length === 12 ? "" : "s"}` : `the last ${values.length} months`;
const story = {
  kind: "series",
  dataset: s.label,
  source_note: s.source_note,
  source_url: s.source_url,
  unit: s.unit,
  type: s.topic,
  topic: s.topic,
  period,
  months: values.length,
  first_month: name(first.month),
  first_value: first.value,
  latest_month: name(last.month),
  latest_value: last.value,
  year_ago_month: name(yearAgo.month),
  year_ago_value: yearAgo.value,
  high_month: name(high.month),
  high_value: high.value,
  low_month: name(low.month),
  low_value: low.value,
  change_points: change,
  direction: change > 0.2 ? "up" : change < -0.2 ? "down" : "flat",
  chart_kind: "series",
  points: points.map((p) => ({ label: short(p.month), value: p.value })),
  values,
};
const answer = [
  `*${s.label}*: ${last.value}${s.unit} in ${story.latest_month}, against ${first.value}${s.unit} in ${story.first_month} (${period}).`,
  `Highest: ${high.value}${s.unit} in ${story.high_month}. Lowest: ${low.value}${s.unit} in ${story.low_month}. A year earlier: ${yearAgo.value}${s.unit}.`,
  `Source: <${s.source_url}|${s.source_note}>`,
].join("\n");
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
  sources_checked: s.label,
  sources_failed: [],
  answer,
  answer_line: answer.split("\n")[0].replace(/\*/g, ""),
} }];
