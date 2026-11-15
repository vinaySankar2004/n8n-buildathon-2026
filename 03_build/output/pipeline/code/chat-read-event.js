// "Read Slack event": the router on the host laptop checks Slack's signature, then forwards each
// message (Events API) and each button tap (interactivity) here. A thread reply is a "reply"; a new
// message in the editor channel that mentions the bot is a "request" for 8 Request. Anything else
// is dropped.
const body = $input.first().json.body || {};
if (body.source === "events") {
  const env = body.body || {};
  const e = env.event || {};
  if (env.type !== "event_callback" || e.type !== "message") return [];
  if (e.bot_id || e.subtype || e.channel !== EDITOR) return [];
  const text = String(e.text || "").trim();
  if (!text) return [];
  if (!e.thread_ts || e.thread_ts === e.ts) {
    const bot = (env.authorizations || []).find((a) => a.is_bot)?.user_id;
    if (!bot || !text.includes(`<@${bot}>`)) return [];
    const asked = text.split(`<@${bot}>`).join(" ").replace(/\s+/g, " ").trim();
    if (!asked) return [];
    return [{ json: { kind: "request", text: asked, user: e.user, ts: e.ts, channel: e.channel, at: new Date(Number(e.ts) * 1000).toISOString() } }];
  }
  return [{ json: { kind: "reply", thread_ts: e.thread_ts, text, user: e.user } }];
}
if (body.source === "interactivity") {
  const p = body.payload || {};
  const a = (p.actions || [])[0];
  if (p.type !== "block_actions" || !a || !String(a.action_id).startsWith("newsroom_")) return [];
  if ((p.channel || {}).id !== EDITOR) return [];
  const m = p.message || {};
  return [{ json: { kind: "action", action: a.action_id.replace("newsroom_", ""), thread_ts: m.thread_ts || m.ts, user: (p.user || {}).id, name: (p.user || {}).name || (p.user || {}).username || null } }];
}
return [];
