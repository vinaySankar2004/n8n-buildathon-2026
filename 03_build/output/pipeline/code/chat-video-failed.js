// "Video failed": Voice, Render or the upload stopped. The thread stays where it was, so the editor
// can reply with a change or tap the button again.
let base;
try {
  base = $("Check revision").first().json;
} catch {
  base = $("Decide").first().json;
}
const failed = $input.first().json;
const err = typeof failed.error === "string" ? failed.error : failed.error?.message;
const why = failed.reason || err || failed.message || "a step stopped without saying why";
const text = `I could not make the video: ${why}. Reply with a change, such as a shorter script, and I will try again.`;
return [reply(base.chat.thread_ts, text, null, base.chat.stage, base, [...base.chat.history, { bot: text }])];
