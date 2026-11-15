// Shared client for the n8n public API, used by the deploy, invoke and sync scripts.
// Reads N8N_URL and N8N_API_KEY from the environment or from a git-ignored .env at the repository root.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const STEPS = ["orchestrator", "collect", "score", "context", "write", "voice", "render", "publish", "chat"];
export const WORKFLOW_DIR = path.join(root, "03_build/output/workflows");

function fromEnvFile(name) {
  const file = path.join(root, ".env");
  if (!existsSync(file)) return undefined;
  const m = readFileSync(file, "utf8").match(new RegExp(`^[ \\t]*${name}[ \\t]*=[ \\t]*(\\S.*?)[ \\t]*$`, "m"));
  return m?.[1];
}

export const N8N_URL = (process.env.N8N_URL || fromEnvFile("N8N_URL") || "http://localhost:5678").replace(/\/$/, "");
const KEY = process.env.N8N_API_KEY || fromEnvFile("N8N_API_KEY");

export function requireKey() {
  if (KEY) return;
  console.error(
    "No N8N_API_KEY. Put N8N_URL and N8N_API_KEY in .env at the repository root. " +
      "The host laptop uses http://localhost:5678; everyone else uses the tunnel address in _config/infrastructure.md. " +
      "Ask the repository owner for the key in a direct message.",
  );
  process.exit(1);
}

const headers = () => ({
  "X-N8N-API-KEY": KEY,
  accept: "application/json",
  "content-type": "application/json",
  "ngrok-skip-browser-warning": "1",
});

export async function api(method, apiPath, body) {
  const r = await fetch(`${N8N_URL}/api/v1${apiPath}`, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${apiPath} answered ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

export async function listAll(apiPath) {
  const out = [];
  let cursor = "";
  do {
    const sep = apiPath.includes("?") ? "&" : "?";
    const page = await api("GET", `${apiPath}${sep}limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    out.push(...(page.data || []));
    cursor = page.nextCursor || "";
  } while (cursor);
  return out;
}

export const stepOf = (name) => STEPS.find((s) => String(name).toLowerCase().includes(s));

process.on("uncaughtException", (e) => {
  console.error(e.message);
  process.exit(1);
});
