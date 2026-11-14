#!/usr/bin/env node
// Builds the newsroom's n8n workflows from the code in code/ into 03_build/output/workflows/.
// Usage: npm run pipeline, then npm run deploy (see README.md).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const code = (f) => readFileSync(path.join(here, "code", f), "utf8");
// Ids are derived from names, so rebuilding gives the same JSON and the same webhook addresses.
const id = (seed) => {
  const h = createHash("sha1").update(String(seed)).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const OUT = path.join(here, "..", "workflows");
// n8n and the render service share Vinayak's Mac (see _config/infrastructure.md).
const RENDER_URL = "http://127.0.0.1:8787/render";
const MODEL = "claude-sonnet-5-5";
const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // an ElevenLabs premade voice; change in "Speak script"

// ---------- node helpers ----------
const node = (name, type, typeVersion, position, parameters = {}, extra = {}) =>
  ({ parameters, type, typeVersion, position, id: "", name, ...extra });
const codeNode = (name, pos, file) => node(name, "n8n-nodes-base.code", 2, pos, { jsCode: code(file) });
// The test webhook's body becomes the input; an empty body falls back to this sample.
const jsonNode = (name, pos, value) =>
  node(name, "n8n-nodes-base.code", 2, pos, { jsCode: `// Input for a run through the test webhook (npm run invoke). An empty body uses this sample.\nconst body = $input.first().json.body;\nif (body && typeof body === "object" && Object.keys(body).length) return [{ json: body }];\nreturn [{ json: ${JSON.stringify(value, null, 2)} }];\n` });
const calledBy = (pos = [0, 0]) =>
  node("When Executed by Another Workflow", "n8n-nodes-base.executeWorkflowTrigger", 1.1, pos, { inputSource: "passthrough" });
// Placeholder, swapped for the step's test webhook in workflow().
const testRun = (pos = [0, 200]) => node("Test run", "n8n-nodes-base.manualTrigger", 1, pos);
const webhook = (step, pos) =>
  node("Test webhook", "n8n-nodes-base.webhook", 2, pos, { httpMethod: "POST", path: `step-${step}`, responseMode: "lastNode", options: {} }, { webhookId: id(`step-${step} webhook`) });
// Credentials are named here; n8n matches them by name and type when the workflow is saved.
const creds = (type, name) => ({ credentials: { [type]: { name } } });
const SLACK = creds("slackApi", "Slack");
const noop = (name, pos) => node(name, "n8n-nodes-base.noOp", 1, pos);
const sticky = (name, pos, content, height = 300, width = 460) =>
  node(name, "n8n-nodes-base.stickyNote", 1, pos, { content, height, width, color: 5 });
const ifOk = (name, pos, expr = "={{ $json.ok }}") =>
  node(name, "n8n-nodes-base.if", 2.2, pos, {
    conditions: {
      options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
      conditions: [{ id: id(`${name} condition`), leftValue: expr, rightValue: "", operator: { type: "boolean", operation: "true", singleValue: true } }],
      combinator: "and",
    },
    options: {},
  });
const retry = { retryOnFail: true, maxTries: 3, waitBetweenTries: 2000, onError: "continueErrorOutput" };
const http = (name, pos, p, extra = {}) =>
  node(name, "n8n-nodes-base.httpRequest", 4.2, pos, { options: { timeout: 30000 }, ...p }, { ...retry, ...extra });
const query = (pairs) => ({ sendQuery: true, queryParameters: { parameters: pairs.map(([name, value]) => ({ name, value })) } });
const execWf = (name, pos, label, mode = "once", wait = true) =>
  node(name, "n8n-nodes-base.executeWorkflow", 1.2, pos, {
    workflowId: { __rl: true, value: "", mode: "list", cachedResultName: label },
    mode,
    options: { waitForSubWorkflow: wait },
  }, { onError: "continueErrorOutput" });
// Slack channels, by ID (in Slack: open the channel, then its name, then the ID at the bottom).
// Deploy sets every Slack node from these, so nobody picks a channel in the editor.
// Channel IDs are not secret; the bot token lives only in the n8n "Slack" credential.
const SLACK_CHANNELS = {
  editor: "", // review, approval and "No story today" notes
  outlet: "", // stands in for the outlet page: approved videos and newsletter drafts
};
const channel = (which) => {
  const value = SLACK_CHANNELS[which];
  if (!value) console.warn(`SLACK_CHANNELS.${which} is empty in build.mjs; its Slack nodes deploy with no channel.`);
  return { __rl: true, mode: "id", value };
};

// ---------- connection helpers ----------
const link = (conns, from, outputs) => {
  conns[from] = { main: outputs.map((targets) => [].concat(targets).filter(Boolean).map((n) => ({ node: n, type: "main", index: 0 }))) };
};
const workflow = (name, nodes, connections) => {
  const step = name.split(" ")[1].toLowerCase();
  // Step workflows: the manual "Test run" becomes the test webhook. The orchestrator keeps both.
  const i = nodes.findIndex((n) => n.name === "Test run");
  if (i >= 0) {
    const hook = webhook(step, [nodes[i].position[0], nodes[i].position[1] + (step === "orchestrator" ? 200 : 0)]);
    if (step === "orchestrator") {
      nodes.push(hook);
      connections["Test webhook"] = connections["Test run"];
    } else {
      nodes[i] = hook;
      connections["Test webhook"] = connections["Test run"];
      delete connections["Test run"];
    }
  }
  for (const k of Object.keys(connections)) {
    if (k === "When called by orchestrator") { connections["When Executed by Another Workflow"] = connections[k]; delete connections[k]; }
  }
  for (const n of nodes) n.id = id(`${name}/${n.name}`);
  return { name, nodes, connections, settings: { executionOrder: "v1" }, pinData: {} };
};

// Sample story, the shape Score hands to Write (from a live run on 2026-11-14).
const sampleStory = {
  week_start: "2026-11-07",
  week_ending: "2026-11-13",
  dataset: "3-1-1 service requests",
  source_note: "City of Vancouver open data, 3-1-1 service requests",
  source_url: "https://opendata.vancouver.ca/explore/dataset/3-1-1-service-requests/",
  unit: "reports",
  type: "Street Surface Water Flooding Case",
  topic: "Street Surface Water Flooding",
  direction: "up",
  chart_kind: "by_area",
  this_week: 218,
  avg_prev_8_weeks: 29.3,
  ratio: 7.4,
  pct_change: 644,
  by_area: [
    { area: "Mount Pleasant", count: 33 }, { area: "Downtown", count: 24 }, { area: "Grandview-Woodland", count: 20 },
    { area: "Fairview", count: 16 }, { area: "Kensington-Cedar Cottage", count: 14 }, { area: "Hastings-Sunrise", count: 11 },
  ],
  unknown_area: 4,
  weekly: [18, 13, 31, 13, 15, 6, 45, 93, 218].map((count, i) => ({
    week_ending: ["2026-09-18", "2026-09-25", "2026-10-02", "2026-10-09", "2026-10-16", "2026-10-23", "2026-10-30", "2026-11-06", "2026-11-13"][i],
    count,
  })),
};
const sampleSpec = {
  headline: "Flooding reports up more than seven times",
  script: "Vancouver logged 218 street flooding reports in the week to November 13. The usual level over the 8 weeks before was 29.3 a week. Mount Pleasant had the most, with 33, then Downtown with 24. The city data does not say why. Source: City of Vancouver open data.",
  callout: { value: "7.4×", label: "218 reports this week against an average of 29.3" },
  chart: {
    kind: "bar",
    title: "Flooding reports by neighbourhood, last 7 days",
    data: sampleStory.by_area.map((a) => ({ label: a.area, value: a.count })),
    source_note: sampleStory.source_note,
  },
  duration_s: 20,
};
const sampleBlurb = "Street flooding reports to 3-1-1 reached 218 this week, against a usual 29.3. Mount Pleasant and Downtown had the most.";

const out = {};

// ---------- 1 Collect ----------
{
  const n = [
    calledBy([0, 0]), testRun([0, 200]),
    codeNode("Source config", [220, 100], "collect-config.js"),
    http("Newest record", [440, 100], { url: "={{ $json.base_url }}/records", ...query([["select", "={{ $json.newest_select }}"], ["where", "={{ $json.newest_where }}"], ["limit", "1"]]) }),
    codeNode("Set window", [660, 0], "collect-window.js"),
    ifOk("Data fresh?", [880, 0]),
    http("Daily counts by category", [1100, -100], {
      url: "={{ $('Source config').first().json.base_url }}/exports/json",
      ...query([["select", "={{ $json.daily.select }}"], ["where", "={{ $json.daily.where }}"], ["group_by", "={{ $json.daily.group_by }}"], ["timezone", "={{ $('Source config').first().json.timezone }}"]]),
    }),
    http("This week by area", [1320, -200], {
      url: "={{ $('Source config').first().json.base_url }}/exports/json",
      ...query([["select", "={{ $('Set window').first().json.area.select }}"], ["where", "={{ $('Set window').first().json.area.where }}"], ["group_by", "={{ $('Set window').first().json.area.group_by }}"], ["timezone", "={{ $('Source config').first().json.timezone }}"]]),
    }, { executeOnce: true }),
    codeNode("Build collected", [1540, -200], "collect-build.js"),
    codeNode("Failed", [1320, 200], "collect-failed.js"),
    sticky("About Collect", [-40, -460], "## 1 Collect\nPulls 9 weeks of one City of Vancouver dataset, grouped by category, day and neighbourhood. Public, no key, never addresses.\n\nThe orchestrator calls it once per source in **Vancouver sources**. Its test webhook takes a source object; an empty body uses 3-1-1.\n\nAny failure or stale data ends at **Failed** with `ok: false` and a reason."),
  ];
  const c = {};
  link(c, "When Executed by Another Workflow", [["Source config"]]);
  link(c, "Test run", [["Source config"]]);
  link(c, "Source config", [["Newest record"]]);
  link(c, "Newest record", [["Set window"], ["Failed"]]);
  link(c, "Set window", [["Data fresh?"]]);
  link(c, "Data fresh?", [["Daily counts by category"], ["Failed"]]);
  link(c, "Daily counts by category", [["This week by area"], ["Failed"]]);
  link(c, "This week by area", [["Build collected"], ["Failed"]]);
  out["1-collect"] = workflow("1 Collect", n, c);
}

// ---------- 2 Score ----------
{
  const n = [
    calledBy([0, 0]), testRun([0, 200]),
    codeNode("Webhook input", [120, 200], "score-webhook-input.js"),
    codeNode("Rank changes", [360, 0], "score.js"),
    sticky("About Score", [-40, -360], "## 2 Score\nGets every source Collect returned. Compares each category's count this week with its average over the 8 weeks before, keeps changes of at least 20 and twice (or half) the usual level, and returns the strongest as `story`.\n\nNothing passing the bar gives `ok: false`, which becomes the \"no story today\" note.\n\nIts test webhook takes an array of Collect outputs.", 280),
  ];
  const c = {};
  link(c, "When Executed by Another Workflow", [["Rank changes"]]);
  link(c, "Test run", [["Webhook input"]]);
  link(c, "Webhook input", [["Rank changes"]]);
  out["2-score"] = workflow("2 Score", n, c);
}

// ---------- 3 Write ----------
{
  const prompt = code("write-prompt.md");
  const write = http("Write script", [660, 100], {
    method: "POST",
    url: "https://api.anthropic.com/v1/messages",
    authentication: "predefinedCredentialType",
    nodeCredentialType: "anthropicApi",
    sendHeaders: true,
    headerParameters: { parameters: [{ name: "anthropic-version", value: "2023-06-01" }] },
    sendBody: true,
    specifyBody: "json",
    jsonBody: `={{ JSON.stringify({ model: '${MODEL}', max_tokens: 800, system: ${JSON.stringify(prompt)}, messages: [{ role: 'user', content: 'Story JSON:\\n' + JSON.stringify($('Input').first().json.story, null, 2) }] }) }}`,
    options: { timeout: 60000 },
  }, { maxTries: 2, ...creds("anthropicApi", "Anthropic") });
  const n = [
    calledBy([0, 0]), testRun([0, 200]),
    jsonNode("Sample story", [220, 200], { ok: true, story: sampleStory, test_tamper: false }),
    noop("Input", [440, 100]),
    write,
    codeNode("Build spec and check numbers", [900, 0], "write-check.js"),
    codeNode("Failed", [900, 240], "write-failed.js"),
    sticky("About Write", [-40, -380], "## 3 Write\nClaude (Anthropic API, credential \"Anthropic\") turns the story into a headline, a script of about 50 words, a chart title and a newsletter blurb.\n\n**Build spec and check numbers** builds the chart from the story itself and stops the run if any number in the text is not in the story (the guard).\n\nIts test webhook takes a `story` run; an empty body uses **Sample story**.", 320),
  ];
  const c = {};
  link(c, "When Executed by Another Workflow", [["Input"]]);
  link(c, "Test run", [["Sample story"]]);
  link(c, "Sample story", [["Input"]]);
  link(c, "Input", [["Write script"]]);
  link(c, "Write script", [["Build spec and check numbers"], ["Failed"]]);
  out["3-write"] = workflow("3 Write", n, c);
}

// ---------- 4 Voice ----------
{
  const n = [
    calledBy([0, 0]), testRun([0, 200]),
    jsonNode("Sample spec", [220, 200], { ok: true, story: sampleStory, spec: sampleSpec, blurb: sampleBlurb }),
    noop("Input", [440, 100]),
    http("Speak script", [660, 100], {
      method: "POST",
      url: `=https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify({ text: $json.spec.script, model_id: 'eleven_multilingual_v2' }) }}",
      options: { timeout: 60000, response: { response: { responseFormat: "file" } } },
    }, creds("httpHeaderAuth", "ElevenLabs")),
    codeNode("Package audio", [900, 0], "voice-package.js"),
    codeNode("Failed", [900, 240], "voice-failed.js"),
    sticky("About Voice", [-40, -340], "## 4 Voice\nElevenLabs reads the script. **Package audio** turns the MP3 into base64 for the render service and stops the run if it is 22 seconds or longer.\n\nCredential: Header Auth named \"ElevenLabs\", header `xi-api-key`.\n\nAn empty test body uses **Sample spec**.", 280),
  ];
  const c = {};
  link(c, "When Executed by Another Workflow", [["Input"]]);
  link(c, "Test run", [["Sample spec"]]);
  link(c, "Sample spec", [["Input"]]);
  link(c, "Input", [["Speak script"]]);
  link(c, "Speak script", [["Package audio"], ["Failed"]]);
  out["4-voice"] = workflow("4 Voice", n, c);
}

// ---------- 5 Render ----------
{
  const n = [
    calledBy([0, 0]), testRun([0, 200]),
    jsonNode("Sample spec", [220, 200], { ok: true, story: sampleStory, spec: sampleSpec, blurb: sampleBlurb }),
    noop("Input", [440, 100]),
    http("Render video", [660, 100], {
      method: "POST",
      url: RENDER_URL,
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify({ spec: $json.spec, audio_base64: $json.audio_base64 }) }}",
      options: { timeout: 120000 },
    }, { maxTries: 2, ...creds("httpHeaderAuth", "Render token") }),
    codeNode("Package video", [900, 0], "render-package.js"),
    codeNode("Failed", [900, 240], "render-failed.js"),
    sticky("About Render", [-40, -340], "## 5 Render\nSends the spec and narration to the Remotion service beside n8n on Vinayak's Mac and gets back a public MP4 link.\n\nCredential: Header Auth named \"Render token\", header `x-render-token`. \n\nAn empty test body uses **Sample spec** with no audio: a silent 20 second video.", 280),
  ];
  const c = {};
  link(c, "When Executed by Another Workflow", [["Input"]]);
  link(c, "Test run", [["Sample spec"]]);
  link(c, "Sample spec", [["Input"]]);
  link(c, "Input", [["Render video"]]);
  link(c, "Render video", [["Package video"], ["Failed"]]);
  out["5-render"] = workflow("5 Render", n, c);
}

// ---------- 6 Publish ----------
{
  const download = (name, pos) => http(name, pos, {
    url: "={{ $('Input').first().json.video_url }}",
    sendHeaders: true,
    headerParameters: { parameters: [{ name: "ngrok-skip-browser-warning", value: "1" }] },
    options: { timeout: 60000, response: { response: { responseFormat: "file" } } },
  });
  const upload = (name, pos, which, comment) => node(name, "n8n-nodes-base.slack", 2.3, pos, {
    resource: "file",
    binaryData: true,
    binaryPropertyName: "data",
    options: { channelIds: SLACK_CHANNELS[which] ? [SLACK_CHANNELS[which]] : [], fileName: "={{ $('Input').first().json.story.topic }}.mp4", initialComment: comment },
  }, { onError: "continueErrorOutput", ...SLACK });
  const message = (name, pos, which, text) => node(name, "n8n-nodes-base.slack", 2.3, pos, {
    select: "channel", channelId: channel(which), text, otherOptions: {},
  }, { onError: "continueErrorOutput", ...SLACK });
  const ask = node("Ask editor", "n8n-nodes-base.slack", 2.3, [1100, 0], {
    operation: "sendAndWait",
    select: "channel",
    channelId: channel("editor"),
    message: "={{ (() => { const r = $('Input').first().json; const s = r.story; return `*${r.spec.headline}*\\n${r.spec.script}\\n\\nFrom ${s.dataset}: ${s.this_week} ${s.unit} in the week to ${s.week_ending}, against an average of ${s.avg_prev_8_weeks} over the 8 weeks before.\\nVideo: ${r.video_url}`; })() }}",
    approvalOptions: { values: { approvalType: "double", approveLabel: "Approve", disapproveLabel: "Reject" } },
    options: { limitWaitTime: { values: { resumeAmount: 3, resumeUnit: "hours" } } },
  }, { webhookId: id("6 Publish Ask editor webhook"), onError: "continueErrorOutput", ...SLACK });
  const n = [
    calledBy([0, 0]), testRun([0, 200]),
    jsonNode("Sample run", [220, 200], { ok: true, story: sampleStory, spec: sampleSpec, blurb: sampleBlurb, video_url: "replace with a video_url from 5 Render" }),
    noop("Input", [440, 100]),
    download("Download video", [660, 100]),
    upload("Send video to editor", [880, 100], "editor", "=For review: {{ $('Input').first().json.spec.headline }}"),
    ask,
    ifOk("Approved?", [1320, 0], "={{ $json.data.approved }}"),
    download("Download for outlet", [1540, -100]),
    upload("Post to outlet", [1760, -100], "outlet", "={{ $('Input').first().json.spec.headline }}\n\n{{ $('Input').first().json.blurb }}\n\nSource: {{ $('Input').first().json.story.source_note }}"),
    message("Newsletter draft", [1980, -100], "outlet", "=Newsletter draft: {{ $('Input').first().json.blurb }}"),
    message("Tell editor it was rejected", [1540, 140], "editor", "=Not published: {{ $('Input').first().json.spec.headline }}"),
    codeNode("Failed", [1100, 300], "publish-failed.js"),
    node("Tell editor it failed", "n8n-nodes-base.slack", 2.3, [1320, 300], { select: "channel", channelId: channel("editor"), text: "=Could not publish. {{ $json.reason }}", otherOptions: {} }, SLACK),
    sticky("About Publish", [-40, -400], "## 6 Publish\nSends the editor the video in Slack with Approve and Reject, and waits up to 3 hours. Approve posts it to the outlet channel and drafts the newsletter blurb. Reject sends a short note.\n\nCredential: Slack. Channels come from `SLACK_CHANNELS` in the pipeline's build.mjs.\n\nIts test webhook needs a run with a real `video_url`, such as 5 Render's output.", 340),
  ];
  const c = {};
  link(c, "When Executed by Another Workflow", [["Input"]]);
  link(c, "Test run", [["Sample run"]]);
  link(c, "Sample run", [["Input"]]);
  link(c, "Input", [["Download video"]]);
  link(c, "Download video", [["Send video to editor"], ["Failed"]]);
  link(c, "Send video to editor", [["Ask editor"], ["Failed"]]);
  link(c, "Ask editor", [["Approved?"], ["Failed"]]);
  link(c, "Approved?", [["Download for outlet"], ["Tell editor it was rejected"]]);
  link(c, "Download for outlet", [["Post to outlet"], ["Failed"]]);
  link(c, "Post to outlet", [["Newsletter draft"], ["Failed"]]);
  link(c, "Failed", [["Tell editor it failed"]]);
  out["6-publish"] = workflow("6 Publish", n, c);
}

// ---------- 0 Orchestrator ----------
{
  const n = [
    testRun([0, 200]),
    node("Every morning", "n8n-nodes-base.scheduleTrigger", 1.2, [0, 0], { rule: { interval: [{ triggerAtHour: 7 }] } }, { disabled: true }),
    codeNode("Vancouver sources", [220, 100], "sources.js"),
    { ...execWf("1 Collect", [440, 100], "1 Collect", "each"), onError: "continueRegularOutput" },
    execWf("2 Score", [660, 100], "2 Score", "once"),
    ifOk("Story found?", [880, 100]),
    codeNode("Run options", [1100, 0], "run-options.js"),
    execWf("3 Write", [1320, 0], "3 Write"),
    ifOk("Numbers check out?", [1540, 0]),
    execWf("4 Voice", [1760, 0], "4 Voice"),
    ifOk("Voice ok?", [1980, 0]),
    execWf("5 Render", [2200, 0], "5 Render"),
    ifOk("Video ok?", [2420, 0]),
    execWf("6 Publish", [2640, 0], "6 Publish", "once", false),
    codeNode("Why it stopped", [1760, 400], "why-stopped.js"),
    node("No story today", "n8n-nodes-base.slack", 2.3, [1980, 400], { select: "channel", channelId: channel("editor"), text: "={{ $json.text }}", otherOptions: {} }, SLACK),
    sticky("About the newsroom", [-40, -460], "## 0 Orchestrator\n**Vancouver sources** lists the datasets to watch. **1 Collect** runs once per source, **2 Score** picks the week's strongest change, then Write, Voice, Render and Publish.\n\nIf any step says `ok: false`, or errors, **No story today** tells the editor why in Slack.\n\n**Every morning** stays off while building.\n\nTo test the guard, set `test_tamper` to true in **Run options**.", 360),
  ];
  const c = {};
  link(c, "Test run", [["Vancouver sources"]]);
  link(c, "Every morning", [["Vancouver sources"]]);
  link(c, "Vancouver sources", [["1 Collect"]]);
  link(c, "1 Collect", [["2 Score"]]);
  link(c, "2 Score", [["Story found?"], ["Why it stopped"]]);
  link(c, "Story found?", [["Run options"], ["Why it stopped"]]);
  link(c, "Run options", [["3 Write"]]);
  link(c, "3 Write", [["Numbers check out?"], ["Why it stopped"]]);
  link(c, "Numbers check out?", [["4 Voice"], ["Why it stopped"]]);
  link(c, "4 Voice", [["Voice ok?"], ["Why it stopped"]]);
  link(c, "Voice ok?", [["5 Render"], ["Why it stopped"]]);
  link(c, "5 Render", [["Video ok?"], ["Why it stopped"]]);
  link(c, "Video ok?", [["6 Publish"], ["Why it stopped"]]);
  link(c, "6 Publish", [[], ["Why it stopped"]]);
  link(c, "Why it stopped", [["No story today"]]);
  out["0-orchestrator"] = workflow("0 Orchestrator", n, c);
}

mkdirSync(OUT, { recursive: true });
for (const [file, wf] of Object.entries(out)) {
  writeFileSync(path.join(OUT, `${file}.json`), JSON.stringify(wf, null, 2) + "\n");
  console.log(`${file}.json: ${wf.nodes.length} nodes`);
}
