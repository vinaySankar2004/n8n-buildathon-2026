#!/usr/bin/env node
// Checks this clone and the shared n8n end to end, then says exactly what is left and who does it.
// Claude Code runs it at session start; anyone can run it: npm run doctor
// It never prints a secret and never changes anything.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ok = [];
const todo = [];
const done = (m) => ok.push(m);
const next = (m) => todo.push(m);

// 1. This clone's .env.
const envFile = path.join(root, ".env");
const env = {};
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/);
    if (m && m[2].trim()) env[m[1]] = m[2].trim();
  }
  done(".env exists");
} else {
  next("Copy .env.example to .env (cp .env.example .env).");
}
const url = (env.N8N_URL || "").replace(/\/$/, "");
if (!url && existsSync(envFile)) next("Set N8N_URL in .env: the tunnel address from .env.example, or http://localhost:5678 on the host laptop.");
if (!env.N8N_API_KEY) next("Put N8N_API_KEY in .env. Vinayak sends it by direct message.");

// 2. Up to date with GitHub.
try {
  execFileSync("git", ["fetch", "--quiet"], { cwd: root, timeout: 15000, stdio: "ignore" });
  const behind = Number(execFileSync("git", ["rev-list", "--count", "HEAD..@{u}"], { cwd: root, encoding: "utf8" }).trim());
  behind ? next(`Pull: this clone is ${behind} commit(s) behind GitHub (npm run update).`) : done("clone is up to date with GitHub");
} catch {
  next("Could not reach GitHub to check for newer commits.");
}

// 3. The shared n8n.
const headers = { "X-N8N-API-KEY": env.N8N_API_KEY || "", accept: "application/json", "ngrok-skip-browser-warning": "1" };
const get = async (p) => {
  const r = await fetch(url + p, { headers, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
};
let workflows = [];
let credentials = [];
if (url) {
  try {
    await get("/healthz");
    done(`n8n answers at ${url}`);
    if (env.N8N_API_KEY) {
      try {
        workflows = (await get("/api/v1/workflows?limit=100")).data || [];
        credentials = (await get("/api/v1/credentials?limit=100")).data || [];
        done("n8n API key works");
      } catch (e) {
        next(`n8n rejected the API key (${e.message}). Ask Vinayak for the current key.`);
      }
    }
  } catch {
    next(`n8n does not answer at ${url}. The host laptop may be asleep or offline; tell Vinayak.`);
  }
}

// 4. Credentials stored in n8n, each loaded once by its owner.
const OWNERS = {
  Anthropic: ["ANTHROPIC_API_KEY", "whoever has the Anthropic API key (console.anthropic.com, API keys)"],
  ElevenLabs: ["ELEVENLABS_API_KEY", "whoever has the ElevenLabs account (Profile, API keys)"],
  Slack: ["SLACK_BOT_TOKEN", "whoever set up the Slack app from 03_build/output/host/slack-app-manifest.yml"],
  "Render token": ["RENDER_TOKEN", "Vinayak, on the host laptop"],
};
if (credentials.length || workflows.length) {
  const have = new Set(credentials.map((c) => c.name));
  for (const [name, [key, who]] of Object.entries(OWNERS)) {
    if (have.has(name)) done(`credential "${name}" is in n8n`);
    else if (env[key]) next(`Load "${name}": ${key} is in your .env, so run npm run credentials.`);
    else next(`Credential "${name}" is missing. For ${who}: put ${key} in .env, then npm run credentials.`);
  }
}

// 5. Slack channels, set in the pipeline's build config.
const build = path.join(root, "03_build/output/pipeline/build.mjs");
if (existsSync(build)) {
  const src = readFileSync(build, "utf8");
  for (const which of ["editor", "outlet"]) {
    const m = src.match(new RegExp(`${which}:\\s*"([^"]*)"`));
    m && m[1] ? done(`Slack ${which} channel is set`) : next(`Set SLACK_CHANNELS.${which} in 03_build/output/pipeline/build.mjs to the #${which} channel ID (click the channel name; the ID is at the bottom of About), then npm run pipeline.`);
  }
}

// 6. Workflows deployed and switched on.
if (credentials.length || workflows.length) {
  const names = ["0 Orchestrator", "1 Collect", "2 Score", "3 Write", "4 Voice", "5 Render", "6 Publish"];
  const byName = new Map(workflows.map((w) => [w.name, w]));
  const missing = names.filter((n) => !byName.has(n));
  const off = names.filter((n) => byName.has(n) && !byName.get(n).active);
  if (missing.length) next(`Not deployed: ${missing.join(", ")}. Run npm run deploy.`);
  if (off.length) next(`Deployed but not active: ${off.join(", ")}. Load their credentials, then npm run deploy.`);
  if (!missing.length && !off.length) done("all seven workflows are deployed and active");
}

console.log(`Setup check: ${ok.length} fine, ${todo.length} to do.`);
if (todo.length) {
  console.log("To do, in order:");
  todo.forEach((t, i) => console.log(`${i + 1}. ${t}`));
} else {
  console.log("Everything is set up. Run the whole pipeline with npm run invoke -- orchestrator.");
}

// 7. What the team is doing now.
if (!existsSync(path.join(root, "product/output/spec.md"))) {
  let names = [];
  try {
    const { readdirSync } = await import("node:fs");
    names = readdirSync(path.join(root, "product/proposals")).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
  } catch {}
  console.log(
    `Team phase: product discussion (product/CONTEXT.md). Proposals so far: ${names.length ? names.join(", ") : "none"}. ` +
      "If this person has not had theirs, ask the questions in product/questions.md one at a time and record the answers.",
  );
}
