#!/usr/bin/env node
// Repository check: secrets, public writing, workspace layout, workflow exports, deadline.
// Runs in Claude Code before commits and pushes, in the git hooks, and in GitHub Actions.
// Usage: node tools/check.mjs [--push]
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pushing = process.argv.includes("--push");
const problems = [];
const add = (where, what) => problems.push(`${where}: ${what}`);

const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const files = [...new Set([
  ...git("ls-files").split("\n"),
  ...git("ls-files", "--others", "--exclude-standard").split("\n"),
])].filter((f) => f && existsSync(path.join(root, f)) && statSync(path.join(root, f)).isFile());

// 1. Secrets.
const secretPatterns = [
  [/\bsk-[A-Za-z0-9_-]{20,}/, "an API key (sk-)"],
  [/\bsk_[a-f0-9]{32,}/, "an ElevenLabs-style key (sk_)"],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/, "a GitHub token"],
  [/\bxox[abposr]-[A-Za-z0-9-]{10,}/, "a Slack token"],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, "a Google API key"],
  [/\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\./, "a JWT, such as an n8n API key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "a private key"],
];
const localSecrets = [];
for (const envFile of [".env", "03_build/output/render-service/.env"]) {
  const p = path.join(root, envFile);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && /TOKEN|KEY|SECRET|PASSWORD/.test(m[1]) && m[2].length >= 12) localSecrets.push(m[2]);
  }
}
const binary = /\.(png|jpe?g|gif|webp|mp4|mp3|wav|heic|pdf|ico|woff2?)$/i;
for (const f of files) {
  if (/(^|\/)\.env(\.|$)/.test(f) && !f.endsWith(".env.example")) add(f, "an .env file is tracked; remove it from git");
  if (f.endsWith(".env.example") && /^[A-Z0-9_]*(KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*=\S/m.test(readFileSync(path.join(root, f), "utf8"))) {
    add(f, "an example env file has a value for a key or token; leave those blank");
  }
  if (binary.test(f) || f.endsWith("package-lock.json")) continue;
  const text = readFileSync(path.join(root, f), "utf8");
  for (const s of localSecrets) if (text.includes(s)) add(f, "contains a value from a local .env file");
  text.split("\n").forEach((line, i) => {
    for (const [re, what] of secretPatterns) if (re.test(line)) add(`${f}:${i + 1}`, `looks like ${what}`);
  });
}

// 2. Public writing, for prose files.
const writing = [
  [/—/, "em dash"],
  [/–/, "en dash"],
  [/\b(?:is|are|was|were|it's|it is) not just\b/i, "stock contrast (not just X, it is Y)"],
  [/\b(?:great question|let(?:'s| us) dive in|in today's fast-paced|game[- ]changer|revolutioniz|cutting[- ]edge|seamless(?:ly)?|leverag(?:e|ing)|supercharg|unlock the power|delve)\b/i, "stock phrase"],
];
for (const f of files.filter((f) => /\.(md|html)$/.test(f))) {
  readFileSync(path.join(root, f), "utf8").split("\n").forEach((line, i) => {
    for (const [re, what] of writing) if (re.test(line)) add(`${f}:${i + 1}`, what);
  });
}

// 3. Workspace layout.
const required = ["CONTEXT.md", "AGENTS.md", "_config/contracts.md", "memory/decisions.md", "memory/failures.md"];
const stages = ["01_idea", "02_storyboard", "03_build", "04_demo", "05_submit"];
for (const r of required) if (!existsSync(path.join(root, r))) add(r, "missing");
for (const s of stages) {
  const p = path.join(root, s, "CONTEXT.md");
  if (!existsSync(p)) { add(`${s}/CONTEXT.md`, "missing"); continue; }
  const text = readFileSync(p, "utf8");
  for (const h of ["## Job", "## Inputs", "## Process", "## Audit", "## Output"]) {
    if (!text.includes(h)) add(`${s}/CONTEXT.md`, `missing the "${h.slice(3)}" section`);
  }
}

// 4. n8n workflow exports.
const names = ["orchestrator", "collect", "score", "write", "voice", "render", "publish", "chat"];
for (const f of files.filter((f) => f.startsWith("03_build/output/workflows/"))) {
  const base = path.basename(f);
  if (base === "README.md") continue;
  if (!/^\d[a-z]?-[a-z-]+\.(json|svg)$/.test(base) || !names.some((n) => base.includes(n))) {
    add(f, `name it <n>-<step>.json (or .svg for its picture) with a step from: ${names.join(", ")}`);
  }
  if (base.endsWith(".svg")) continue;
  try {
    const wf = JSON.parse(readFileSync(path.join(root, f), "utf8"));
    if (wf.pinData && Object.keys(wf.pinData).length) add(f, "has pinned test data; run npm run sync, which strips it");
  } catch {
    add(f, "is not valid JSON");
  }
}

// 5. Deadline: submissions close Sunday 15:00 in Vancouver, which macOS puts at UTC-7 in November 2026.
// Written in UTC so the check means the same thing on a laptop and in GitHub Actions.
const closes = new Date("2026-11-15T22:00:00Z");
if (pushing && Date.now() >= closes.getTime()) add("deadline", "submissions closed Sunday 15:00; pushing now would disqualify the team");

if (problems.length) {
  console.error(`Repository check found ${problems.length} problem(s):`);
  for (const p of problems) console.error(`- ${p}`);
  process.exit(1);
}
console.log(`Repository check passed (${files.length} files).`);
