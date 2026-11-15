// "Decide": joins the Slack event with the thread's saved row and picks a route for "Route".
// script stage: a reply revises the draft, "Approve script" makes the video, "Reject" ends it.
// video stage: a reply revises and remakes the video, "Approve and publish" posts to the outlet.
// A tap on an old button, or anything in a finished thread, is ignored.
const ev = $("Read Slack event").first().json;
const row = $input.first().json;
let state;
try {
  state = JSON.parse(row.state);
} catch {
  return [];
}
const stage = row.stage;
const run = state.run;
const history = state.history || [];
const chat = { thread_ts: ev.thread_ts, stage, history, user: ev.user, text: ev.text || "" };

let route = "";
if (ev.kind === "action") {
  if (ev.action === "approve_script" && stage === "script") route = "approve_script";
  else if (ev.action === "approve_video" && stage === "video") route = "approve_video";
  else if (ev.action === "reject" && (stage === "script" || stage === "video")) route = "reject";
} else if (ev.kind === "reply" && (stage === "script" || stage === "video")) {
  route = "revise";
}
if (!route) return [];

const item = { ...run, chat, route };
if (route === "approve_script") {
  item.working_note = "Script approved. Recording the voice and making the video; this takes about 20 seconds.";
}
if (route === "revise") {
  const ask = {
    stage: stage === "script" ? "script review: no voice or video made yet" : "video review: the editor has seen the video",
    client: { name: run.client?.name, style: run.client?.style },
    story: run.story,
    news_reports: (run.reports || []).map(({ id, source, title, summary }) => ({ id, source, title, summary })),
    current_draft: draftOf(run),
    conversation: history,
    editor_message: ev.text,
  };
  item.claude_body = {
    model: "__MODEL__",
    max_tokens: 4000,
    output_config: { effort: "low" },
    system: __CHAT_PROMPT__,
    messages: [{ role: "user", content: JSON.stringify(ask, null, 2) }],
  };
}
return [{ json: item }];
