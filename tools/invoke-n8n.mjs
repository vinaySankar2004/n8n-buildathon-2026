#!/usr/bin/env node
// Runs one step workflow through its test webhook and prints what it returned.
// Every step workflow has a Webhook trigger at /webhook/step-<step> that responds when its last node finishes.
// Usage: npm run invoke -- score                     sends {}
//        npm run invoke -- write path/to/story.json  sends that file as the input
import { readFileSync } from "node:fs";
import { N8N_URL, STEPS } from "./n8n-api.mjs";

const [step, inputFile] = process.argv.slice(2);
if (!STEPS.includes(step)) {
  console.error(`Usage: npm run invoke -- <step> [input.json], where step is one of ${STEPS.join(", ")}.`);
  process.exit(1);
}
const body = inputFile ? readFileSync(inputFile, "utf8") : "{}";
const started = Date.now();
const r = await fetch(`${N8N_URL}/webhook/step-${step}`, {
  method: "POST",
  headers: { "content-type": "application/json", "ngrok-skip-browser-warning": "1" },
  body,
});
const text = await r.text();
let shown = text;
try {
  shown = JSON.stringify(JSON.parse(text), null, 2);
} catch {}
console.log(`${step}: HTTP ${r.status} in ${((Date.now() - started) / 1000).toFixed(1)} s`);
console.log(shown);
if (!r.ok) process.exit(1);
