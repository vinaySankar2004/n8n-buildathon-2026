// "Build spec and check numbers": parses the model's JSON, builds the chart from the story itself,
// and stops the run if any number in the text is not in the story (must-work row 9).
const input = $("Input").first().json;
const story = input.story;
const res = $input.first().json;
const raw = String(res.content?.find((c) => c.type === "text")?.text ?? res.text ?? "");
let w;
try {
  w = JSON.parse(raw.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, "$1"));
} catch {
  return [{ json: { ok: false, step: "Write", reason: "The model did not return JSON.", raw } }];
}
for (const k of ["headline", "script", "callout_label", "chart_title", "blurb"]) {
  if (typeof w[k] !== "string" || !w[k].trim()) return [{ json: { ok: false, step: "Write", reason: `The model left out ${k}.`, raw } }];
}

// Test switch for the guard: the orchestrator's "Run options" can change one number on purpose.
if (input.test_tamper) {
  const n = String(story.this_week);
  w.script = w.script.includes(n) ? w.script.replace(n, String(story.this_week + 1)) : w.script.replace(/\d+/, (m) => String(Number(m) + 1));
}

const numbers = (text) => (String(text).match(/\d[\d,]*(?:\.\d+)?/g) || []).map((m) => Number(m.replace(/,/g, "")));
const allowed = new Set([7, 8, 9]); // the window lengths: 7 days, 8 weeks, 9 weeks
for (const n of numbers(JSON.stringify(story))) { allowed.add(n); allowed.add(Math.abs(n)); }

const callout = {
  value: story.direction === "up" ? `${story.ratio}×` : `${Math.abs(story.pct_change)}%`,
  label: w.callout_label,
};
const checked = { headline: w.headline, script: w.script, callout_value: callout.value, callout_label: w.callout_label, chart_title: w.chart_title, blurb: w.blurb };
const unknown = [];
for (const [field, text] of Object.entries(checked)) {
  for (const n of numbers(text)) if (!allowed.has(n)) unknown.push(`${n} in ${field}`);
}
const words = w.script.trim().split(/\s+/).length;

const spec = {
  headline: w.headline,
  script: w.script,
  callout,
  chart: {
    kind: "bar",
    title: w.chart_title,
    data: story.chart_kind === "weekly"
      ? story.weekly.slice(-6).map((w) => ({ label: new Date(w.week_ending + "T12:00:00Z").toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }), value: w.count }))
      : story.by_area.slice(0, 6).map((a) => ({ label: a.area, value: a.count })),
    source_note: story.source_note,
  },
  duration_s: 20,
};
if (unknown.length) {
  return [{ json: { ok: false, step: "Write", reason: `Blocked: ${unknown.join(", ")} is not in the story.`, spec } }];
}
if (words < 30 || words > 70) {
  return [{ json: { ok: false, step: "Write", reason: `Blocked: the script is ${words} words; it needs 30 to 70.`, spec } }];
}
return [{ json: { ...input, ok: true, spec, blurb: w.blurb, script_words: words } }];
