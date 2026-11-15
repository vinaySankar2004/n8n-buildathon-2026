// "Check revision": reads Claude's answer, rebuilds the spec from the revised draft and runs the same
// number guard as Write. A change that fails the guard is not used; the editor is told why.
// In the video stage, a change to anything on screen or in the script remakes the video.
const base = $("Decide").first().json;
const res = $input.first().json;
const { chat, ...run } = base;
const raw = String(res.content?.find((c) => c.type === "text")?.text ?? "");
const history = [...chat.history, { editor: chat.text }];
const threadTs = chat.thread_ts;

let answer;
try {
  answer = JSON.parse(raw.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, "$1"));
} catch {
  const text = "Sorry, I could not work out a change from that. Could you say it another way?";
  return [reply(threadTs, text, null, chat.stage, run, [...history, { bot: text }])];
}

let said = String(answer.reply || "").trim() || "Done.";
// The reply is checked too, so the bot never states a number the data does not have.
if (unknownNumbers(run.story, { reply: said }, run.reports_used || []).length) {
  said = answer.draft ? "Here is the new version." : "I can only use numbers that are in the city data for this story.";
}

if (!answer.draft || typeof answer.draft !== "object") {
  return [reply(threadTs, said, null, chat.stage, run, [...history, { bot: said }])];
}

const draft = { ...draftOf(run), ...answer.draft };
for (const k of ["headline", "script", "callout_label", "chart_title", "blurb"]) draft[k] = String(draft[k] ?? "").trim();
const built = buildSpec(run.story, draft, { client: run.client, reports: run.reports });
if (built.problems.length) {
  const text = `I did not make that change: ${built.problems.join("; ")}. Every number has to come from the data or a news report the script cites. The draft is as it was.`;
  return [reply(threadTs, text, null, chat.stage, run, [...history, { bot: text }])];
}

const revised = { ...run, spec: built.spec, chart_kind: built.chart_kind, blurb: draft.blurb, script_words: built.words, reports_used: built.used };
const after = [...history, { bot: said }];
const videoChanged = JSON.stringify(built.spec) !== JSON.stringify(run.spec);

if (chat.stage === "video" && videoChanged) {
  // Goes to "Make voice", then the new video is posted with its buttons.
  return [{ json: { ...revised, chat: { ...chat, history: after }, render: true, working_note: `${said} Making a new video; this takes about 20 seconds.` } }];
}
const blocks = [section(said), ...scriptBlocks(revised), context(HOW_TO_REPLY), chat.stage === "video" ? videoButtons() : scriptButtons()];
return [reply(threadTs, said, blocks, chat.stage, revised, after)];
