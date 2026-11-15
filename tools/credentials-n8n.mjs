#!/usr/bin/env node
// Creates or updates the pipeline's four n8n credentials from values in the git-ignored .env.
// A blank value is skipped. Values are never printed.
// Usage: npm run credentials
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { api, listAll, requireKey, root, N8N_URL } from "./n8n-api.mjs";

requireKey();

// Read .env line by line, so a blank value stays blank.
const env = {};
const file = path.join(root, ".env");
if (existsSync(file)) {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
}

// Names must match the credentials named in 03_build/output/pipeline/build.mjs.
const CREDENTIALS = [
  { env: "ANTHROPIC_API_KEY", name: "Anthropic", type: "anthropicApi", prefix: "sk-ant-", data: (v) => ({ apiKey: v }) },
  { env: "ELEVENLABS_API_KEY", name: "ElevenLabs", type: "httpHeaderAuth", prefix: "sk_", data: (v) => ({ name: "xi-api-key", value: v }) },
  { env: "RENDER_TOKEN", name: "Render token", type: "httpHeaderAuth", data: (v) => ({ name: "x-render-token", value: v }) },
  { env: "SLACK_BOT_TOKEN", name: "Slack", type: "slackApi", prefix: "xoxb-", data: (v) => ({ accessToken: v }) },
  // Reddit signs in with OAuth: after this creates it, open the credential once in n8n and click
  // Connect my account. It is never updated here, since that would drop the connection.
  { env: "REDDIT_CLIENT_ID", also: ["REDDIT_CLIENT_SECRET"], name: "Reddit", type: "redditOAuth2Api", once: true, data: (v, e) => ({ clientId: v, clientSecret: e.REDDIT_CLIENT_SECRET }) },
];

const existing = new Map((await listAll("/credentials")).map((c) => [`${c.type}/${c.name}`, c]));
let failed = 0;

for (const c of CREDENTIALS) {
  const value = env[c.env] || process.env[c.env];
  const all = { ...process.env, ...env };
  if (value && (c.also || []).some((k) => !all[k])) {
    console.log(`Skipped "${c.name}": ${(c.also || []).filter((k) => !all[k]).join(", ")} is blank in .env.`);
    continue;
  }
  if (!value) {
    console.log(`Skipped "${c.name}": ${c.env} is blank in .env.`);
    continue;
  }
  if (c.prefix && !value.startsWith(c.prefix)) console.warn(`Note: ${c.env} does not start with ${c.prefix}; check it is the right key.`);
  const body = { name: c.name, type: c.type, data: c.data(value, all) };
  const found = existing.get(`${c.type}/${c.name}`);
  if (found && c.once) {
    console.log(`Kept "${c.name}": it already exists in n8n. Delete it there first to replace it.`);
    continue;
  }
  try {
    if (found) {
      await api("PATCH", `/credentials/${found.id}`, body);
      console.log(`Updated "${c.name}".`);
    } else {
      await api("POST", "/credentials", body);
      console.log(`Created "${c.name}".`);
    }
  } catch (e) {
    failed++;
    console.error(`Could not save "${c.name}": ${[value, ...(c.also || []).map((k) => all[k])].reduce((m, v) => (v ? m.split(v).join("(value)") : m), e.message)}`);
  }
}

console.log(`\nDone against ${N8N_URL}. Run npm run deploy so the workflows pick up the credentials by name.`);
process.exit(failed ? 1 : 0);
