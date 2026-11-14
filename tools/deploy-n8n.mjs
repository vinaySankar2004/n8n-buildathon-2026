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

const existing = new Map((await listAll("/workflows")).map((w) => [w.name, w]));

for (const file of files) {
  const wf = JSON.parse(readFileSync(path.join(WORKFLOW_DIR, file), "utf8"));
  // An Execute Workflow node names the workflow it calls; point it at that workflow's id in this n8n.
  for (const n of wf.nodes) {
    const ref = n.type === "n8n-nodes-base.executeWorkflow" ? n.parameters?.workflowId : null;
    if (!ref?.cachedResultName) continue;
    const target = existing.get(ref.cachedResultName);
    if (target) Object.assign(ref, { __rl: true, mode: "list", value: target.id });
    else console.warn(`"${wf.name}": no workflow named "${ref.cachedResultName}" yet for node "${n.name}"; deploy it first.`);
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
  if (hooks.length) await api("POST", `/workflows/${saved.id}/activate`);
  const step = stepOf(wf.name);
  console.log(
    `${found ? "Updated" : "Created"} "${wf.name}" from ${file}` +
      (hooks.length ? `, active; run it with npm run invoke -- ${step}` : "") +
      ` (${N8N_URL}/workflow/${saved.id})`,
  );
}
