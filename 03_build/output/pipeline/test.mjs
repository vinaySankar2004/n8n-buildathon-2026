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

// 7 Chat: the editor's review thread, with Claude's answers faked here.
const chat = wf("7-chat.json");
const editor = chat.nodes.find((x) => x.name === "Upload to thread").parameters.options.channelId;
const runForChat = good;
const [card] = await run(codeOf(chat, "Start review"), [runForChat]);
const cardText = JSON.stringify(card.post.blocks);
check(card.post.channel === editor && !card.post.thread_ts && cardText.includes(String(story.this_week)) && cardText.includes("newsroom_approve_script"),
  "Start review posts the script, the data and Approve script to the editor channel");
check(card.row.stage === "script" && JSON.parse(card.row.state).run.spec.script === runForChat.spec.script, "Start review saves the thread at the script stage");

const event = (e) => [{ body: { source: "events", body: { type: "event_callback", event: { type: "message", channel: editor, ts: "2.0", thread_ts: "1.0", user: "U1", ...e } } } }];
const [replyEv] = await run(codeOf(chat, "Read Slack event"), event({ text: "Make the headline calmer" }));
check(replyEv?.kind === "reply" && replyEv.thread_ts === "1.0", "Read Slack event takes a thread reply");
const ignored = [
  await run(codeOf(chat, "Read Slack event"), event({ text: "bot echo", bot_id: "B1" })),
  await run(codeOf(chat, "Read Slack event"), event({ text: "not in a thread", thread_ts: undefined })),
  await run(codeOf(chat, "Read Slack event"), event({ text: "other channel", channel: "C999" })),
];
check(ignored.every((x) => x.length === 0), "Read Slack event ignores the bot's own posts, top-level messages and other channels");
const [tap] = await run(codeOf(chat, "Read Slack event"), [{ body: { source: "interactivity", payload: { type: "block_actions", channel: { id: editor }, user: { id: "U1" }, message: { ts: "1.0" }, actions: [{ action_id: "newsroom_approve_script" }] } } }]);
check(tap?.kind === "action" && tap.action === "approve_script" && tap.thread_ts === "1.0", "Read Slack event takes a button tap");

const row = { thread_ts: "1.0", ...card.row };
const decide = (ev, stage = "script") => run(codeOf(chat, "Decide"), [{ ...row, stage }], { "Read Slack event": [ev] });
const [revise] = await decide(replyEv);
check(revise.route === "revise" && revise.claude_body.messages[0].content.includes("Make the headline calmer"), "Decide sends a reply to Claude with the story and draft");
const [approve] = await decide(tap);
check(approve.route === "approve_script" && approve.working_note, "Decide routes Approve script to the video");
check((await decide(tap, "video")).length === 0 && (await decide(replyEv, "published")).length === 0, "Decide ignores old buttons and finished threads");

const claude = (obj) => [{ content: [{ type: "text", text: JSON.stringify(obj) }] }];
const draft = { ...answer, chart_kind: "weekly", headline: `${story.topic} reports climb` };
const [revised] = await run(codeOf(chat, "Check revision"), claude({ reply: "I made the headline calmer and switched to the weekly chart.", draft }), { Decide: [revise] });
const revisedState = JSON.parse(revised.row.state);
check(revised.post.thread_ts === "1.0" && revisedState.run.spec.headline === draft.headline && revisedState.run.chart_kind === "weekly" && revisedState.run.spec.chart.data.length === 6,
  "Check revision posts the new draft in the thread and saves it");
const [blocked] = await run(codeOf(chat, "Check revision"), claude({ reply: "Done.", draft: { ...draft, script: draft.script.replace(String(story.this_week), String(story.this_week + 5)) } }), { Decide: [revise] });
check(blocked.post.text.startsWith("I did not make that change") && JSON.parse(blocked.row.state).run.spec.script === runForChat.spec.script, `Check revision blocks a new number: ${blocked.post.text.slice(0, 90)}`);
const [answered] = await run(codeOf(chat, "Check revision"), claude({ reply: "It rose to 12345 reports.", draft: null }), { Decide: [revise] });
check(!answered.post.text.includes("12345"), "Check revision never posts a number that is not in the data");
const [remake] = await run(codeOf(chat, "Check revision"), claude({ reply: "Switched to the weekly chart.", draft }), { Decide: [{ ...revise, chat: { ...revise.chat, stage: "video" } }] });
check(remake.render === true && remake.chat.thread_ts === "1.0", "Check revision remakes the video when the editor changes it after seeing it");

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
