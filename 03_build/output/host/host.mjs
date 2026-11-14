#!/usr/bin/env node
// Runs the backend on the host laptop: render service, n8n, router and ngrok tunnel, each detached so
// they outlive the terminal or agent that started them, plus caffeinate so the Mac does not idle-sleep.
// Usage: npm run host            start whatever is not running, then show status
//        npm run host -- status  show status only
//        npm run host -- stop    stop everything this script starts
// Host-only settings come from the repository's .env: N8N_START (path to the n8n start script) and
// TUNNEL_URL (the ngrok address). Logs go to 03_build/output/host/logs/, which git ignores.
import { spawn, execFileSync } from "node:child_process";
import { openSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const logs = path.join(here, "logs");
const env = {};
const envFile = path.join(root, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/);
    if (m && m[2].trim()) env[m[1]] = m[2].trim();
  }
}
const TUNNEL = (env.TUNNEL_URL || "https://paratactical-professionally-yasuko.ngrok-free.dev").replace(/\/$/, "");

const listening = (port) =>
  new Promise((resolve) => {
    const s = net.connect(port, "127.0.0.1", () => (s.destroy(), resolve(true)));
    s.on("error", () => resolve(false));
    s.setTimeout(1500, () => (s.destroy(), resolve(false)));
  });
const tunnelUp = async () => {
  try {
    const r = await fetch("http://127.0.0.1:4040/api/tunnels", { signal: AbortSignal.timeout(2000) });
    return ((await r.json()).tunnels || []).some((t) => String(t.config?.addr).endsWith("8080"));
  } catch {
    return false;
  }
};
const pids = (args) => {
  try {
    return execFileSync(args[0], args.slice(1), { encoding: "utf8" }).split("\n").filter(Boolean).map(Number);
  } catch {
    return [];
  }
};

const SERVICES = [
  { name: "render service", port: 8787, cwd: path.join(root, "03_build/output/render-service"), cmd: ["node", "server.mjs"], log: "render.log" },
  { name: "n8n", port: 5678, cwd: root, cmd: [env.N8N_START || ""], log: "n8n.log", needs: "N8N_START" },
  { name: "router", port: 8080, cwd: root, cmd: ["node", "03_build/output/host/router.mjs"], log: "router.log" },
  { name: "tunnel", check: tunnelUp, cwd: root, cmd: ["ngrok", "http", "8080", "--url", TUNNEL], log: "ngrok.log", pattern: "ngrok http 8080" },
];
const isUp = (s) => (s.check ? s.check() : listening(s.port));

function start(s) {
  if (s.needs && !env[s.needs]) {
    console.log(`Skipped ${s.name}: set ${s.needs} in .env on the host laptop.`);
    return null;
  }
  mkdirSync(logs, { recursive: true });
  const out = openSync(path.join(logs, s.log), "a");
  const child = spawn(s.cmd[0], s.cmd.slice(1), { cwd: s.cwd, detached: true, stdio: ["ignore", out, out] });
  child.unref();
  return child.pid;
}

async function waitFor(s, seconds) {
  for (let i = 0; i < seconds; i++) {
    if (await isUp(s)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function status() {
  for (const s of SERVICES) console.log(`${(await isUp(s)) ? "up  " : "DOWN"}  ${s.name}`);
  const awake = pids(["pgrep", "-f", "caffeinate -ims"]).length > 0;
  console.log(`${awake ? "on  " : "off "}  keep-awake`);
  try {
    const r = await fetch(`${TUNNEL}/healthz`, { headers: { "ngrok-skip-browser-warning": "1" }, signal: AbortSignal.timeout(8000) });
    console.log(`${r.ok ? "up  " : "DOWN"}  n8n through ${TUNNEL}`);
  } catch {
    console.log(`DOWN  n8n through ${TUNNEL}`);
  }
}

const action = process.argv[2] || "start";
if (action === "stop") {
  for (const s of SERVICES) {
    const found = s.port ? pids(["lsof", "-tiTCP:" + s.port, "-sTCP:LISTEN"]) : pids(["pgrep", "-f", s.pattern]);
    for (const pid of found) process.kill(pid);
    console.log(found.length ? `Stopped ${s.name}.` : `${s.name} was not running.`);
  }
  for (const pid of pids(["pgrep", "-f", "caffeinate -ims"])) process.kill(pid);
} else if (action === "start") {
  for (const s of SERVICES) {
    if (await isUp(s)) continue;
    if (start(s)) {
      const ok = await waitFor(s, s.name === "n8n" ? 90 : 30);
      console.log(ok ? `Started ${s.name}.` : `${s.name} did not come up; see 03_build/output/host/logs/${s.log}.`);
    }
  }
  if (!pids(["pgrep", "-f", "caffeinate -ims"]).length) {
    const c = spawn("caffeinate", ["-ims"], { detached: true, stdio: "ignore" });
    c.unref();
    console.log("Keep-awake on: the Mac will not idle-sleep while plugged in. A closed lid still sleeps.");
  }
  await status();
} else {
  await status();
}
