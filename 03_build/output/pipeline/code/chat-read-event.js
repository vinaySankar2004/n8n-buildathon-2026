// "Read Slack event": the router on the host laptop checks Slack's signature, then forwards each
// thread reply (Events API) and each button tap (interactivity) here. Anything else is dropped.
const body = $input.first().json.body || {};
if (body.source === "events") {
  const env = body.body || {};
  const e = env.event || {};
  if (env.type !== "event_callback" || e.type !== "message") return [];
  if (e.bot_id || e.subtype || !e.thread_ts || e.thread_ts === e.ts || e.channel !== EDITOR) return [];
  const text = String(e.text || "").trim();
  if (!text) return [];
  return [{ json: { kind: "reply", thread_ts: e.thread_ts, text, user: e.user } }];
}
if (body.source === "interactivity") {
  const p = body.payload || {};
  const a = (p.actions || [])[0];
  if (p.type !== "block_actions" || !a || !String(a.action_id).startsWith("newsroom_")) return [];
  if ((p.channel || {}).id !== EDITOR) return [];
  const m = p.message || {};
  return [{ json: { kind: "action", action: a.action_id.replace("newsroom_", ""), thread_ts: m.thread_ts || m.ts, user: (p.user || {}).id } }];
}
return [];
