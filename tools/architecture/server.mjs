// Live status server for the NewsReels architecture page.
// Serves index.html and /status.json, built from this repo and live probes.
import http from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// The repo root holds the ICM stages.
const SPACE = process.env.SPACE || path.resolve(here, "../..");
const PORT = Number(process.env.PORT || 4310);

const f = (p) => path.join(SPACE, p);
const has = (p) => existsSync(f(p));
const list = async (p) => {
  try {
    return await readdir(f(p));
  } catch {
    return [];
  }
};
const text = async (p) => {
  try {
    return await readFile(f(p), "utf8");
  } catch {
    return "";
  }
};

// Event clock is wall-clock local time. Sent without an offset so the browser reads it in the
// Mac's own time zone; Node's bundled zone data disagrees with macOS about Vancouver's offset.
const pad = (n) => String(n).padStart(2, "0");
const at = (day, h, m = 0) => `2026-11-${pad(day)}T${pad(h)}:${pad(m)}:00`;
const STOPS = [
  { at: at(14, 12), label: "Hacking starts" },
  { at: at(14, 13), label: "Idea locked" },
  { at: at(14, 14), label: "Storyboard approved, first render proven" },
  { at: at(14, 18), label: "Rough end to end run" },
  { at: at(14, 21), label: "Spec agreed" },
  { at: at(15, 13), label: "Build frozen" },
  { at: at(15, 14, 15), label: "Video uploaded" },
  { at: at(15, 14, 45), label: "Devpost submitted" },
  { at: at(15, 15), label: "Feature freeze, last push" },
  { at: at(15, 15, 45), label: "Submissions lock", hard: true },
];

const cache = new Map();
async function probe(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v;
  let v;
  try {
    v = await fn();
  } catch (e) {
    v = { ok: false, note: String(e?.cause?.code || e?.message || e).slice(0, 80) };
  }
  cache.set(key, { t: Date.now(), v });
  return v;
}
async function get(url, init = {}) {
  const t0 = Date.now();
  const r = await fetch(url, { signal: AbortSignal.timeout(4000), ...init, headers: { "ngrok-skip-browser-warning": "1", ...init.headers } });
  return { r, ms: Date.now() - t0 };
}

// The client file: Slack channels, the Statistics Canada series and the news feeds to probe.
const CLIENT_FILE = "03_build/output/clients/rain-city-ledger.json";
async function clientConfig() {
  try {
    return JSON.parse(await text(CLIENT_FILE));
  } catch {
    return null;
  }
}

const probes = {
  render: () =>
    probe("render", 3000, async () => {
      const { r, ms } = await get("http://127.0.0.1:8787/health");
      return { ok: r.ok, ms, note: r.ok ? "answering on port 8787" : `status ${r.status}` };
    }),
  tunnel: () =>
    probe("tunnel", 3000, async () => {
      const { r } = await get("http://127.0.0.1:4040/api/tunnels");
      const j = await r.json();
      const t = (j.tunnels || []).find((x) => String(x.config?.addr || "").includes("8787")) || j.tunnels?.[0];
      if (!t) return { ok: false, note: "ngrok running, no tunnel" };
      return { ok: true, note: new URL(t.public_url).host };
    }),
  n8n: () =>
    probe("n8n", 30000, async () => {
      const { r, ms } = await get("https://paratactical-professionally-yasuko.ngrok-free.dev/healthz");
      return { ok: r.ok, ms, note: r.ok ? "n8n on the host laptop is up" : `status ${r.status}` };
    }),
  vancouver: () =>
    probe("vancouver", 60000, async () => {
      const u =
        "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/3-1-1-service-requests/records" +
        "?limit=1&select=last_modified_timestamp&order_by=last_modified_timestamp%20desc";
      const { r, ms } = await get(u);
      const j = await r.json();
      const last = j.results?.[0]?.last_modified_timestamp;
      return { ok: r.ok, ms, last, note: last ? "311 data updated " + last : "answering" };
    }),
  // The two public sources outside the city: checked every 10 minutes.
  statcan: (series) =>
    probe("statcan", 600000, async () => {
      if (!series?.vector) return { ok: false, note: "no series in the client file" };
      const { r, ms } = await get("https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify([{ vectorId: series.vector, latestN: 1 }]),
      });
      const j = await r.json();
      const p = j?.[0]?.object?.vectorDataPoint?.[0];
      return { ok: r.ok && j?.[0]?.status === "SUCCESS", ms, note: p ? `${series.label}: ${p.value}${series.unit || ""} for ${String(p.refPer).slice(0, 7)}` : "answering" };
    }),
  feeds: (feeds = []) =>
    probe("feeds", 600000, async () => {
      const results = await Promise.all(feeds.map((fd) => get(fd.url).then(({ r }) => r.ok, () => false)));
      const up = results.filter(Boolean).length;
      return { ok: feeds.length > 0 && up === feeds.length, some: up > 0, note: `${up} of ${feeds.length} feeds answering` };
    }),
};

function parseMustWork(md) {
  const rows = [];
  for (const line of md.split("\n")) {
    const m = line.match(/^\|\s*(\d+)\s*\|(.*)\|\s*$/);
    if (!m) continue;
    const cells = m[2].split("|").map((s) => s.trim());
    const key = (cells[0].match(/\*\*(\w+)/) || [])[1]?.toLowerCase() || "";
    rows.push({ n: Number(m[1]), key, step: cells[0].replace(/\*\*/g, ""), beat: cells[1], test: cells[2], owner: cells[3] || "" });
  }
  return rows;
}
function parseContracts(md) {
  const out = [];
  // "`source` (Orchestrator to Collect), one per ...:" or "`story`:", then a json block.
  const re = /`(\w+)`(?: \(([^)]*)\))?[^\n]*:\s*```json\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md))) out.push({ name: m[1], between: m[2] || "", json: m[3].trim() });
  return out;
}
function parseOpen(md) {
  const sec = md.split(/^## Open for the team\s*$/m)[1];
  if (!sec) return [];
  return sec
    .split(/^## /m)[0]
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim());
}

async function status() {
  const client = await clientConfig();
  const series = client?.series_sources?.[0];
  const [render, tunnel, n8n, vancouver, statcan, feeds] = await Promise.all([
    probes.render(),
    probes.tunnel(),
    probes.n8n(),
    probes.vancouver(),
    probes.statcan(series),
    probes.feeds(client?.news_feeds),
  ]);
  const mustMd = await text("02_storyboard/output/must-work.md");
  const storyMd = await text("02_storyboard/output/storyboard.md");
  const services = (await text("03_build/output/services.md")).toLowerCase();
  const testLog = await text("03_build/output/test-log.md");
  const wf = (await list("03_build/output/workflows")).filter((n) => n.endsWith(".json"));
  const exported = (k) => wf.some((n) => n.toLowerCase().includes(k));
  const must = parseMustWork(mustMd);
  const owner = (...keys) =>
    [...new Set(must.filter((r) => keys.includes(r.key)).map((r) => r.owner).filter(Boolean))].join(", ");
  const approved = /^Approved/m.test(storyMd);
  const renderBuilt = has("03_build/output/render-service/server.mjs");
  const passes = (testLog.match(/\bpass\b/gi) || []).length;

  // Trace pages and ledger rows saved by the render service (git-ignored, so only on the host laptop).
  const files = await list("03_build/output/render-service/files");
  const traces = files.filter((n) => /^trace-.*\.html$/.test(n)).length;
  let runs = null;
  try {
    const rows = JSON.parse(await text("03_build/output/render-service/files/ledger.json"));
    runs = Array.isArray(rows) ? rows.length : null;
  } catch {}
  const pagesBuilt = has("03_build/output/render-service/trace-page.mjs") && has("03_build/output/render-service/ledger.mjs");
  const pagesNote = [traces ? `${traces} trace page${traces === 1 ? "" : "s"}` : "", runs != null ? `${runs} run${runs === 1 ? "" : "s"} in the ledger` : ""].filter(Boolean).join(", ");
  const channel = (k) => Boolean(client?.slack?.[k]);
  const reddit = client?.reddit?.enabled ? "2c Reddit on" : exported("reddit") ? "2c Reddit built, off until its credential is connected" : "";

  // Workflow files are 0-orchestrator, 1-collect, 2-score, 2b-context, 2c-reddit, 3-write, 4-voice,
  // 5-render, 6-publish, 7-chat and 8-request: exported means built.
  const wfState = (k) => (exported(k) ? "built" : "todo");
  const components = {
    client: { state: client ? "built" : "todo", note: client ? client.name : "no client file", owner: owner("client") },
    src_van: { state: vancouver.ok ? "live" : "down", note: vancouver.note },
    src_news: { state: feeds.ok ? "live" : feeds.some ? "built" : "down", note: feeds.note },
    src_sc: { state: statcan.ok ? "live" : "down", note: statcan.note },
    orch: { state: wfState("orchestrator"), owner: owner("canvas", "quiet") },
    collect: { state: wfState("collect"), owner: owner("collect") },
    score: { state: wfState("score"), owner: owner("score") },
    context: { state: wfState("context"), note: reddit, owner: owner("context", "web", "reactions") },
    write: { state: wfState("write"), owner: owner("write", "guard") },
    voice: { state: wfState("voice"), owner: owner("voice") },
    render: { state: wfState("render"), owner: owner("render", "free") },
    publish: { state: wfState("publish"), owner: owner("publish") },
    chat: { state: wfState("chat"), owner: owner("approve", "chart", "free") },
    request: { state: wfState("request"), owner: owner("request", "unemployment") },
    claude: { state: services.includes("anthropic api") ? "built" : "todo", note: "Sonnet 5.5 and Haiku 5.5" },
    eleven: { state: services.includes("elevenlabs") ? "built" : "todo" },
    editor: { state: channel("editor") ? "built" : "todo", note: channel("editor") ? "channel set in the client file" : "no channel ID yet", owner: owner("approve") },
    outlet: { state: channel("outlet") ? "built" : "todo", note: channel("outlet") ? "channel set in the client file" : "no channel ID yet", owner: owner("publish") },
    rsvc: { state: render.ok ? "live" : renderBuilt ? "built" : "todo", note: render.ok ? render.note : renderBuilt ? "code exists, server not running" : "not started", owner: owner("render") },
    pages: { state: render.ok && pagesBuilt ? "live" : pagesBuilt ? "built" : "todo", note: pagesNote || (pagesBuilt ? "no runs saved on this machine" : "not started"), owner: owner("trace", "ledger") },
    tunnel: { state: tunnel.ok ? "live" : "todo", note: tunnel.note },
    n8n: { state: n8n.ok ? "live" : "down", note: n8n.note },
  };

  const stages = [
    { id: "01_idea", label: "Idea", state: has("01_idea/output/pick.md") ? "done" : "active", note: has("01_idea/output/pick.md") ? "NewsReels picked" : "Choosing" },
    { id: "02_storyboard", label: "Storyboard", state: !has("02_storyboard/output/must-work.md") ? "todo" : approved ? "done" : "review", note: approved ? "Approved" : has("02_storyboard/output/must-work.md") ? "Drafted, waiting for the team" : "Not started" },
    { id: "03_build", label: "Build", state: wf.length || renderBuilt ? "active" : "todo", note: `${wf.length} workflow${wf.length === 1 ? "" : "s"} exported, render service ${renderBuilt ? "written" : "not written"}, ${passes} logged pass${passes === 1 ? "" : "es"}` },
    { id: "04_demo", label: "Demo video", state: has("04_demo/output/link.md") ? "done" : has("04_demo/output/demo.mp4") ? "active" : "todo", note: has("04_demo/output/link.md") ? "Uploaded" : has("04_demo/output/demo.mp4") ? "Cut, not uploaded" : "Not started" },
    { id: "05_submit", label: "Submit", state: has("05_submit/output/checklist.md") ? "done" : has("05_submit/output/devpost.md") ? "active" : "todo", note: has("05_submit/output/checklist.md") ? "Submitted" : "Not started" },
  ];

  return {
    generated: new Date().toISOString(),
    stops: STOPS,
    stages,
    components,
    probes: { render, tunnel, n8n, vancouver, statcan, feeds },
    must,
    contracts: parseContracts(await text("_config/contracts.md")),
    open: parseOpen(storyMd),
    workflows: wf,
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/status.json") {
      const body = JSON.stringify(await status());
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      return res.end(body);
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = await readFile(path.join(here, "index.html"));
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      return res.end(html);
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("error " + (e?.message || e));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`NewsReels architecture on http://127.0.0.1:${PORT}`);
});
