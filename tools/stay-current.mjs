#!/usr/bin/env node
// Keeps this clone current with teammates' pushes. Claude Code runs it at session start and on every
// message; other agents run it before starting work and before committing: npm run update
// It never blocks: it pulls when that is safe, and otherwise says what is waiting and why.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000 }).trim();
const say = (message) => console.log(message);

try {
  git("fetch", "--quiet");
} catch {
  say("Could not reach GitHub to check for teammates' changes, so this clone may be behind.");
  process.exit(0);
}

let upstream;
try {
  upstream = git("rev-parse", "--abbrev-ref", "@{u}");
} catch {
  process.exit(0);
}

const [ahead, behind] = git("rev-list", "--left-right", "--count", `HEAD...${upstream}`).split(/\s+/).map(Number);
if (!behind) {
  if (ahead) say(`${ahead} local commit(s) are not pushed yet. Push once the check passes so teammates get them.`);
  process.exit(0);
}

const incoming = git("log", "--oneline", `HEAD..${upstream}`);
if (git("status", "--porcelain")) {
  say(
    `Teammates pushed ${behind} commit(s) this clone does not have:\n${incoming}\n` +
      "There are uncommitted changes here, so nothing was pulled. Commit them, then run npm run update before editing further.",
  );
  process.exit(0);
}

try {
  git("pull", "--rebase", "--quiet");
  say(`Pulled ${behind} new commit(s) from teammates:\n${incoming}`);
} catch {
  try {
    git("rebase", "--abort");
  } catch {}
  say(
    `Teammates pushed ${behind} commit(s), and they conflict with ${ahead} local commit(s). Nothing was changed. ` +
      "Run git pull --rebase, resolve the conflict, then commit.",
  );
}
