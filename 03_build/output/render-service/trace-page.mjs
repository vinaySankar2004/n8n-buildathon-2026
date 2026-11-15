// The run trace, as two plain HTML pages saved next to the videos in files/.
// Editor page: every source, the ranking, the news offered, what Claude was asked and answered,
// where each number came from, the edits and approvals, and the cost.
// Public page ("How this story was made"): the same story and sources without prompts, costs or messages.

// Prices per million tokens, from Anthropic's model list on 2026-11-14.
const PRICES = {
  "claude-sonnet-5-5": { in: 2, out: 10 },
  "claude-haiku-5-5": { in: 0.1, out: 0.5 },
};

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const link = (url, text) => (url ? `<a href="${esc(url)}">${esc(text)}</a>` : esc(text));
// Times go out as exact instants; the reader's browser shows them in its own zone. Node's bundled zone
// data puts Vancouver an hour off from macOS (F1), so the server never formats local times itself.
const when = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return esc(iso);
  return `<time datetime="${d.toISOString()}">${d.toISOString().slice(0, 16).replace("T", " ")} UTC</time>`;
};
const LOCAL_TIMES = `<script>document.querySelectorAll("time[datetime]").forEach((t) => { const d = new Date(t.dateTime); if (!isNaN(d)) t.textContent = d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); });</script>`;
const pretty = (x) => `<pre>${esc(JSON.stringify(x, null, 2))}</pre>`;

// Where a number came from, in plain words.
function plainOrigin(from, story, reports) {
  if (!from) return "not found";
  if (from === "story this_week") return `${story.dataset}: this week's count`;
  if (from === "story avg_prev_8_weeks") return `${story.dataset}: average per week over the 8 weeks before`;
  if (from === "story ratio") return "this week's count divided by that average";
  if (from === "story pct_change") return "change from that average, in percent";
  if (from.startsWith("story by_area, ")) return `${story.dataset}: ${from.slice(15)}, this week`;
  if (from.startsWith("story weekly, ")) return `${story.dataset}: ${from.slice(14)}`;
  if (from.startsWith("the window")) return `the comparison window (${from.slice(12)})`;
  const m = from.match(/^report (r\d+)/);
  if (m) {
    const r = reports.find((x) => x.id === m[1]);
    return r ? `${r.source}: "${r.title}"` : from;
  }
  return "the story data";
}

function cost(run) {
  const calls = [];
  if (run.write?.usage) calls.push({ what: "Write the draft", model: run.write.model, usage: run.write.usage });
  for (const r of run.revisions || []) if (r.usage) calls.push({ what: `Revise: "${r.editor}"`, model: r.model, usage: r.usage });
  let dollars = 0;
  const rows = calls.map((c) => {
    const p = PRICES[c.model] || PRICES["claude-sonnet-5-5"];
    const usd = (c.usage.input_tokens * p.in + c.usage.output_tokens * p.out) / 1e6;
    dollars += usd;
    return `<tr><td>${esc(c.what)}</td><td>${esc(c.model)}</td><td>${c.usage.input_tokens}</td><td>${c.usage.output_tokens}</td><td>$${usd.toFixed(4)}</td></tr>`;
  });
  return { rows, dollars };
}

const STYLE = `
  :root { --bg: #f6f7f9; --card: #fff; --text: #1c2430; --muted: #5b6575; --line: #dde2ea; --ok: #1f7a43; --bad: #b3261e; --accent: #b7791f; }
  @media (prefers-color-scheme: dark) { :root { --bg: #11161d; --card: #1a212b; --text: #eef1f5; --muted: #a3adbb; --line: #2c3542; --ok: #5fcf8e; --bad: #ff8a80; --accent: #f2b33d; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.5 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
  main { max-width: 860px; margin: 0 auto; padding: 24px 16px 64px; }
  header p { margin: 0; color: var(--muted); }
  h1 { font-size: 28px; line-height: 1.2; margin: 6px 0 8px; }
  h2 { font-size: 18px; margin: 0 0 10px; }
  section { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin-top: 16px; }
  .kicker { color: var(--accent); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-size: 13px; }
  .muted { color: var(--muted); }
  .ok { color: var(--ok); font-weight: 700; }
  .bad { color: var(--bad); font-weight: 700; }
  blockquote { margin: 8px 0; padding: 8px 12px; border-left: 4px solid var(--accent); background: var(--bg); border-radius: 0 8px 8px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { color: var(--muted); font-weight: 600; }
  .scroll { overflow-x: auto; }
  pre { white-space: pre-wrap; word-break: break-word; background: var(--bg); padding: 10px; border-radius: 8px; font-size: 12.5px; }
  details summary { cursor: pointer; color: var(--muted); }
  ol.steps { padding-left: 20px; margin: 0; }
  a { color: inherit; }
`;

export function tracePage(run, { prompt, editor }) {
  const s = run.story || {};
  const spec = run.spec || {};
  const client = run.client || {};
  const reports = run.reports || [];
  const usedIds = new Set((run.reports_used || []).map((r) => r.id));
  const checks = run.write?.number_checks || [];
  const published = Boolean(run.approved_at);
  const status = published ? "Approved for publishing" : run.video_url ? "Video made, waiting for the editor" : "Script drafted, waiting for the editor";
  const out = [];

  out.push(`<header><p class="kicker">${esc(client.name || "newsReels")} · ${editor ? "Run trace" : "How this story was made"}</p>`);
  out.push(`<h1>${esc(spec.headline)}</h1>`);
  out.push(`<p>${editor ? `${esc(status)} · run started ${when(run.started_at)} · trace saved ${when(run.trace_saved_at)}` : (published ? `Published ${when(run.approved_at)}` : "Draft: an editor has not approved it yet")}</p></header>`);

  out.push(`<section><h2>The story</h2><blockquote>${esc(spec.script)}</blockquote>`);
  if (run.video_url) out.push(`<p>${link(run.video_url, "Watch the video")}</p>`);
  out.push(`<p class="muted">${esc(run.blurb)}</p></section>`);

  if (!editor) {
    out.push(`<section><h2>How it was made</h2><ol class="steps">`);
    out.push(`<li>newsReels checked the latest open data: ${esc(run.sources_checked || s.dataset)}.</li>`);
    out.push(`<li>It compared each category's count this week with its average over the 8 weeks before, and picked the biggest change: ${esc(s.this_week)} ${esc(s.unit)} against ${esc(s.avg_prev_8_weeks)}.</li>`);
    if (usedIds.size) out.push(`<li>It added context from ${[...new Set((run.reports_used || []).map((r) => r.source))].map(esc).join(" and ")}.</li>`);
    out.push(`<li>An AI model (Claude, by Anthropic) wrote the script from those numbers only. A check confirmed every number before anything was recorded.</li>`);
    out.push(`<li>An editor at ${esc(client.name || "the outlet")} ${published ? "read the script and the data, then approved the story" : "is reviewing the script and the data"}.</li></ol></section>`);
  }

  // Numbers.
  out.push(`<section><h2>Where every number comes from</h2><div class="scroll"><table><tr><th>Number</th><th>In</th><th>Comes from</th>${editor ? "<th>Check</th>" : ""}</tr>`);
  const seen = new Set();
  for (const c of checks) {
    const key = `${c.number}|${c.field}`;
    if (seen.has(key) || (!editor && c.field === "blurb")) continue;
    seen.add(key);
    out.push(`<tr><td><strong>${esc(c.number)}</strong></td><td>${esc(c.field.replace("_", " "))}</td><td>${esc(plainOrigin(c.from, s, reports))}</td>${editor ? `<td class="${c.from ? "ok" : "bad"}">${c.from ? "found" : "not found"}</td>` : ""}</tr>`);
  }
  out.push(`</table></div>`);
  if (editor) out.push(`<p class="muted">The guard blocks any draft with a number it cannot find in the story data or in a news report the script names. Dates count as story data.</p>`);
  out.push(`</section>`);

  // Sources.
  out.push(`<section><h2>Sources</h2><ul>`);
  out.push(`<li>${link(s.source_url, s.source_note)}${editor ? ` <span class="muted">(${esc(s.week_start)} to ${esc(s.week_ending)})</span>` : ""}</li>`);
  for (const r of run.reports_used || []) out.push(`<li>${link(r.url, `${r.source}: ${r.title}`)} <span class="muted">${when(r.published)}</span></li>`);
  out.push(`</ul></section>`);

  if (editor) {
    // Ranking.
    out.push(`<section><h2>How the story was picked</h2><p>Sources checked: ${esc(run.sources_checked)}.${(run.sources_failed || []).length ? ` <span class="bad">Failed: ${esc(run.sources_failed.join(" "))}</span>` : ""}</p>`);
    out.push(`<p>A story needs at least 20 this week and twice the usual weekly level, or a drop to half a usual level of at least 20. The strongest change wins.</p><div class="scroll"><table><tr><th></th><th>Dataset</th><th>Category</th><th>This week</th><th>8-week average</th><th>Times usual</th></tr>`);
    out.push(`<tr><td class="ok">Picked</td><td>${esc(s.dataset)}</td><td>${esc(s.type)}</td><td>${esc(s.this_week)}</td><td>${esc(s.avg_prev_8_weeks)}</td><td>${esc(s.ratio)}</td></tr>`);
    for (const r of run.runners_up || []) out.push(`<tr><td class="muted">Runner-up</td><td>${esc(r.dataset)}</td><td>${esc(r.type)}</td><td>${esc(r.this_week)}</td><td>${esc(r.avg_prev_8_weeks)}</td><td>${esc(r.ratio)}</td></tr>`);
    out.push(`</table></div></section>`);

    // News.
    out.push(`<section><h2>News context</h2><div class="scroll"><table><tr><th>Feed</th><th>Result</th></tr>`);
    for (const f of run.feeds_checked || []) out.push(`<tr><td>${esc(f.feed)}</td><td>${f.ok ? `${esc(f.recent)} recent of ${esc(f.items)}` : `<span class="bad">${esc(f.reason)}</span>`}</td></tr>`);
    out.push(`</table></div><p>Reports offered to Claude, newest first:</p><div class="scroll"><table><tr><th>Id</th><th>Source</th><th>Title</th><th>Used</th></tr>`);
    for (const r of reports) out.push(`<tr><td>${esc(r.id)}</td><td>${esc(r.source)}</td><td>${link(r.url, r.title)}</td><td>${usedIds.has(r.id) ? '<span class="ok">used</span>' : ""}</td></tr>`);
    out.push(`</table></div></section>`);

    // Claude.
    out.push(`<section><h2>What Claude was asked</h2><p>Model: ${esc(run.write?.model)}. It got the client's style card, the story data and the reports above.</p>`);
    if (prompt) out.push(`<details><summary>Instructions (system prompt)</summary><pre>${esc(prompt)}</pre></details>`);
    out.push(`<details><summary>Style card</summary>${pretty(client.style)}</details><details><summary>Story data</summary>${pretty(s)}</details></section>`);
    out.push(`<section><h2>What Claude answered</h2>${pretty(run.write?.answer)}</section>`);

    // Review.
    out.push(`<section><h2>Review in Slack</h2>`);
    const history = run.chat?.history || [];
    if (history.length) {
      out.push(`<div class="scroll"><table><tr><th>Who</th><th>Said</th></tr>`);
      for (const h of history) out.push(`<tr><td>${h.editor !== undefined ? "Editor" : "newsReels"}</td><td>${esc(h.editor ?? h.bot)}</td></tr>`);
      out.push(`</table></div>`);
    } else out.push(`<p class="muted">No edits.</p>`);
    const approvals = run.approvals || [];
    out.push(approvals.length ? `<ul>${approvals.map((a) => `<li>${esc(a.action.replace("_", " "))} by Slack user ${esc(a.user)} at ${when(a.at)}</li>`).join("")}</ul>` : `<p class="muted">No approvals yet.</p>`);
    out.push(`</section>`);

    // Voice, video, cost.
    const { rows, dollars } = cost(run);
    out.push(`<section><h2>Voice, video and cost</h2><ul>`);
    if (run.audio_seconds) out.push(`<li>Narration: ${esc(run.audio_seconds)} seconds, ${String(spec.script || "").length} characters sent to ElevenLabs.</li>`);
    if (run.render_seconds) out.push(`<li>Video: rendered in ${Math.round(run.render_seconds * 10) / 10} seconds on the host laptop, at no cost.</li>`);
    out.push(`</ul><div class="scroll"><table><tr><th>Claude call</th><th>Model</th><th>Tokens in</th><th>Tokens out</th><th>Cost</th></tr>${rows.join("")}</table></div>`);
    out.push(`<p>Claude in total: <strong>$${dollars.toFixed(4)}</strong>.</p></section>`);
  }

  out.push(`<p class="muted" style="margin-top:24px">Made with newsReels, built in n8n for LOOP 2026. ${editor ? "This page is for the editor; the public page leaves out the prompts, messages and costs." : ""}</p>`);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(editor ? "Run trace" : "How this story was made")}: ${esc(spec.headline)}</title><style>${STYLE}</style></head><body><main>${out.join("\n")}</main>${LOCAL_TIMES}</body></html>\n`;
}
