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
const [clientCfg] = await run(codeOf(orch, "Client"), []);
const sources = await run(codeOf(orch, "Data sources"), [], { Client: [clientCfg] });
const { data_sources: _ds, ...runClient } = clientCfg;
check(sources.length > 0 && clientCfg.name, `Client: ${clientCfg.name}, ${sources.length} data sources, ${clientCfg.news_feeds?.length ?? 0} news feeds`);

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

// Context: every news feed in the client's config, live, then a dead one.
const context = wf("2b-context.json");
const ctxRun = { ok: true, story, client: runClient };
const feeds = await run(codeOf(context, "Feeds"), [], { Input: [ctxRun] });
const answers = [];
for (const f of feeds) {
  try {
    const r = await fetch(f.url, { signal: AbortSignal.timeout(20000) });
    answers.push(r.ok ? { data: await r.text() } : { error: { message: `${r.status}` } });
  } catch (e) { answers.push({ error: { message: e.message } }); }
}
const [ctx] = await run(codeOf(context, "Recent reports"), answers, { Input: [ctxRun], Feeds: feeds });
check(ctx.ok && ctx.feeds_checked.length === feeds.length && ctx.feeds_checked.every((f) => f.ok), `Context: ${ctx.feeds_checked.map((f) => `${f.feed}, ${f.ok ? `${f.recent} of ${f.items} recent` : f.reason}`).join("; ")}`);
for (const r of ctx.reports.slice(0, 5)) console.log(`      ${r.id} ${r.source}: ${r.title}`);
const [ctxDead] = await run(codeOf(context, "Recent reports"), [{ error: { message: "404" } }], { Input: [ctxRun], Feeds: [feeds[0]] });
check(ctxDead.ok && ctxDead.reports.length === 0 && !ctxDead.feeds_checked[0].ok, `Context with a dead feed goes on with no reports: ${ctxDead.feeds_checked[0].reason}`);
const top = story.by_area[0] ?? { area: "No neighbourhood", count: story.this_week };
const answer = {
  headline: `${story.topic} ${story.direction === "up" ? "up" : "down"} sharply`,
  script: `Vancouver logged ${story.this_week} ${story.unit} of ${story.topic.toLowerCase()} in the week to ${story.week_ending}. The usual level over the 8 weeks before was ${story.avg_prev_8_weeks}. ${top.area} had the most, with ${top.count}. The city data does not say why. Source: ${story.source_note}.`,
  callout_label: `${story.this_week} ${story.unit} this week against an average of ${story.avg_prev_8_weeks}`,
  chart_title: `${story.topic} by neighbourhood, last 7 days`,
  blurb: `${story.this_week} ${story.unit} this week. ${top.area} had the most.`,
  reports_used: [],
};
const model = { content: [{ type: "text", text: "```json\n" + JSON.stringify(answer) + "\n```" }] };
const writeIn = { ok: true, story, client: runClient, reports: ctx.reports, test_tamper: false };
const [good] = await run(codeOf(write, "Build spec and check numbers"), [model], { Input: [writeIn] });
check(good.ok && good.spec.chart.data.length > 0 && good.spec.brand.name === clientCfg.name, `Guard passes a script with only story numbers${good.ok ? `, branded ${good.spec.brand.name}` : `: ${good.reason}`}`);
check(good.ok && good.write.number_checks.every((c) => c.from), `Trace: every number has a source, such as ${good.ok ? good.write.number_checks.map((c) => `${c.number} from ${c.from}`).slice(0, 3).join(", ") : "none"}`);
// A number from a report is allowed only when the script lists that report.
const fake = { id: "r99", source: "Test feed", title: "Test feed counts 9876 more", summary: "" };
const cited = { content: [{ type: "text", text: JSON.stringify({ ...answer, script: answer.script.replace(/Source:.*$/, "A test feed counts 9876 more."), reports_used: ["r99"] }) }] };
const [withReport] = await run(codeOf(write, "Build spec and check numbers"), [cited], { Input: [{ ...writeIn, reports: [fake] }] });
check(withReport.ok && withReport.spec.chart.source_note.includes("Test feed"), `Guard allows a number from a report the script uses${withReport.ok ? "" : `: ${withReport.reason}`}`);
const uncited = { content: [{ type: "text", text: JSON.stringify({ ...JSON.parse(cited.content[0].text), reports_used: [] }) }] };
const [noReport] = await run(codeOf(write, "Build spec and check numbers"), [uncited], { Input: [{ ...writeIn, reports: [fake] }] });
check(noReport.ok === false, `Guard blocks it when the report is not listed: ${noReport.reason}`);
const [bad] = await run(codeOf(write, "Build spec and check numbers"), [model], { Input: [{ ...writeIn, test_tamper: true }] });
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

// 8 Request: a mention of the bot in the editor channel becomes a request.
const mention = (text) => [{ body: { source: "events", body: { type: "event_callback", authorizations: [{ user_id: "UBOT", is_bot: true }], event: { type: "message", channel: editor, ts: "1794700000.000100", user: "U1", text } } } }];
const [reqEv] = await run(codeOf(chat, "Read Slack event"), mention("<@UBOT> make a video about graffiti in Mount Pleasant"));
check(reqEv?.kind === "request" && reqEv.text === "make a video about graffiti in Mount Pleasant" && reqEv.ts === "1794700000.000100", `Read Slack event takes a mention as a request: "${reqEv?.text}"`);
const noMention = await run(codeOf(chat, "Read Slack event"), mention("make a video about graffiti"));
check(noMention.length === 0, "Read Slack event ignores a new message that does not mention the bot");

const requestWf = wf("8-request.json");
const [menu] = await run(codeOf(requestWf, "Menu"), [], { Input: [reqEv], "1 Collect": collected });
const m311 = menu.menu.find((x) => x.source_id === "311");
const graffiti = m311?.categories.find((c) => /graffiti/i.test(c));
check(menu.ok && graffiti && m311.areas.includes("Mount Pleasant"), `Menu lists each source's categories and neighbourhoods (3-1-1: ${m311?.categories.length} categories, ${m311?.areas.length} neighbourhoods), such as "${graffiti}"`);
const haiku = (a) => [{ model: "claude-haiku-5-5", usage: { input_tokens: 3000, output_tokens: 100 }, content: [{ type: "text", text: JSON.stringify(a) }] }];
const planWith = (a) => run(codeOf(requestWf, "Plan"), haiku(a), { Input: [reqEv], Menu: [menu], Client: [clientCfg] });
const graffitiAll = m311.categories.filter((c) => /graffiti/i.test(c));
const [reqPlan] = await planWith({ kind: "video", source_id: "311", categories: graffitiAll, topic: "graffiti", area: "Mount Pleasant", reply: null });
check(reqPlan.ok && reqPlan.filtered?.filter.includes("Mount Pleasant"), `Plan checks the match and filters to the neighbourhood: ${reqPlan.filtered?.filter}`);
const [bogus] = await planWith({ kind: "video", source_id: "311", categories: ["Dragon Sightings"], area: null });
check(bogus.ok === false && bogus.reply, `Plan refuses a category that is not in the data: ${bogus.reply}`);
const [areaCollected] = await collectOne(reqPlan.filtered);
const [reqStory] = await run(codeOf(requestWf, "Requested story"), [areaCollected], { Plan: [reqPlan], Client: [clientCfg], "1 Collect": collected });
const areaCount = (areaCollected.types || []).filter((t) => graffitiAll.includes(t.type)).reduce((n, t) => n + t.weekly[8].count, 0);
check(reqStory.ok && reqStory.story.area === "Mount Pleasant" && reqStory.story.weekly.length === 9 && reqStory.story.this_week === areaCount && reqStory.story.topic === "Graffiti",
  `Requested story matches the city data for that neighbourhood: ${reqStory.answer_line}`);
const [ansPlan] = await planWith({ kind: "answer", source_id: "311", categories: graffitiAll, topic: "graffiti", area: null });
const [ans] = await run(codeOf(requestWf, "Requested story"), [ansPlan], { Plan: [ansPlan], Client: [clientCfg], "1 Collect": collected });
check(ans.kind === "answer" && ans.answer.includes(String(ans.story.this_week)) && ans.answer.includes("Source:"), `Quick answer, built from the numbers: ${ans.answer_line}`);
const rs = reqStory.story;
const reqModel = { content: [{ type: "text", text: JSON.stringify({
  headline: "Graffiti reports in Mount Pleasant",
  script: `Mount Pleasant logged ${rs.this_week} graffiti reports this week, against a usual ${rs.avg_prev_8_weeks} a week over the 8 weeks before. That is ${rs.direction === "up" ? "a rise" : rs.direction === "down" ? "a drop" : "about the usual level"} for the neighbourhood. The city data does not say why, and crews log each report as it comes in.`,
  callout_label: `${rs.this_week} reports this week`, chart_title: "Graffiti reports per week", blurb: `Mount Pleasant had ${rs.this_week} graffiti reports this week.`, reports_used: [],
}) }] };
const [reqWritten] = await run(codeOf(write, "Build spec and check numbers"), [reqModel], { Input: [{ ...reqStory, test_tamper: false }] });
check(reqWritten.ok && reqWritten.spec.chart.data.length === 6, `Write takes a requested story (${rs.direction}, callout ${reqWritten.spec?.callout.value})${reqWritten.ok ? "" : ": " + reqWritten.reason}`);

// Costs: ElevenLabs credits at the account's own price, and the ledger row.
const voiceWf = wf("4-voice.json");
const script260 = { spec: { script: "x".repeat(260) } };
const [voiced] = await run(codeOf(voiceWf, "Add voice cost"), [{ tier: "creator", character_count: 4000, character_limit: 100000, next_invoice: { amount_due_cents: 2200 } }], { "Package audio": [{ ok: true, ...script260 }], Input: [script260] });
check(voiced.voice_calls[0].characters === 260 && Math.abs(voiced.voice_calls[0].usd_per_credit - 0.00022) < 1e-9, "Add voice cost records 260 credits at the plan's $0.00022 a credit");
const { entryFrom } = await import("../render-service/ledger.mjs");
const { tracePage } = await import("../render-service/trace-page.mjs");
const ledgerRun = { ...reqWritten, voice_calls: voiced.voice_calls };
const ledgerRow = entryFrom(ledgerRun);
check(ledgerRow.trigger === "Slack request" && ledgerRow.requested_by === "U1" && ledgerRow.voice_credits === 260 && Math.abs(ledgerRow.voice_usd - 0.0572) < 1e-6 && ledgerRow.claude_usd > 0,
  `Ledger row: ${ledgerRow.trigger} by ${ledgerRow.requested_by}, Claude $${ledgerRow.claude_usd.toFixed(5)}, ElevenLabs ${ledgerRow.voice_credits} credits $${ledgerRow.voice_usd.toFixed(4)}`);
const tracePageHtml = tracePage(ledgerRun, { editor: true, ledgerUrl: "https://example.test/ledger.html" });
check(tracePageHtml.includes("asked NewsReels") && tracePageHtml.includes("260 credits") && tracePageHtml.includes("run ledger"), "Trace page shows who asked, the ElevenLabs credits and the ledger link");

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
