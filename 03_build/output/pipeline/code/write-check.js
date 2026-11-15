// "Build spec and check numbers": parses the model's JSON, builds the chart from the story itself,
// and stops the run if any number is not in the story or in a report the script uses (must-work row 9).
// buildSpec and the guard are in spec-build.js, shared with "7 Chat". It also keeps, for the run's
// trace, what Claude answered, what the call used and where each number came from.
const input = $("Input").first().json;
const story = input.story;
const res = $input.first().json;
const raw = String(res.content?.find((c) => c.type === "text")?.text ?? res.text ?? "");
const call = { model: res.model ?? null, usage: res.usage ?? null, stop_reason: res.stop_reason ?? null };
let w;
try {
  w = JSON.parse(raw.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, "$1"));
} catch {
  const why = raw ? "The model did not return JSON." : `The model stopped (${res.stop_reason ?? "no reply"}) before writing any text.`;
  return [{ json: { ok: false, step: "Write", reason: why, raw, write: call } }];
}
for (const k of ["headline", "script", "callout_label", "chart_title", "blurb"]) {
  if (typeof w[k] !== "string" || !w[k].trim()) return [{ json: { ok: false, step: "Write", reason: `The model left out ${k}.`, raw, write: call } }];
}

// Test switch for the guard: the orchestrator's "Run options" can change one number on purpose.
if (input.test_tamper) {
  const n = String(story.this_week);
  w.script = w.script.includes(n) ? w.script.replace(n, String(story.this_week + 1)) : w.script.replace(/\d+/, (m) => String(Number(m) + 1));
}

const built = buildSpec(story, { ...w, chart_kind: story.chart_kind }, { client: input.client, reports: input.reports });
const write = { ...call, answer: w, number_checks: built.number_checks };
if (built.problems.length) {
  return [{ json: { ok: false, step: "Write", reason: `Blocked: ${built.problems[0]}.`, spec: built.spec, write } }];
}
return [{ json: { ...input, ok: true, spec: built.spec, chart_kind: built.chart_kind, blurb: w.blurb, script_words: built.words, reports_used: built.used, write } }];
