#!/usr/bin/env node
// One public address for the whole backend. ngrok's free plan gives a single fixed domain, so this
// router sits behind it: render paths go to the render service, everything else goes to n8n
// (editor, REST, public API, webhooks), including WebSocket upgrades for the editor's live updates.
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.ROUTER_PORT || 8080);
const RENDER = { host: "127.0.0.1", port: Number(process.env.RENDER_PORT || 8787) };
const N8N = { host: "127.0.0.1", port: Number(process.env.N8N_PORT || 5678) };

const target = (url) => (/^\/(render|files|health)(\/|$|\?)/.test(url) ? RENDER : N8N);

// Slack's signing secret, from the app's Basic Information page. It lives in .env on the host laptop.
const envFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../.env");
const fromEnv = (name) => {
  if (process.env[name]) return process.env[name];
  if (!existsSync(envFile)) return "";
  const m = readFileSync(envFile, "utf8").match(new RegExp(`^[ \\t]*${name}[ \\t]*=[ \\t]*(\\S*)`, "m"));
  return m ? m[1] : "";
};
const SIGNING_SECRET = fromEnv("SLACK_SIGNING_SECRET");
const CHAT_HOOK = "/webhook/slack-events"; // the "Slack event" webhook in 7 Chat

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

// https://api.slack.com/authentication/verifying-requests-from-slack
function fromSlack(req, raw) {
  const ts = req.headers["x-slack-request-timestamp"];
  const sig = String(req.headers["x-slack-signature"] || "");
  if (!SIGNING_SECRET || !ts || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const mine = "v0=" + createHmac("sha256", SIGNING_SECRET).update(`v0:${ts}:${raw}`).digest("hex");
  return sig.length === mine.length && timingSafeEqual(Buffer.from(sig), Buffer.from(mine));
}

// Hands a checked Slack event to 7 Chat. Slack has already had its 200, so nothing waits on this.
function toChat(payload) {
  const body = JSON.stringify(payload);
  const r = http.request({ ...N8N, method: "POST", path: CHAT_HOOK, headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) } });
  r.on("error", (e) => console.error(`Could not reach n8n with a Slack event: ${e.message}`));
  r.on("response", (up) => up.resume());
  r.end(body);
}

async function slack(req, res) {
  const raw = await readBody(req);
  if (!fromSlack(req, raw)) {
    console.error(SIGNING_SECRET ? "Dropped a Slack request with a bad or old signature." : "Dropped a Slack request: SLACK_SIGNING_SECRET is not set in .env.");
    res.writeHead(401);
    return res.end();
  }
  if (req.url.startsWith("/slack/events")) {
    const body = JSON.parse(raw || "{}");
    if (body.type === "url_verification") {
      res.writeHead(200, { "content-type": "text/plain" });
      return res.end(body.challenge);
    }
    res.writeHead(200);
    res.end();
    // Slack resends an event it thinks was missed; the first copy is already on its way.
    if (!req.headers["x-slack-retry-num"]) toChat({ source: "events", body });
    return;
  }
  // Button taps. n8n's own approval buttons are links that reach n8n by themselves; only the
  // newsroom's buttons go on to 7 Chat.
  res.writeHead(200);
  res.end();
  const payload = JSON.parse(new URLSearchParams(raw).get("payload") || "{}");
  if ((payload.actions || []).some((a) => String(a.action_id).startsWith("newsroom_"))) toChat({ source: "interactivity", payload });
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && /^\/slack\/(events|interactivity)/.test(req.url)) {
    return slack(req, res).catch((e) => {
      console.error(`Slack request failed: ${e.message}`);
      if (!res.headersSent) res.writeHead(400);
      res.end();
    });
  }
  // 7 Chat's webhook takes only events the router has checked, so it is closed to the outside.
  if (req.url.startsWith(CHAT_HOOK)) {
    req.resume();
    res.writeHead(404);
    return res.end();
  }
  const to = target(req.url);
  const upstream = http.request(
    { ...to, method: req.method, path: req.url, headers: req.headers },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
    res.end(to === N8N ? "n8n is not running on the host laptop." : "The render service is not running on the host laptop.");
  });
  req.pipe(upstream);
});

server.on("upgrade", (req, socket, head) => {
  const to = target(req.url);
  const upstream = net.connect(to.port, to.host, () => {
    const headers = Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n");
    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${headers}\r\n\r\n`);
    if (head?.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(PORT, "127.0.0.1", () => console.log(`Router on http://127.0.0.1:${PORT}: render paths to ${RENDER.port}, the rest to n8n on ${N8N.port}`));
