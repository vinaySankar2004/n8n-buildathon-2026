// Shared by "3 Write" and "7 Chat" (build.mjs puts it at the top of their Code nodes).
// Turns a draft (headline, script, callout_label, chart_title, chart_kind, blurb, reports_used) into the
// render spec, builds the chart from the story itself, and lists every problem the guard finds
// (must-work row 9). A number may come from the story or from a news report the draft says it used.
// `ctx` is the run's client (name, look, style card) and its recent reports.
// "3-1-1" is a name, not three numbers.
const numbersIn = (text) => (String(text).replace(/\b3-1-1\b/g, " ").match(/\d[\d,]*(?:\.\d+)?/g) || []).map((m) => Number(m.replace(/,/g, "")));

// Where each allowed number comes from, most specific place first. The trace shows these.
function numberOrigins(story, used = []) {
  const origin = new Map();
  const note = (n, where) => { if (!origin.has(n)) origin.set(n, where); };
  note(7, "the window: 7 days"); note(8, "the window: 8 weeks"); note(9, "the window: 9 weeks");
  for (const [k, v] of Object.entries(story)) if (typeof v === "number") { note(v, `story ${k}`); note(Math.abs(v), `story ${k}`); }
  for (const a of story.by_area || []) note(a.count, `story by_area, ${a.area}`);
  for (const x of story.weekly || []) note(x.count, `story weekly, week ending ${x.week_ending}`);
  for (const n of numbersIn(JSON.stringify(story))) note(n, "story");
  for (const r of used) for (const n of numbersIn(`${r.title} ${r.summary}`)) note(n, `report ${r.id}, ${r.source}`);
  return origin;
}

function unknownNumbers(story, fields, used = []) {
  const origin = numberOrigins(story, used);
  const unknown = [];
  for (const [field, text] of Object.entries(fields)) {
    for (const n of numbersIn(text)) if (!origin.has(n)) unknown.push(`${n} in ${field}`);
  }
  return unknown;
}

function buildSpec(story, d, ctx = {}) {
  const client = ctx.client || {};
  const ids = Array.isArray(d.reports_used) ? d.reports_used.map(String) : [];
  const used = (ctx.reports || []).filter((r) => ids.includes(r.id));
  const hasAreas = (story.by_area || []).length > 0;
  const chartKind = d.chart_kind === "weekly" || !hasAreas ? "weekly" : d.chart_kind === "by_area" ? "by_area" : story.chart_kind;
  const callout = {
    value: story.direction === "up" ? `${story.ratio}×` : `${Math.abs(story.pct_change)}%`,
    label: d.callout_label,
  };
  const spec = {
    headline: d.headline,
    script: d.script,
    callout,
    chart: {
      kind: "bar",
      title: d.chart_title,
      data: chartKind === "weekly"
        ? story.weekly.slice(-6).map((w) => ({ label: new Date(w.week_ending + "T12:00:00Z").toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }), value: w.count }))
        : story.by_area.slice(0, 6).map((a) => ({ label: a.area, value: a.count })),
      source_note: [story.source_note, ...new Set(used.map((r) => r.source))].join("; "),
    },
    brand: { name: client.name || "", desk: client.look?.desk || "", accent: client.look?.accent || null },
    duration_s: 20,
  };
  const fields = { headline: d.headline, script: d.script, callout_value: callout.value, callout_label: d.callout_label, chart_title: d.chart_title, blurb: d.blurb };
  const origin = numberOrigins(story, used);
  const number_checks = [];
  for (const [field, text] of Object.entries(fields)) {
    for (const n of numbersIn(text)) number_checks.push({ field, number: n, from: origin.get(n) || null });
  }
  const problems = [];
  const unknown = number_checks.filter((c) => !c.from).map((c) => `${c.number} in ${c.field}`);
  if (unknown.length) problems.push(`${unknown.join(", ")} is not in the story or a report it uses`);
  const words = String(d.script).trim().split(/\s+/).length;
  const range = client.style?.script_words || { min: 35, max: 45 };
  const lo = Math.max(20, range.min - 10);
  const hi = Math.min(50, range.max + 5); // past 50 words the narration runs over 22 seconds
  if (words < lo || words > hi) problems.push(`the script is ${words} words; it needs ${lo} to ${hi}`);
  return { spec, chart_kind: chartKind, words, problems, used, number_checks };
}

// The draft as the model sees it, rebuilt from a run.
const draftOf = (run) => ({
  headline: run.spec.headline,
  script: run.spec.script,
  callout_label: run.spec.callout.label,
  chart_title: run.spec.chart.title,
  chart_kind: run.chart_kind || run.story.chart_kind,
  blurb: run.blurb,
  reports_used: (run.reports_used || []).map((r) => r.id),
});
