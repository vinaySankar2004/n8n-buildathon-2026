#!/usr/bin/env node
// Builds the newsroom's n8n workflows from the code in code/ into 03_build/output/workflows/.
// Usage: npm run pipeline, then npm run deploy (see README.md).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toSvg } from "./canvas.mjs";

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
const MODEL = "claude-sonnet-5-5"; // writes each story
const CHAT_MODEL = "claude-haiku-5-5"; // revises drafts in the review thread: many small edits, so the low-cost model
const REQUEST_MODEL = "claude-haiku-5-5"; // matches Slack requests to the data
const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // an ElevenLabs premade voice; change in "Speak script"

// The client this build serves (D13): name, look, Slack channels, data sources, news feeds and style card.
// One file per client in ../clients/; CLIENT=<file name> picks another.
const CLIENT_ID = process.env.CLIENT || "rain-city-ledger";
const client = JSON.parse(readFileSync(path.join(here, "..", "clients", `${CLIENT_ID}.json`), "utf8"));
const { data_sources: _sources, ...runClient } = client; // what travels with each run

// ---------- node helpers ----------
const node = (name, type, typeVersion, position, parameters = {}, extra = {}) =>
  ({ parameters, type, typeVersion, position, id: "", name, ...extra });
const codeNode = (name, pos, file) => node(name, "n8n-nodes-base.code", 2, pos, { jsCode: code(file) });
// A Code node with shared helpers from code/ put above its own code.
const codeWith = (name, pos, file, shared, fill = {}) => {
  let js = [...shared, file].map(code).join("\n");
  for (const [k, v] of Object.entries(fill)) js = js.split(k).join(v);
  return node(name, "n8n-nodes-base.code", 2, pos, { jsCode: js });
};
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
// Slack channels, by ID, from the client file (in Slack: open the channel, then its name, then the ID at the bottom).
// editor: review, approval and "No story today" notes. outlet: stands in for the client's page.
// Channel IDs are not secret; the bot token lives only in the n8n "Slack" credential.
const SLACK_CHANNELS = client.slack ?? {};
const channel = (which) => {
  const value = SLACK_CHANNELS[which];
  if (!value) console.warn(`slack.${which} is empty in the client file; its Slack nodes deploy with no channel.`);
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
  brand: { name: client.name, desk: client.look?.desk ?? "", accent: client.look?.accent ?? null },
  duration_s: 20,
};
// Sample reports, the shape Context hands to Write (from the live feeds on 2026-11-14).
const sampleReports = [
  { id: "r1", source: "Environment Canada", feed: "weather-alerts", title: "Coastal flooding statement for Coastline of Metro Vancouver incl. Vancouver and Musqueam FN", summary: "Elevated ocean water levels are expected with enhanced wave activity and strong winds at times. Hazard: Possible coastal flooding due to storm surge.", url: "https://weather.gc.ca/warnings/index_e.html", published: "2026-11-14T23:54:38.360Z" },
  { id: "r2", source: "BC Government News", feed: "bc-gov-news", title: "People advised to plan for storm, possible flood conditions on South Coast highways", summary: "People travelling on South Coast highways are advised to plan ahead for a storm.", url: "https://news.gov.bc.ca/", published: "2026-11-10T23:20:00.000Z" },
];
const sampleBlurb = "Street flooding reports to 3-1-1 reached 218 this week, against a usual 29.3. Mount Pleasant and Downtown had the most.";

const out = {};

// The run trace (render service, POST /trace): an editor page and a public "How this story was made" page.
const TRACE_URL = RENDER_URL.replace(/\/render$/, "/trace");
const WRITE_PROMPT = code("write-prompt.md");
const saveTrace = (name, pos, runExpr) => http(name, pos, {
  method: "POST",
  url: TRACE_URL,
  authentication: "genericCredentialType",
  genericAuthType: "httpHeaderAuth",
  sendBody: true,
  specifyBody: "json",
  jsonBody: `={{ JSON.stringify({ run: ${runExpr}, prompt: ${JSON.stringify(WRITE_PROMPT)} }) }}`,
  options: { timeout: 20000 },
}, { maxTries: 2, onError: "continueRegularOutput", ...creds("httpHeaderAuth", "Render token") });

// The run ledger (render service, POST /ledger): one row per run, updated at every step.
const LEDGER_URL = RENDER_URL.replace(/\/render$/, "/ledger");
const logLedger = (name, pos, bodyExpr) => http(name, pos, {
  method: "POST",
  url: LEDGER_URL,
  authentication: "genericCredentialType",
  genericAuthType: "httpHeaderAuth",
  sendBody: true,
  specifyBody: "json",
  jsonBody: `={{ JSON.stringify(${bodyExpr}) }}`,
  options: { timeout: 15000 },
}, { maxTries: 2, onError: "continueRegularOutput", ...creds("httpHeaderAuth", "Render token") });
// Slack's chat.postMessage, for replies in a thread.
const postSlack = (name, pos, bodyExpr, extra = {}) => http(name, pos, {
  method: "POST",
  url: "https://slack.com/api/chat.postMessage",
  authentication: "predefinedCredentialType",
  nodeCredentialType: "slackApi",
  sendBody: true,
  specifyBody: "json",
  jsonBody: `={{ JSON.stringify(${bodyExpr}) }}`,
}, { ...SLACK, onError: "continueRegularOutput", ...extra });
// The client's config as a Code node, so a run carries it without reading files.
const clientNode = (pos) => node("Client", "n8n-nodes-base.code", 2, pos, { jsCode: `// The client this run serves, from 03_build/output/clients/${CLIENT_ID}.json. Change the file, not this node.\nreturn [{ json: ${JSON.stringify(client, null, 2)} }];\n` });

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
    sticky("About Collect", [-40, -460], "## 1 Collect\nPulls 9 weeks of one open dataset, grouped by category, day and neighbourhood. Public, no key, never addresses.\n\nThe orchestrator calls it once per entry in the client's **Data sources**. Its test webhook takes a source object; an empty body uses 3-1-1.\n\nAny failure or stale data ends at **Failed** with `ok: false` and a reason."),
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

// ---------- 2b Context ----------
{
  const n = [
    calledBy([0, 0]), testRun([0, 200]),
    jsonNode("Sample run", [220, 200], { ok: true, story: sampleStory, client: runClient }),
    noop("Input", [440, 100]),
    codeNode("Feeds", [660, 100], "context-feeds.js"),
    http("Fetch feed", [880, 100], {
      url: "={{ $json.url }}",
      sendHeaders: true,
      headerParameters: { parameters: [{ name: "accept", value: "application/json, application/rss+xml, application/xml, text/xml" }] },
      options: { timeout: 20000, response: { response: { responseFormat: "text", outputPropertyName: "data" } } },
    }, { maxTries: 2, onError: "continueRegularOutput" }),
    codeNode("Recent reports", [1100, 100], "context-related.js"),
    sticky("About Context", [-40, -380], "## 2b Context\nFetches every news feed in the client's config (RSS, Environment Canada weather alerts, DriveBC road events) and adds the newest 12 items since the story's week began to the run as `reports`. Write decides which, if any, fit the story.\n\nA feed that fails is listed in `feeds_checked` and skipped: news never stops a run.\n\nAn empty test body uses **Sample run**.", 320),
  ];
  const c = {};
  link(c, "When Executed by Another Workflow", [["Input"]]);
  link(c, "Test run", [["Sample run"]]);
  link(c, "Sample run", [["Input"]]);
  link(c, "Input", [["Feeds"]]);
  link(c, "Feeds", [["Fetch feed"]]);
  link(c, "Fetch feed", [["Recent reports"]]);
  out["2b-context"] = workflow("2b Context", n, c);
}

// ---------- 3 Write ----------
{
  const prompt = code("write-prompt.md");
  // What Claude is given: the client's name and style card, the story, and the recent reports.
  const request = "'Client: ' + JSON.stringify({ name: $('Input').first().json.client?.name, style: $('Input').first().json.client?.style }, null, 2)"
    + " + '\\n\\nStory JSON:\\n' + JSON.stringify($('Input').first().json.story, null, 2)"
    + " + '\\n\\nReports from the client news feeds, newest first:\\n' + JSON.stringify(($('Input').first().json.reports || []).map(r => ({ id: r.id, source: r.source, published: r.published, title: r.title, summary: r.summary })), null, 2)"
    + " + ($('Input').first().json.request ? '\\n\\nAsked for in Slack: ' + $('Input').first().json.request.text : '')";
  const write = http("Write script", [660, 100], {
    method: "POST",
    url: "https://api.anthropic.com/v1/messages",
    authentication: "predefinedCredentialType",
    nodeCredentialType: "anthropicApi",
    sendHeaders: true,
    headerParameters: { parameters: [{ name: "anthropic-version", value: "2023-06-01" }] },
    sendBody: true,
    specifyBody: "json",
    jsonBody: `={{ JSON.stringify({ model: '${MODEL}', max_tokens: 4000, output_config: { effort: 'low' }, system: ${JSON.stringify(prompt)}, messages: [{ role: 'user', content: ${request} }] }) }}`,
    options: { timeout: 60000 },
  }, { maxTries: 2, ...creds("anthropicApi", "Anthropic") });
  const n = [
    calledBy([0, 0]), testRun([0, 200]),
    jsonNode("Sample story", [220, 200], { ok: true, story: sampleStory, client: runClient, reports: sampleReports, test_tamper: false }),
    noop("Input", [440, 100]),
    write,
    codeWith("Build spec and check numbers", [900, 0], "write-check.js", ["spec-build.js"]),
    codeNode("Failed", [900, 240], "write-failed.js"),
    sticky("About Write", [-40, -380], "## 3 Write\nClaude (Anthropic API, credential \"Anthropic\") turns the story into a headline, a short script, a chart title and a newsletter blurb, in the client's style. It may add one sentence of context from a related report and must say which.\n\n**Build spec and check numbers** builds the chart from the story itself and stops the run if any number is not in the story or a report it used (the guard). It records where each number came from.\n\nAn empty test body uses **Sample story**.", 340),
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
    http("Check credits", [1120, 0], {
      url: "https://api.elevenlabs.io/v1/user/subscription",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      options: { timeout: 15000 },
    }, { maxTries: 2, onError: "continueRegularOutput", ...creds("httpHeaderAuth", "ElevenLabs") }),
    codeNode("Add voice cost", [1340, 0], "voice-cost.js"),
    codeNode("Failed", [900, 240], "voice-failed.js"),
    sticky("About Voice", [-40, -340], "## 4 Voice\nElevenLabs reads the script. **Package audio** turns the MP3 into base64 for the render service and stops the run if it is 22 seconds or longer. **Check credits** reads the ElevenLabs plan, so the trace and ledger show the credits used and what they cost.\n\nCredential: Header Auth named \"ElevenLabs\", header `xi-api-key`.\n\nAn empty test body uses **Sample spec**.", 280),
  ];
  const c = {};
  link(c, "When Executed by Another Workflow", [["Input"]]);
  link(c, "Test run", [["Sample spec"]]);
  link(c, "Sample spec", [["Input"]]);
  link(c, "Input", [["Speak script"]]);
  link(c, "Speak script", [["Package audio"], ["Failed"]]);
  link(c, "Package audio", [["Check credits"]]);
  link(c, "Check credits", [["Add voice cost"]]);
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
// Posts an approved video and its blurb to the outlet channel. The editor approves in "7 Chat".
{
  const n = [
    calledBy([0, 0]), testRun([0, 200]),
    jsonNode("Sample run", [220, 200], { ok: true, story: sampleStory, spec: sampleSpec, blurb: sampleBlurb, video_url: "replace with a video_url from 5 Render" }),
    noop("Input", [440, 100]),
    saveTrace("Save final trace", [660, 100], "Object.assign({}, $('Input').first().json, { approved_at: new Date().toISOString() })"),
    http("Download video", [880, 100], {
      url: "={{ $('Input').first().json.video_url }}",
      sendHeaders: true,
      headerParameters: { parameters: [{ name: "ngrok-skip-browser-warning", value: "1" }] },
      options: { timeout: 60000, response: { response: { responseFormat: "file" } } },
    }),
    node("Post to outlet", "n8n-nodes-base.slack", 2.3, [1100, 0], {
      resource: "file",
      binaryData: true,
      binaryPropertyName: "data",
      options: { channelIds: SLACK_CHANNELS.outlet ? [SLACK_CHANNELS.outlet] : [], fileName: "={{ $('Input').first().json.story.topic }}.mp4", initialComment: "={{ $('Input').first().json.spec.headline }}\n\n{{ $('Input').first().json.blurb }}\n\nSource: {{ $('Input').first().json.spec.chart.source_note }}{{ $('Input').first().json.story_page_url ? '\\n\\nHow this story was made: ' + $('Input').first().json.story_page_url : '' }}" },
    }, { onError: "continueErrorOutput", ...SLACK }),
    node("Newsletter draft", "n8n-nodes-base.slack", 2.3, [1320, -100], {
      select: "channel", channelId: channel("outlet"), text: "=Newsletter draft: {{ $('Input').first().json.blurb }}", otherOptions: { includeLinkToWorkflow: false },
    }, { onError: "continueErrorOutput", ...SLACK }),
    codeNode("Published", [1540, -100], "publish-done.js"),
    codeNode("Failed", [1320, 300], "publish-failed.js"),
    sticky("About Publish", [-40, -400], "## 6 Publish\n**Save final trace** updates the run trace with the voice, video, edits and approvals. Then it posts the approved video to the outlet channel with its headline, blurb, sources and the public \"How this story was made\" link, then the newsletter draft. The editor approves it in the Slack thread run by **7 Chat**.\n\nCredential: Slack. Channels come from the client's config file.\n\nIts test webhook posts straight to the outlet channel, so it needs a run with a real `video_url`, such as 5 Render's output.", 340),
  ];
  const c = {};
  link(c, "When Executed by Another Workflow", [["Input"]]);
  link(c, "Test run", [["Sample run"]]);
  link(c, "Sample run", [["Input"]]);
  link(c, "Input", [["Save final trace"]]);
  link(c, "Save final trace", [["Download video"]]);
  link(c, "Download video", [["Post to outlet"], ["Failed"]]);
  link(c, "Post to outlet", [["Newsletter draft"], ["Failed"]]);
  link(c, "Newsletter draft", [["Published"], ["Failed"]]);
  out["6-publish"] = workflow("6 Publish", n, c);
}

// ---------- 7 Chat ----------
// The editor's review, as a conversation in one Slack thread per story. Each thread's draft and
// history live in the n8n data table "editor_threads" (deploy creates it). Slack reaches the
// "Slack event" webhook through the router on the host laptop, which checks Slack's signature.
{
  const SHARED = ["spec-build.js", "chat-cards.js"];
  const fill = {
    __EDITOR_CHANNEL__: SLACK_CHANNELS.editor,
    __OUTLET_CHANNEL__: SLACK_CHANNELS.outlet,
    __MODEL__: CHAT_MODEL,
    __CHAT_PROMPT__: JSON.stringify(code("chat-prompt.md")),
  };
  const chatCode = (name, pos, file) => codeWith(name, pos, file, SHARED, fill);
  const TABLE = { __rl: true, mode: "name", value: "editor_threads" };
  const byThread = { matchType: "allConditions", filters: { conditions: [{ keyName: "thread_ts", condition: "eq", keyValue: "={{ $json.thread_ts }}" }] } };
  const column = (name) => ({ id: name, displayName: name, required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true });
  const slackPost = (name, pos, body, extra = {}) => http(name, pos, {
    method: "POST",
    url: "https://slack.com/api/chat.postMessage",
    authentication: "predefinedCredentialType",
    nodeCredentialType: "slackApi",
    sendBody: true,
    specifyBody: "json",
    jsonBody: body,
  }, { ...SLACK, ...extra });
  const routes = ["revise", "approve_script", "approve_video", "reject"];
  const n = [
    calledBy([0, 0]), testRun([0, 200]),
    jsonNode("Sample run", [220, 200], { ok: true, story: sampleStory, spec: sampleSpec, chart_kind: "by_area", blurb: sampleBlurb, script_words: 47 }),
    chatCode("Start review", [440, 100], "chat-start.js"),
    node("Slack event", "n8n-nodes-base.webhook", 2, [0, 600], { httpMethod: "POST", path: "slack-events", responseMode: "onReceived", options: {} }, { webhookId: id("slack-events webhook") }),
    chatCode("Read Slack event", [220, 600], "chat-read-event.js"),
    ifOk("Request?", [330, 800], "={{ $json.kind === 'request' }}"),
    { ...execWf("8 Request", [550, 860], "8 Request"), onError: "continueRegularOutput" },
    node("Find thread", "n8n-nodes-base.dataTable", 1.1, [440, 600], { resource: "row", operation: "get", dataTableId: TABLE, ...byThread, limit: 1 }),
    chatCode("Decide", [660, 600], "chat-decide.js"),
    node("Route", "n8n-nodes-base.switch", 3.2, [880, 600], {
      rules: {
        values: routes.map((r) => ({
          conditions: {
            options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
            conditions: [{ id: id(`Route ${r}`), leftValue: "={{ $json.route }}", rightValue: r, operator: { type: "string", operation: "equals" } }],
            combinator: "and",
          },
          renameOutput: true,
          outputKey: r,
        })),
      },
      options: {},
    }),
    http("Revise with Claude", [1100, 400], {
      method: "POST",
      url: "https://api.anthropic.com/v1/messages",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "anthropicApi",
      sendHeaders: true,
      headerParameters: { parameters: [{ name: "anthropic-version", value: "2023-06-01" }] },
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.claude_body) }}",
      options: { timeout: 60000 },
    }, { maxTries: 2, ...creds("anthropicApi", "Anthropic") }),
    chatCode("Check revision", [1320, 400], "chat-check.js"),
    ifOk("Needs video?", [1540, 400], "={{ $json.render === true }}"),
    slackPost("Say working on it", [1760, 760], "={{ JSON.stringify({ channel: '" + SLACK_CHANNELS.editor + "', thread_ts: $json.chat.thread_ts, text: $json.working_note }) }}", { onError: "continueRegularOutput" }),
    execWf("Make voice", [1760, 600], "4 Voice"),
    ifOk("Voice ok?", [1980, 600]),
    execWf("Make video", [2200, 600], "5 Render"),
    ifOk("Video ok?", [2420, 600]),
    http("Download video", [2640, 600], {
      url: "={{ $json.video_url }}",
      sendHeaders: true,
      headerParameters: { parameters: [{ name: "ngrok-skip-browser-warning", value: "1" }] },
      options: { timeout: 60000, response: { response: { responseFormat: "file" } } },
    }),
    node("Upload to thread", "n8n-nodes-base.slack", 2.3, [2860, 600], {
      resource: "file",
      binaryData: true,
      binaryPropertyName: "data",
      options: {
        channelId: SLACK_CHANNELS.editor,
        threadTs: "={{ $('Make video').first().json.chat.thread_ts }}",
        fileName: "={{ $('Make video').first().json.story.topic }}.mp4",
        initialComment: "=Video: {{ $('Make video').first().json.spec.headline }}",
      },
    }, { onError: "continueErrorOutput", ...SLACK }),
    chatCode("Video card", [3080, 600], "chat-video-card.js"),
    chatCode("Video failed", [2640, 880], "chat-video-failed.js"),
    execWf("Publish it", [1100, 1000], "6 Publish"),
    ifOk("Published?", [1320, 1000]),
    chatCode("Published note", [1540, 940], "chat-published.js"),
    chatCode("Publish failed note", [1540, 1100], "chat-publish-failed.js"),
    chatCode("Rejected note", [1100, 1220], "chat-rejected.js"),
    noop("Reply ready", [3300, 300]),
    slackPost("Post to Slack", [3520, 300], "={{ JSON.stringify($json.post) }}", { retryOnFail: true, onError: "stopWorkflow" }),
    chatCode("Check Slack", [3740, 300], "chat-saved.js"),
    node("Save thread", "n8n-nodes-base.dataTable", 1.1, [3960, 300], {
      resource: "row", operation: "upsert", dataTableId: TABLE, ...byThread,
      columns: { mappingMode: "autoMapInputData", value: {}, matchingColumns: [], schema: ["thread_ts", "stage", "state"].map(column) },
      options: {},
    }),
    logLedger("Update ledger", [4180, 300], "{ stage: $json.stage, run: JSON.parse($json.state || '{}').run }"),
    sticky("About Chat", [-40, -420], "## 7 Chat\nThe editor's review, as a conversation in one Slack thread per story.\n\n**Start review** posts the headline, script, the data behind it and what goes on screen, with Approve script and Reject. Replies in the thread go to Claude (**Revise with Claude**), and every change passes the same number guard as Write. **Approve script** makes the voice and video and posts them in the thread; replies can still change it, which remakes the video. **Approve and publish** runs 6 Publish.\n\nEach thread's draft and history are saved in the data table `editor_threads`. Slack reaches **Slack event** through the router, which checks Slack's signature. A new message that mentions the bot goes to **8 Request**. **Update ledger** records every step in the run ledger.", 400, 520),
  ];
  const c = {};
  link(c, "When Executed by Another Workflow", [["Start review"]]);
  link(c, "Test run", [["Sample run"]]);
  link(c, "Sample run", [["Start review"]]);
  link(c, "Start review", [["Reply ready"]]);
  link(c, "Slack event", [["Read Slack event"]]);
  link(c, "Read Slack event", [["Request?"]]);
  link(c, "Request?", [["8 Request"], ["Find thread"]]);
  link(c, "Find thread", [["Decide"]]);
  link(c, "Decide", [["Route"]]);
  link(c, "Route", [["Revise with Claude"], ["Say working on it", "Make voice"], ["Publish it"], ["Rejected note"]]);
  link(c, "Revise with Claude", [["Check revision"], ["Check revision"]]);
  link(c, "Check revision", [["Needs video?"]]);
  link(c, "Needs video?", [["Say working on it", "Make voice"], ["Reply ready"]]);
  link(c, "Make voice", [["Voice ok?"], ["Video failed"]]);
  link(c, "Voice ok?", [["Make video"], ["Video failed"]]);
  link(c, "Make video", [["Video ok?"], ["Video failed"]]);
  link(c, "Video ok?", [["Download video"], ["Video failed"]]);
  link(c, "Download video", [["Upload to thread"], ["Video failed"]]);
  link(c, "Upload to thread", [["Video card"], ["Video failed"]]);
  link(c, "Video card", [["Reply ready"]]);
  link(c, "Video failed", [["Reply ready"]]);
  link(c, "Publish it", [["Published?"], ["Publish failed note"]]);
  link(c, "Published?", [["Published note"], ["Publish failed note"]]);
  link(c, "Published note", [["Reply ready"]]);
  link(c, "Publish failed note", [["Reply ready"]]);
  link(c, "Rejected note", [["Reply ready"]]);
  link(c, "Reply ready", [["Post to Slack"]]);
  link(c, "Post to Slack", [["Check Slack"]]);
  link(c, "Check Slack", [["Save thread"]]);
  link(c, "Save thread", [["Update ledger"]]);
  out["7-chat"] = workflow("7 Chat", n, c);
}

// ---------- 8 Request ----------
// Anyone in the editor channel can mention the bot to ask for a video or a quick answer. 7 Chat hands
// the request here. Claude Haiku matches it to a real dataset, category and neighbourhood; code
// builds the story and the answer, so every number comes from the data.
{
  const fill = { __REQUEST_MODEL__: REQUEST_MODEL, __REQUEST_PROMPT__: JSON.stringify(code("request-prompt.md")) };
  const reqCode = (name, pos, file) => codeWith(name, pos, file, [], fill);
  const thread = (textExpr, tsExpr = "$('Input').first().json.ts") =>
    `{ channel: ${tsExpr} ? '${SLACK_CHANNELS.editor}' : '', thread_ts: ${tsExpr}, text: ${textExpr}, unfurl_links: false }`;
  const n = [
    calledBy([0, 0]), testRun([0, 200]),
    jsonNode("Sample request", [220, 200], { kind: "request", text: "make a video about graffiti in Mount Pleasant", user: "U0TEST", ts: "", channel: SLACK_CHANNELS.editor, at: "2026-11-14T20:00:00.000Z" }),
    noop("Input", [440, 100]),
    postSlack("Say looking", [660, -120], thread("'Looking through the data now.'")),
    http("Who asked", [550, 100], {
      url: "https://slack.com/api/users.info",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "slackApi",
      ...query([["user", "={{ $json.user }}"]]),
      options: { timeout: 10000 },
    }, { ...SLACK, maxTries: 1, onError: "continueRegularOutput" }),
    clientNode([770, 100]),
    node("Data sources", "n8n-nodes-base.code", 2, [880, 100], { jsCode: "// One item per dataset in the client's config, for 1 Collect.\nreturn $('Client').first().json.data_sources.map((json) => ({ json }));\n" }),
    { ...execWf("1 Collect", [1100, 100], "1 Collect", "each"), onError: "continueRegularOutput" },
    reqCode("Menu", [1320, 100], "request-menu.js"),
    http("Read request", [1540, 100], {
      method: "POST",
      url: "https://api.anthropic.com/v1/messages",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "anthropicApi",
      sendHeaders: true,
      headerParameters: { parameters: [{ name: "anthropic-version", value: "2023-06-01" }] },
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.claude_body) }}",
      options: { timeout: 60000 },
    }, { maxTries: 2, onError: "continueRegularOutput", ...creds("anthropicApi", "Anthropic") }),
    codeNode("Plan", [1760, 100], "request-plan.js"),
    ifOk("Understood?", [1980, 100]),
    ifOk("Neighbourhood?", [2200, 0], "={{ !!$json.filtered }}"),
    node("Neighbourhood source", "n8n-nodes-base.code", 2, [2420, -120], { jsCode: "// The source with a filter for the one neighbourhood asked about, for 1 Collect.\nreturn [{ json: $json.filtered }];\n" }),
    { ...execWf("Collect neighbourhood", [2640, -120], "1 Collect"), onError: "continueRegularOutput" },
    codeNode("Requested story", [2860, 0], "request-story.js"),
    ifOk("Story ok?", [3080, 0]),
    ifOk("Answer only?", [3300, 0], "={{ $json.kind === 'answer' }}"),
    postSlack("Post answer", [3520, -120], thread("$json.answer + '\\n_Want a video? Ask \"@Newsroom make a video about\" the same thing._'", "$json.request.ts")),
    logLedger("Log answer", [3740, -120], "{ status: 'Answered in Slack', run: $('Requested story').first().json }"),
    execWf("2b Context", [3520, 100], "2b Context"),
    execWf("3 Write", [3740, 100], "3 Write"),
    ifOk("Numbers check out?", [3960, 100]),
    saveTrace("Save trace", [4180, 100], "$json"),
    codeNode("Add trace link", [4400, 100], "trace-link.js"),
    // Through 7 Chat's webhook, not Execute Workflow: n8n will not switch on two workflows that call each other.
    http("Start review", [4620, 100], { method: "POST", url: "http://127.0.0.1:5678/webhook/step-chat", sendBody: true, specifyBody: "json", jsonBody: "={{ JSON.stringify($json) }}", options: { timeout: 60000 } }, { onError: "continueRegularOutput" }),
    postSlack("Say it stopped", [4180, 320], thread("'I could not write that one: ' + ($json.reason || 'a step failed') + ' Try asking another way.'", "$('Requested story').first().json.request.ts")),
    logLedger("Log stopped", [4400, 320], "{ status: 'Stopped: ' + ($('3 Write').first().json.reason || $('3 Write').first().json.error?.message || 'a step failed'), run: $('Requested story').first().json }"),
    postSlack("Ask again", [2200, 380], thread("$json.reply", "$json.request.ts")),
    logLedger("Log not understood", [2420, 380], "{ status: 'Not understood; asked again', run: { request: $('Plan').first().json.request, run_id: 'request-' + $('Input').first().json.ts, client: { name: $('Client').first().json.name }, reason: $('Plan').first().json.ok === false ? $('Plan').first().json.reply : $('Requested story').first().json.reply } }"),
    sticky("About Request", [-40, -460], "## 8 Request\nAnyone in the editor channel can write \"@Newsroom make a video about graffiti in Mount Pleasant\" or ask \"@Newsroom how many noise complaints this week?\". **7 Chat** hands the message here.\n\n**Collect** gets every data source; **Read request** (Claude Haiku) matches the ask to a real category and neighbourhood; **Plan** checks the match. A neighbourhood gets its own 9 weeks of data. **Requested story** builds the story and a one-line answer from the numbers.\n\nA question gets the answer in the thread. A video request runs Context and Write, then **Start review** opens the usual review in the same thread through 7 Chat's webhook. Every outcome goes to the run ledger.", 400, 560),
  ];
  const c = {};
  link(c, "When Executed by Another Workflow", [["Input"]]);
  link(c, "Test run", [["Sample request"]]);
  link(c, "Sample request", [["Input"]]);
  link(c, "Input", [["Say looking", "Who asked"]]);
  link(c, "Who asked", [["Client"]]);
  link(c, "Client", [["Data sources"]]);
  link(c, "Data sources", [["1 Collect"]]);
  link(c, "1 Collect", [["Menu"]]);
  link(c, "Menu", [["Read request"]]);
  link(c, "Read request", [["Plan"]]);
  link(c, "Plan", [["Understood?"]]);
  link(c, "Understood?", [["Neighbourhood?"], ["Ask again"]]);
  link(c, "Neighbourhood?", [["Neighbourhood source"], ["Requested story"]]);
  link(c, "Neighbourhood source", [["Collect neighbourhood"]]);
  link(c, "Collect neighbourhood", [["Requested story"]]);
  link(c, "Requested story", [["Story ok?"]]);
  link(c, "Story ok?", [["Answer only?"], ["Ask again"]]);
  link(c, "Answer only?", [["Post answer"], ["2b Context"]]);
  link(c, "Post answer", [["Log answer"]]);
  link(c, "2b Context", [["3 Write"]]);
  link(c, "3 Write", [["Numbers check out?"], ["Say it stopped"]]);
  link(c, "Numbers check out?", [["Save trace"], ["Say it stopped"]]);
  link(c, "Save trace", [["Add trace link"]]);
  link(c, "Add trace link", [["Start review"]]);
  link(c, "Say it stopped", [["Log stopped"]]);
  link(c, "Ask again", [["Log not understood"]]);
  out["8-request"] = workflow("8 Request", n, c);
}

// ---------- 0 Orchestrator ----------
{
  const n = [
    testRun([0, 200]),
    node("Every morning", "n8n-nodes-base.scheduleTrigger", 1.2, [0, 0], { rule: { interval: [{ triggerAtHour: 7 }] } }, { disabled: true }),
    clientNode([220, 100]),
    node("Data sources", "n8n-nodes-base.code", 2, [440, 100], { jsCode: "// One item per dataset in the client's config, for 1 Collect.\nreturn $('Client').first().json.data_sources.map((json) => ({ json }));\n" }),
    { ...execWf("1 Collect", [660, 100], "1 Collect", "each"), onError: "continueRegularOutput" },
    execWf("2 Score", [880, 100], "2 Score", "once"),
    ifOk("Story found?", [1100, 100]),
    codeNode("Run options", [1320, 0], "run-options.js"),
    execWf("2b Context", [1540, 0], "2b Context"),
    execWf("3 Write", [1760, 0], "3 Write"),
    ifOk("Numbers check out?", [1980, 0]),
    saveTrace("Save trace", [2200, 0], "$json"),
    codeNode("Add trace link", [2420, 0], "trace-link.js"),
    execWf("7 Chat", [2640, 0], "7 Chat"),
    codeNode("Why it stopped", [1980, 400], "why-stopped.js"),
    node("No story today", "n8n-nodes-base.slack", 2.3, [2200, 400], { select: "channel", channelId: channel("editor"), text: "={{ $json.text }}", otherOptions: { includeLinkToWorkflow: false } }, SLACK),
    logLedger("Log no story", [2420, 400], "{ status: 'No story', run: { run_id: 'run-' + $execution.id, trigger: $('Every morning').isExecuted ? 'Daily run' : 'Test run', client: { name: $('Client').first().json.name }, reason: $('Why it stopped').first().json.text } }"),
    sticky("About the newsroom", [-40, -460], `## 0 Orchestrator\nRuns newsReels for one client, **${client.name}**. **Client** holds its config; **Data sources** lists its datasets. **1 Collect** runs once per dataset, **2 Score** picks the week's strongest change, **2b Context** adds recent reports from the client's news feeds, **3 Write** drafts it, **Save trace** writes the run trace pages, and **7 Chat** posts the draft, its data and the trace link to the editor in Slack. From there the editor's thread drives Voice, Render and Publish.\n\nIf any step says \`ok: false\`, or errors, **No story today** tells the editor why in Slack.\n\n**Every morning** stays off while building. To test the guard, set \`test_tamper\` to true in **Run options**.`, 400, 540),
  ];
  const c = {};
  link(c, "Test run", [["Client"]]);
  link(c, "Every morning", [["Client"]]);
  link(c, "Client", [["Data sources"]]);
  link(c, "Data sources", [["1 Collect"]]);
  link(c, "1 Collect", [["2 Score"]]);
  link(c, "2 Score", [["Story found?"], ["Why it stopped"]]);
  link(c, "Story found?", [["Run options"], ["Why it stopped"]]);
  link(c, "Run options", [["2b Context"]]);
  link(c, "2b Context", [["3 Write"], ["Why it stopped"]]);
  link(c, "3 Write", [["Numbers check out?"], ["Why it stopped"]]);
  link(c, "Numbers check out?", [["Save trace"], ["Why it stopped"]]);
  link(c, "Save trace", [["Add trace link"]]);
  link(c, "Add trace link", [["7 Chat"]]);
  link(c, "7 Chat", [[], ["Why it stopped"]]);
  link(c, "Why it stopped", [["No story today"]]);
  link(c, "No story today", [["Log no story"]]);
  out["0-orchestrator"] = workflow("0 Orchestrator", n, c);
}

mkdirSync(OUT, { recursive: true });
for (const [file, wf] of Object.entries(out)) {
  writeFileSync(path.join(OUT, `${file}.json`), JSON.stringify(wf, null, 2) + "\n");
  writeFileSync(path.join(OUT, `${file}.svg`), toSvg(wf)); // the canvas picture shown in README.md
  console.log(`${file}.json: ${wf.nodes.length} nodes`);
}
