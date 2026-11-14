// "Published note": 6 Publish posted the video and blurb to the outlet channel.
const base = $("Decide").first().json;
const text = `Published to <#${OUTLET}> with the newsletter blurb. This thread is closed.`;
return [reply(base.chat.thread_ts, text, null, "published", base, [...base.chat.history, { bot: text }])];
