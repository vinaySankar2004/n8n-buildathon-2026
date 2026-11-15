// "Publish failed note": 6 Publish stopped; the editor can tap Approve and publish again.
const base = $("Decide").first().json;
const failed = $input.first().json;
const why = failed.reason || (typeof failed.error === "string" ? failed.error : failed.error?.message) || "the publish step stopped";
const text = `Could not publish: ${why}. Tap Approve and publish to try again.`;
return [reply(base.chat.thread_ts, text, null, "video", base, [...base.chat.history, { bot: text }])];
