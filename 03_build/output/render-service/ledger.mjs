// The run ledger: one row per run, whoever started it, kept in files/ledger.json and shown as one page.
// n8n reports to it at every step (POST /ledger), and every trace save updates it too.
import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { totalCost, usd } from "./costs.mjs";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const time = (iso) => (iso ? `<time datetime="${esc(iso)}">${esc(String(iso).slice(0, 16).replace("T", " "))} UTC</time>` : "");

const STAGES = { script: "Script drafted, in review", video: "Video made, in review", published: "Published", rejected: "Rejected" };

// A ledger row from a run. `status` wins over what the run implies.
export function entryFrom(run = {}, status) {
  const cost = totalCost(run);
  return {
    id: String(run.run_id || run.trace_id || run.request?.ts || `run-${Date.now()}`),
    started_at: run.started_at || run.request?.at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    client: run.client?.name || "",
    trigger: run.request ? "Slack request" : run.trigger || "Pipeline run",
    requested_by: run.request?.user_name || run.request?.user || null,
    asked: run.request?.text || null,
    kind: run.kind || (run.request ? run.request.kind : "video"),
    what: run.spec?.headline || run.answer_line || run.reason || "",
    status: status || (run.approved_at ? "Published" : run.video_url ? "Video made, in review" : run.spec ? "Script drafted, in review" : "Done"),
    claude_usd: cost.claude,
    voice_credits: cost.voice.credits,
    voice_usd: cost.voice.usd,
    total_usd: cost.usd,
    trace_url: run.trace_url || null,
    story_url: run.approved_at ? run.story_page_url || null : null,
    video_url: run.video_url || null,
  };
}

export function ledgerStore(dir, name) {
  const json = path.join(dir, "ledger.json");
  const html = path.join(dir, `${name}.html`);
  const load = () => {
    try {
      return existsSync(json) ? JSON.parse(readFileSync(json, "utf8")) : [];
    } catch {
      return [];
    }
  };
  let queue = Promise.resolve();
  // Rows are merged by id, so a run's later reports update its row instead of adding one.
  const upsert = (entry) => {
    queue = queue.then(async () => {
      const rows = load();
      const i = rows.findIndex((r) => r.id === entry.id);
      if (i >= 0) {
        const keep = Object.fromEntries(Object.entries(entry).filter(([, v]) => v !== null && v !== "" && v !== undefined));
        rows[i] = { ...rows[i], ...keep, started_at: rows[i].started_at };
      } else rows.push(entry);
      rows.sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)));
      await writeFile(json, JSON.stringify(rows, null, 2));
      await writeFile(html, ledgerPage(rows));
    });
    return queue;
  };
  return { upsert, stageStatus: (stage) => STAGES[stage] };
}

function ledgerPage(rows) {
  const sum = (k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const published = rows.filter((r) => r.status === "Published").length;
  const voiceKnown = rows.every((r) => !r.voice_credits || r.voice_usd !== null);
  const body = rows.map((r) => `<tr>
    <td>${time(r.started_at)}</td>
    <td>${esc(r.trigger)}${r.requested_by ? `<br><span class="muted">${esc(r.requested_by)}</span>` : ""}</td>
    <td>${r.asked ? `<em>"${esc(r.asked)}"</em><br>` : ""}${esc(r.what)}</td>
    <td>${esc(r.status)}</td>
    <td>${usd(r.claude_usd)}</td>
    <td>${r.voice_credits ? `${r.voice_credits} credits<br>${usd(r.voice_usd)}` : "none"}</td>
    <td>${[r.trace_url && `<a href="${esc(r.trace_url)}">trace</a>`, r.story_url && `<a href="${esc(r.story_url)}">public page</a>`, r.video_url && `<a href="${esc(r.video_url)}">video</a>`].filter(Boolean).join("<br>")}</td>
  </tr>`).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>newsReels run ledger</title>
<style>
  :root { --bg: #f6f7f9; --card: #fff; --text: #1c2430; --muted: #5b6575; --line: #dde2ea; --accent: #b7791f; }
  @media (prefers-color-scheme: dark) { :root { --bg: #11161d; --card: #1a212b; --text: #eef1f5; --muted: #a3adbb; --line: #2c3542; --accent: #f2b33d; } }
  body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.45 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
  main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 64px; }
  .kicker { color: var(--accent); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-size: 13px; margin: 0; }
  h1 { margin: 6px 0 16px; font-size: 26px; }
  .stats { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
  .stat { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px; min-width: 140px; }
  .stat b { display: block; font-size: 22px; }
  .scroll { overflow-x: auto; background: var(--card); border: 1px solid var(--line); border-radius: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { color: var(--muted); font-weight: 600; }
  .muted { color: var(--muted); }
  a { color: inherit; }
</style></head><body><main>
<p class="kicker">newsReels</p><h1>Run ledger</h1>
<div class="stats">
  <div class="stat"><b>${rows.length}</b>runs</div>
  <div class="stat"><b>${published}</b>published</div>
  <div class="stat"><b>${usd(sum("claude_usd"))}</b>Claude</div>
  <div class="stat"><b>${sum("voice_credits")}</b>ElevenLabs credits${voiceKnown ? `, ${usd(sum("voice_usd"))}` : ""}</div>
</div>
<div class="scroll"><table><tr><th>Started</th><th>Who</th><th>What</th><th>Status</th><th>Claude</th><th>ElevenLabs</th><th>Links</th></tr>
${body}
</table></div>
<p class="muted">Every run newsReels makes, newest first: scheduled stories, Slack requests, quick answers and runs that found no story. Each row updates as its run moves on. Rendering runs on our own laptop and costs nothing.</p>
</main><script>document.querySelectorAll("time[datetime]").forEach((t) => { const d = new Date(t.dateTime); if (!isNaN(d)) t.textContent = d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); });</script></body></html>
`;
}
