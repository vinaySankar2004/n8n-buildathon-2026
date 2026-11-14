// Live status server for the LOOP newsroom architecture page.
// Serves index.html and /status.json, built from the ICM space and live probes.
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
  { at: at(14, 15), label: "Render fallback decision" },
  { at: at(14, 18), label: "Rough end to end run" },
  { at: at(15, 11), label: "Build frozen" },
  { at: at(15, 12), label: "Demo recorded" },
  { at: at(15, 13, 30), label: "Video uploaded" },
  { at: at(15, 14, 30), label: "Submitted" },
  { at: at(15, 15), label: "Submissions close", hard: true },
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
async function get(url) {
  const t0 = Date.now();
  const r = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { "ngrok-skip-browser-warning": "1" } });
  return { r, ms: Date.now() - t0 };
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
  const re = /`(\w+)` \(([^)]*)\):\s*```json\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md))) out.push({ name: m[1], between: m[2], json: m[3].trim() });
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
  const [render, tunnel, n8n, vancouver] = await Promise.all([
    probes.render(),
    probes.tunnel(),
    probes.n8n(),
    probes.vancouver(),
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

  const wfState = (k) => (exported(k) ? "built" : "todo");
  const components = {
    src_van: { state: vancouver.ok ? "live" : "down", note: vancouver.note },
    src_sc: { state: "planned", note: "not in the first version" },
    orch: { state: wfState("orchestrator"), owner: owner("canvas") },
    collect: { state: wfState("collect"), owner: owner("collect") },
    score: { state: wfState("score"), owner: owner("score") },
    write: { state: wfState("write"), owner: owner("write") },
    voice: { state: wfState("voice"), owner: owner("voice") },
    render: { state: wfState("render"), owner: owner("render") },
    publish: { state: wfState("publish"), owner: owner("approve", "publish") },
    eleven: { state: services.includes("elevenlabs") ? "built" : "todo", owner: owner("voice") },
    tunnel: { state: tunnel.ok ? "live" : "todo", note: tunnel.note, owner: owner("render") },
    rsvc: { state: render.ok ? "live" : renderBuilt ? "built" : "todo", note: render.ok ? render.note : renderBuilt ? "code exists, server not running" : "not started", owner: owner("render") },
    slack: { state: services.includes("slack") ? "built" : "todo", owner: owner("approve") },
    outlet: { state: services.includes("outlet") || services.includes("lovable") ? "built" : "todo", owner: owner("publish") },
    n8n: { state: n8n.ok ? "live" : "down", note: n8n.note },
  };

  const stages = [
    { id: "01_idea", label: "Idea", state: has("01_idea/output/pick.md") ? "done" : "active", note: has("01_idea/output/pick.md") ? "Local data newsroom picked" : "Choosing" },
    { id: "02_storyboard", label: "Storyboard", state: !has("02_storyboard/output/must-work.md") ? "todo" : approved ? "done" : "review", note: approved ? "Approved" : has("02_storyboard/output/must-work.md") ? "Drafted, waiting for the team" : "Not started" },
    { id: "03_build", label: "Build", state: wf.length || renderBuilt ? "active" : "todo", note: `${wf.length} workflows exported, render service ${renderBuilt ? "written" : "not written"}, ${passes} logged passes` },
    { id: "04_demo", label: "Demo video", state: has("04_demo/output/link.md") ? "done" : has("04_demo/output/demo.mp4") ? "active" : "todo", note: has("04_demo/output/link.md") ? "Uploaded" : has("04_demo/output/demo.mp4") ? "Cut, not uploaded" : "Not started" },
    { id: "05_submit", label: "Submit", state: has("05_submit/output/checklist.md") ? "done" : has("05_submit/output/devpost.md") ? "active" : "todo", note: has("05_submit/output/checklist.md") ? "Submitted" : "Not started" },
  ];

  return {
    generated: new Date().toISOString(),
    stops: STOPS,
    stages,
    components,
    probes: { render, tunnel, n8n, vancouver },
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
  console.log(`LOOP newsroom architecture on http://127.0.0.1:${PORT}`);
});
