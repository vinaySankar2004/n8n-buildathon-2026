#!/usr/bin/env node
// Pushes workflow JSON from the repository into n8n. Each file creates its workflow, or updates the
// workflow with the same name, then activates it when it has a webhook so `npm run invoke` can run it.
// Usage: npm run deploy            every file in 03_build/output/workflows
//        npm run deploy -- score   only files whose name holds "score"
import { readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { api, listAll, requireKey, root, WORKFLOW_DIR, N8N_URL, stepOf } from "./n8n-api.mjs";

requireKey();

// Never deploy from a clone that is behind GitHub: that would overwrite a teammate's newer workflow.
try {
  execFileSync("git", ["fetch", "--quiet"], { cwd: root, timeout: 20000, stdio: "ignore" });
  const behind = Number(execFileSync("git", ["rev-list", "--count", "HEAD..@{u}"], { cwd: root, encoding: "utf8" }).trim());
  if (behind) {
    console.error(`This clone is ${behind} commit(s) behind GitHub. Run npm run update, then deploy again.`);
    process.exit(1);
  }
} catch {
  console.warn("Could not check GitHub for newer commits; deploying what is here.");
}

// The public API accepts only these workflow settings.
const SETTINGS = [
  "saveExecutionProgress", "saveManualExecutions", "saveDataErrorExecution", "saveDataSuccessExecution",
  "executionTimeout", "errorWorkflow", "timezone", "executionOrder", "callerPolicy", "callerIds",
];

const only = process.argv[2];
// The orchestrator goes last, so the workflows it calls already exist.
const files = readdirSync(WORKFLOW_DIR)
  .filter((f) => f.endsWith(".json") && (!only || f.includes(only)))
  .sort((a, b) => a.includes("orchestrator") - b.includes("orchestrator") || a.localeCompare(b));
if (!files.length) {
  console.error(only ? `No workflow file matches "${only}".` : "No workflow files to deploy.");
  process.exit(1);
}

// Data tables the workflows use by name. Each column holds text.
const DATA_TABLES = [{ name: "editor_threads", columns: ["thread_ts", "stage", "state"] }];
const tables = new Map((await listAll("/data-tables")).map((t) => [t.name, t]));
for (const t of DATA_TABLES) {
  if (tables.has(t.name)) continue;
  await api("POST", "/data-tables", { name: t.name, columns: t.columns.map((name) => ({ name, type: "string" })) });
  console.log(`Created the data table "${t.name}".`);
}

const notActive = [];
const existing = new Map((await listAll("/workflows")).map((w) => [w.name, w]));
// Credentials are named in the JSON; link each one to its id in this n8n on every deploy, so a
// workflow deployed before its credential existed picks it up as soon as it is deployed again.
const credentialIds = new Map((await listAll("/credentials")).map((c) => [`${c.type}/${c.name}`, c.id]));

// Workflows can call each other (7 Chat and 8 Request do), so a link to one created later in this
// deploy is made on a second pass.
const relink = new Set();
const inactiveFiles = new Set(); // a workflow that calls one not yet switched on fails to switch on; retried below
let secondPass = false;
async function deployFile(file) {
  const wf = JSON.parse(readFileSync(path.join(WORKFLOW_DIR, file), "utf8"));
  for (const n of wf.nodes) {
    for (const [type, ref] of Object.entries(n.credentials || {})) {
      const id = credentialIds.get(`${type}/${ref?.name}`);
      if (id) ref.id = id;
      else console.warn(`"${wf.name}": no "${ref?.name}" credential in n8n yet for node "${n.name}". Run npm run credentials.`);
    }
  }
  // An Execute Workflow node names the workflow it calls; point it at that workflow's id in this n8n.
  for (const n of wf.nodes) {
    const ref = n.type === "n8n-nodes-base.executeWorkflow" ? n.parameters?.workflowId : null;
    if (!ref?.cachedResultName) continue;
    const target = existing.get(ref.cachedResultName);
    if (target) Object.assign(ref, { __rl: true, mode: "list", value: target.id });
    else if (secondPass) console.warn(`"${wf.name}": no workflow named "${ref.cachedResultName}" for node "${n.name}".`);
    else relink.add(file);
  }
  const settings = Object.fromEntries(Object.entries(wf.settings || {}).filter(([k]) => SETTINGS.includes(k)));
  const body = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: { executionOrder: "v1", ...settings } };
  const found = existing.get(wf.name);
  let saved;
  if (found) {
    if (found.active) await api("POST", `/workflows/${found.id}/deactivate`);
    saved = await api("PUT", `/workflows/${found.id}`, body);
  } else {
    saved = await api("POST", "/workflows", body);
  }
  existing.set(saved.name, saved);
  const hooks = wf.nodes.filter((n) => n.type === "n8n-nodes-base.webhook" && !n.disabled);
  // n8n refuses to activate a workflow whose credential does not exist yet. Save it anyway and
  // carry on, so one missing key does not stop the other workflows from deploying.
  let inactive = "";
  if (hooks.length) {
    try {
      await api("POST", `/workflows/${saved.id}/activate`);
    } catch (e) {
      try {
        inactive = JSON.parse(e.message.slice(e.message.indexOf("{"))).message.split("\n")[0];
      } catch {
        inactive = e.message;
      }
      notActive.push(wf.name);
      inactiveFiles.add(file);
    }
  }
  const step = stepOf(wf.name);
  console.log(
    `${found ? "Updated" : "Created"} "${wf.name}" from ${file}` +
      (hooks.length && !inactive ? `, active; run it with npm run invoke -- ${step}` : "") +
      (inactive ? `, saved but not active: ${inactive}` : "") +
      ` (${N8N_URL}/workflow/${saved.id})`,
  );
}
for (const file of files) await deployFile(file);
secondPass = true;
const retry = files.filter((f) => relink.has(f) || inactiveFiles.has(f));
if (retry.length) {
  notActive.length = 0;
  inactiveFiles.clear();
  for (const file of retry) await deployFile(file);
}
if (notActive.length) {
  console.log(`Not active yet: ${notActive.join(", ")}. Add the missing keys to .env, run npm run credentials, then deploy again.`);
}
