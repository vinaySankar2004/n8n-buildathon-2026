// Shared by the "7 Chat" Code nodes (build.mjs puts it at the top of each): the Slack messages the bot
// posts, and the row it keeps for each review thread in the "editor_threads" data table.
const EDITOR = "__EDITOR_CHANNEL__";
const OUTLET = "__OUTLET_CHANNEL__";

const section = (text) => ({ type: "section", text: { type: "mrkdwn", text: String(text).slice(0, 2900) } });
const context = (text) => ({ type: "context", elements: [{ type: "mrkdwn", text: String(text).slice(0, 2900) }] });
const button = (text, action, style) => ({ type: "button", text: { type: "plain_text", text }, action_id: `newsroom_${action}`, value: action, ...(style ? { style } : {}) });

function numbersLine(story) {
  const change = story.direction === "up"
    ? `${story.ratio}× the usual level`
    : `down ${Math.abs(story.pct_change)}% from the usual level`;
  return `${story.this_week} ${story.unit} in the week ${story.week_start} to ${story.week_ending}, against an average of ${story.avg_prev_8_weeks} a week over the 8 weeks before (${change}).`;
}

// For a story asked for in Slack: every page the web search cited, with the exact words it was cited
// for, so the editor can check the script against the source before approving.
function webSourceBlocks(run) {
  const web = (run.reports || []).filter((r) => r.feed === "web");
  const ws = run.web_search;
  if (!ws) return [];
  const used = new Set((run.reports_used || []).map((r) => r.id));
  const searched = ws.queries?.length ? `Searched for: ${ws.queries.map((q) => `"${q}"`).join(", ")}.` : "";
  if (!web.length) {
    return [section(`*Web sources to check*\n${ws.error ? `The web search failed: ${ws.error}` : "The web search found nothing to cite."} ${searched}`.trim())];
  }
  const clip = (t, n) => (t.length > n ? t.slice(0, n).replace(/\s+\S*$/, "") + "..." : t);
  return [
    section(`*Web sources to check* (${web.length}; ${web.filter((r) => used.has(r.id)).length} used in the script)\n${searched}`),
    ...web.map((r) => section(
      `${used.has(r.id) ? "*Used in the script.* " : ""}<${r.url}|${r.title}> (${r.source}${r.page_age ? `, ${r.page_age}` : ""})\n>_${clip(r.summary || "", 400)}_`,
    )),
  ];
}

function scriptBlocks(run) {
  const s = run.story;
  const spec = run.spec;
  const areas = (s.by_area || []).slice(0, 6).map((a) => `${a.area} ${a.count}`).join(", ");
  const weeks = (s.weekly || []).slice(-6).map((w) => w.count).join(", ");
  const chart = spec.chart.data.map((d) => `${d.label} ${d.value}`).join(", ");
  return [
    section(`*${spec.headline}*`),
    section(`*Script* (${run.script_words || String(spec.script).split(/\s+/).length} words)\n>${spec.script}`),
    section(
      `*The data*\n• ${s.dataset}: ${s.type}\n• ${numbersLine(s)}` +
        (areas ? `\n• This week by neighbourhood: ${areas}` : "") +
        (weeks ? `\n• Last 6 weeks: ${weeks}` : "") +
        `\n• Source: <${s.source_url}|${s.source_note}>`,
    ),
    ...((run.reports_used || []).filter((r) => r.feed !== "web").length
      ? [section(`*Context from the news*\n${run.reports_used.filter((r) => r.feed !== "web").map((r) => `• ${r.url ? `<${r.url}|${r.title}>` : r.title} (${r.source})`).join("\n")}`)]
      : []),
    ...webSourceBlocks(run),
    section(`*On screen*\n• Big number: ${spec.callout.value}, "${spec.callout.label}"\n• Chart: ${spec.chart.title} (${spec.chart.kind || "bar"} chart${spec.chart.highlight ? `, ${spec.chart.highlight} highlighted` : ""}${spec.brand?.accent ? `, colour ${spec.brand.accent}` : ""})\n• Values: ${chart}`),
    ...(spec.closing_line ? [section(`*Closing scene*\n${spec.closing_line}`)] : []),
    section(`*Newsletter blurb*\n${run.blurb}`),
  ];
}

const scriptButtons = () => ({ type: "actions", elements: [button("Approve script", "approve_script", "primary"), button("Reject", "reject", "danger")] });
const videoButtons = () => ({ type: "actions", elements: [button("Approve and publish", "approve_video", "primary"), button("Reject", "reject", "danger")] });
const HOW_TO_REPLY = "Reply in this thread to change anything: the script, headline, big number label, blurb, or the chart (bar, line or pie, a colour, which item stands out). After the video is made, a change remakes it in about 20 seconds. Every number has to come from the data or a news report the script cites.";

// The run without the parts that are large or only for this message.
function keep(run) {
  const { audio_base64, chat, route, working_note, claude_body, post, row, render, ...rest } = run;
  return rest;
}
const rowFor = (threadTs, stage, run, history) => ({ thread_ts: threadTs || "", stage, state: JSON.stringify({ run: keep(run), history: (history || []).slice(-12) }) });

// What every branch hands to "Reply ready": the Slack message to post and the row to save.
const reply = (threadTs, text, blocks, stage, run, history) => ({
  json: {
    post: { channel: EDITOR, ...(threadTs ? { thread_ts: threadTs } : {}), text: String(text).slice(0, 3000), ...(blocks ? { blocks } : {}), unfurl_links: false },
    row: rowFor(threadTs, stage, run, history),
  },
});
