// Render service: n8n posts a story spec and narration audio, gets back an MP4 link.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import express from "express";
import { execFile } from "node:child_process";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { tracePage } from "./trace-page.mjs";
import { entryFrom, ledgerStore } from "./ledger.mjs";

const run = promisify(execFile);
const root = path.dirname(fileURLToPath(import.meta.url));

// Minimal .env loader, so no extra dependency is needed.
const envFile = path.join(root, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const PORT = Number(process.env.PORT ?? 8787);
const TOKEN = process.env.RENDER_TOKEN ?? "";
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL ?? `http://localhost:${PORT}`).replace(/\/$/, "");
const FILES = path.join(root, "files");
mkdirSync(FILES, { recursive: true });

if (!TOKEN) {
  console.error("RENDER_TOKEN is not set. Put it in .env first.");
  process.exit(1);
}

console.log("Bundling the composition once...");
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), rspack: true });
console.log("Bundle ready.");

const tokenOk = (given) => {
  const a = Buffer.from(String(given ?? ""));
  const b = Buffer.from(TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
};

const audioSeconds = async (file) => {
  try {
    const { stdout } = await run("ffprobe", [
      "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file,
    ]);
    const s = parseFloat(stdout.trim());
    return Number.isFinite(s) && s > 0 ? s : null;
  } catch {
    return null;
  }
};

const validSpec = (spec) =>
  spec &&
  typeof spec.headline === "string" &&
  typeof spec.script === "string" &&
  spec.chart &&
  Array.isArray(spec.chart.data) &&
  spec.chart.data.length > 0;

const app = express();
app.use(express.json({ limit: "25mb" }));
app.use("/files", express.static(FILES));

app.get("/health", (_req, res) => res.json({ ok: true }));

// One render at a time keeps a laptop responsive.
let queue = Promise.resolve();

app.post("/render", async (req, res) => {
  if (!tokenOk(req.get("x-render-token"))) return res.status(401).json({ error: "bad token" });
  const { spec, audio_base64, audio_url } = req.body ?? {};
  if (!validSpec(spec)) return res.status(400).json({ error: "spec needs headline, script and chart.data" });

  const id = randomUUID();
  const job = queue.then(async () => {
    const started = Date.now();
    let audioSrc = null;
    let durationInSeconds = null;

    if (audio_base64 || audio_url) {
      const audioFile = path.join(FILES, `${id}.mp3`);
      if (audio_base64) {
        await writeFile(audioFile, Buffer.from(audio_base64, "base64"));
      } else {
        const r = await fetch(audio_url);
        if (!r.ok) throw new Error(`audio_url returned ${r.status}`);
        await writeFile(audioFile, Buffer.from(await r.arrayBuffer()));
      }
      durationInSeconds = await audioSeconds(audioFile);
      // The headless browser fetches the audio from this server.
      audioSrc = `http://localhost:${PORT}/files/${id}.mp3`;
    }

    const inputProps = { spec, audioSrc, durationInSeconds };
    const composition = await selectComposition({ serveUrl, id: "Story", inputProps });
    const outputLocation = path.join(FILES, `${id}.mp4`);
    await renderMedia({ composition, serveUrl, codec: "h264", outputLocation, inputProps });
    return { id, seconds: (Date.now() - started) / 1000, duration: composition.durationInFrames / composition.fps };
  });
  queue = job.catch(() => {});

  try {
    const done = await job;
    console.log(`Rendered ${done.id} in ${done.seconds.toFixed(1)} s`);
    res.json({
      video_url: `${PUBLIC_BASE_URL}/files/${done.id}.mp4`,
      duration_s: done.duration,
      render_seconds: done.seconds,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err?.message ?? err) });
  }
});

// The run ledger page has a fixed but unguessable name, derived from the render token.
const LEDGER_NAME = `ledger-${createHash("sha256").update(TOKEN).digest("hex").slice(0, 12)}`;
const LEDGER_URL = `${PUBLIC_BASE_URL}/files/${LEDGER_NAME}.html`;
const ledger = ledgerStore(FILES, LEDGER_NAME);

// Run trace: n8n posts the run (and Write's prompt) after Write and again on publish. Both pages are
// saved under one id, so the links stay the same while the run moves on.
app.post("/trace", async (req, res) => {
  if (!tokenOk(req.get("x-render-token"))) return res.status(401).json({ error: "bad token" });
  const { run, prompt } = req.body ?? {};
  if (!run?.story || !run?.spec) return res.status(400).json({ error: "run needs story and spec" });
  const id = /^[0-9a-f-]{36}$/.test(String(run.trace_id)) ? run.trace_id : randomUUID();
  const urls = { trace_id: id, trace_url: `${PUBLIC_BASE_URL}/files/trace-${id}.html`, story_url: `${PUBLIC_BASE_URL}/files/story-${id}.html`, ledger_url: LEDGER_URL };
  const saved = { ...run, ...urls, story_page_url: urls.story_url, trace_saved_at: new Date().toISOString() };
  try {
    await writeFile(path.join(FILES, `trace-${id}.html`), tracePage(saved, { prompt, editor: true, ledgerUrl: LEDGER_URL }));
    await writeFile(path.join(FILES, `story-${id}.html`), tracePage(saved, { editor: false }));
    await ledger.upsert(entryFrom(saved));
  } catch (err) {
    return res.status(500).json({ error: String(err?.message ?? err) });
  }
  res.json(urls);
});

// Ledger reports from n8n: { run, stage } from the review thread, or { run, status } from anywhere else.
app.post("/ledger", async (req, res) => {
  if (!tokenOk(req.get("x-render-token"))) return res.status(401).json({ error: "bad token" });
  const { run, stage, status } = req.body ?? {};
  try {
    await ledger.upsert(entryFrom(run || {}, status || ledger.stageStatus(stage)));
  } catch (err) {
    return res.status(500).json({ error: String(err?.message ?? err) });
  }
  res.json({ ok: true, ledger_url: LEDGER_URL });
});

app.listen(PORT, () => console.log(`Render service on http://localhost:${PORT}; run ledger at ${LEDGER_URL}`));
