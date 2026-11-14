#!/usr/bin/env node
// Runs the Code nodes from the draft workflows against live City of Vancouver data,
// with the n8n HTTP calls done here. Checks Collect for every source, Score, and the number guard.
// Usage: npm run test:pipeline
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const wf = (f) => JSON.parse(readFileSync(path.join(here, "..", "workflows", f), "utf8"));
const codeOf = (w, name) => w.nodes.find((n) => n.name === name).parameters.jsCode;
const wrap = (rows) => ({ first: () => (rows.length ? { json: rows[0] } : undefined), all: () => rows.map((json) => ({ json })) });
const run = async (src, input, nodes = {}) => {
  const fn = new Function("$input", "$", `return (async () => {${src}})();`);
  const out = await fn(wrap(input), (n) => { if (!nodes[n]) throw new Error(`no node ${n}`); return wrap(nodes[n]); });
  return out.map((i) => i.json);
};
const get = async (url, params) => {
  const r = await fetch(`${url}?${new URLSearchParams(params)}`);
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};
let failures = 0;
const check = (ok, what) => { console.log(`${ok ? "pass" : "FAIL"}  ${what}`); if (!ok) failures++; };

const collect = wf("1-collect.json");
const orch = wf("0-orchestrator.json");
const sources = await run(codeOf(orch, "Vancouver sources"), []);

async function collectOne(source, overrideBase) {
  const [cfg] = await run(codeOf(collect, "Source config"), [source]);
  if (overrideBase) cfg.base_url = overrideBase;
  let newest;
  try { newest = await get(`${cfg.base_url}/records`, { select: cfg.newest_select, where: cfg.newest_where, limit: 1 }); }
  catch (e) { return run(codeOf(collect, "Failed"), [{ error: { message: e.message } }], { "Source config": [cfg] }); }
  const [win] = await run(codeOf(collect, "Set window"), [newest], { "Source config": [cfg] });
  if (!win.ok) return run(codeOf(collect, "Failed"), [win], { "Source config": [cfg] });
  const tz = { timezone: cfg.timezone };
  const daily = await get(`${cfg.base_url}/exports/json`, { ...win.daily, ...tz });
  const area = await get(`${cfg.base_url}/exports/json`, { ...win.area, ...tz });
  return run(codeOf(collect, "Build collected"), area, {
    "Source config": [cfg], "Set window": [win], "Daily counts by category": daily, "This week by area": area,
  });
}

const collected = [];
for (const s of sources) {
  const [c] = await collectOne(s);
  collected.push(c);
  const sums = c.ok && c.types.every((t) => t.by_area.reduce((a, b) => a + b.count, 0) + t.unknown_area === t.weekly[8].count);
  check(c.ok && c.weeks.length === 9 && c.types.every((t) => t.weekly.length === 9), `Collect ${s.label}: ${c.ok ? `${c.types.length} categories, week ${c.week_start} to ${c.week_ending}` : c.reason}`);
  if (c.ok) check(sums, `Collect ${s.label}: neighbourhood counts add up to this week's count`);
}
const [dead] = await collectOne(sources[0], "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/no-such-dataset");
check(dead.ok === false && dead.reason, `Collect with a dead URL ends at Failed: ${dead.reason}`);

const score = wf("2-score.json");
const [scored] = await run(codeOf(score, "Rank changes"), collected);
check(scored.ok, `Score: ${scored.ok ? `${scored.story.dataset}, ${scored.story.type}, ${scored.story.this_week} against ${scored.story.avg_prev_8_weeks} (${scored.story.ratio}x, ${scored.story.direction})` : scored.reason}`);
if (scored.ok) {
  for (const r of scored.runners_up) console.log(`      runner-up: ${r.dataset}, ${r.type}, ${r.this_week} against ${r.avg_prev_8_weeks} (${r.ratio}x ${r.direction})`);
}
const [quiet] = await run(codeOf(score, "Rank changes"), collected.map((c) => ({ ...c, types: c.types?.map((t) => ({ ...t, weekly: t.weekly.map((w) => ({ ...w, count: 10 })) })) })));
check(quiet.ok === false, `Score with nothing unusual says: ${quiet.reason}`);

// Guard: a model answer that only uses story numbers passes; one changed number is blocked.
const write = wf("3-write.json");
const story = scored.ok ? scored.story : JSON.parse(codeOf(write, "Sample story").replace(/^[\s\S]*?return \[\{ json: /, "").replace(/ \}\];\s*$/, "")).story;
const top = story.by_area[0] ?? { area: "No neighbourhood", count: story.this_week };
const answer = {
  headline: `${story.topic} ${story.direction === "up" ? "up" : "down"} sharply`,
  script: `Vancouver logged ${story.this_week} ${story.unit} of ${story.topic.toLowerCase()} in the week to ${story.week_ending}. The usual level over the 8 weeks before was ${story.avg_prev_8_weeks}. ${top.area} had the most, with ${top.count}. The city data does not say why. Source: ${story.source_note}.`,
  callout_label: `${story.this_week} ${story.unit} this week against an average of ${story.avg_prev_8_weeks}`,
  chart_title: `${story.topic} by neighbourhood, last 7 days`,
  blurb: `${story.this_week} ${story.unit} this week. ${top.area} had the most.`,
};
const model = { content: [{ type: "text", text: "```json\n" + JSON.stringify(answer) + "\n```" }] };
const [good] = await run(codeOf(write, "Build spec and check numbers"), [model], { Input: [{ ok: true, story, test_tamper: false }] });
check(good.ok && good.spec.chart.data.length > 0, `Guard passes a script with only story numbers${good.ok ? "" : `: ${good.reason}`}`);
const [bad] = await run(codeOf(write, "Build spec and check numbers"), [model], { Input: [{ ok: true, story, test_tamper: true }] });
check(bad.ok === false, `Guard blocks one changed number: ${bad.reason}`);
const [junk] = await run(codeOf(write, "Build spec and check numbers"), [{ content: [{ type: "text", text: "Sorry, I cannot." }] }], { Input: [{ ok: true, story }] });
check(junk.ok === false, `Write without JSON: ${junk.reason}`);

const [note] = await run(codeOf(orch, "Why it stopped"), [quiet]);
check(note.text.startsWith("No story today."), `Quiet note: ${note.text}`);

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
