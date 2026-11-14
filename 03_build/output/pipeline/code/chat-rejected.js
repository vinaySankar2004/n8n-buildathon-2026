// "Rejected note": the editor tapped Reject. Nothing is published and the thread is closed.
const base = $("Decide").first().json;
const text = "Rejected. Nothing was published, and this thread is closed.";
return [reply(base.chat.thread_ts, text, null, "rejected", base, [...base.chat.history, { bot: text }])];
