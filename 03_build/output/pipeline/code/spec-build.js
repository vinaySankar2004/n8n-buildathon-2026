// Shared by "3 Write" and "7 Chat" (build.mjs puts it at the top of their Code nodes).
// Turns a draft (headline, script, callout_label, chart_title, chart_kind, blurb) into the render spec,
// builds the chart from the story itself, and lists every problem the guard finds (must-work row 9).
const numbersIn = (text) => (String(text).match(/\d[\d,]*(?:\.\d+)?/g) || []).map((m) => Number(m.replace(/,/g, "")));

function allowedNumbers(story) {
  const allowed = new Set([7, 8, 9]); // the window lengths: 7 days, 8 weeks, 9 weeks
  for (const n of numbersIn(JSON.stringify(story))) { allowed.add(n); allowed.add(Math.abs(n)); }
  return allowed;
}

function unknownNumbers(story, fields) {
  const allowed = allowedNumbers(story);
  const unknown = [];
  for (const [field, text] of Object.entries(fields)) {
    for (const n of numbersIn(text)) if (!allowed.has(n)) unknown.push(`${n} in ${field}`);
  }
  return unknown;
}

function buildSpec(story, d) {
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
      source_note: story.source_note,
    },
    duration_s: 20,
  };
  const problems = [];
  const unknown = unknownNumbers(story, { headline: d.headline, script: d.script, callout_value: callout.value, callout_label: d.callout_label, chart_title: d.chart_title, blurb: d.blurb });
  if (unknown.length) problems.push(`${unknown.join(", ")} is not in the story`);
  const words = String(d.script).trim().split(/\s+/).length;
  if (words < 25 || words > 50) problems.push(`the script is ${words} words; it needs 25 to 50`);
  return { spec, chart_kind: chartKind, words, problems };
}

// The draft as the model sees it, rebuilt from a run.
const draftOf = (run) => ({
  headline: run.spec.headline,
  script: run.spec.script,
  callout_label: run.spec.callout.label,
  chart_title: run.spec.chart.title,
  chart_kind: run.chart_kind || run.story.chart_kind,
  blurb: run.blurb,
});
