// "Video card": after the video is uploaded into the thread, the buttons to publish or reject it.
const r = $("Make video").first().json;
const chat = r.chat;
const text = `Here is the video (${Math.round(r.video_seconds * 10) / 10} seconds). Approve to post it to <#${OUTLET}> with the newsletter blurb.`;
const blocks = [section(text), context(HOW_TO_REPLY), videoButtons()];
return [reply(chat.thread_ts, text, blocks, "video", r, chat.history)];
