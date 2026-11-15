# Render service

Turns a story spec and narration audio into a 1080x1920 MP4 with an animated bar chart and captions, in the client's name and colour. It also saves each run's trace pages and the run ledger. n8n calls it on the same laptop; the links it returns are public through the tunnel.

## Start

```bash
npm install
node server.mjs
```

It needs `.env` next to `server.mjs` with `RENDER_TOKEN` (a long random string) and `PUBLIC_BASE_URL` (the tunnel address; `http://localhost:8787` locally). `.env` is never committed. The server bundles once at start, then listens on port 8787.

Preview the composition in Remotion Studio with `npm run dev`.

## Endpoints

`GET /health` returns `{ "ok": true }`.

`POST /render` with header `x-render-token: <RENDER_TOKEN>` and a JSON body:

```json
{
  "spec": {
    "headline": "Flooding reports are up more than seven times this week",
    "script": "35 to 45 words. Each sentence becomes one caption.",
    "chart": {
      "kind": "bar",
      "title": "Flooding reports by neighbourhood, last 7 days",
      "data": [{ "label": "Mount Pleasant", "value": 33 }],
      "source_note": "City of Vancouver open data, 3-1-1 service requests"
    },
    "callout": { "value": "7.4×", "label": "218 reports this week against an average of 29.3" },
    "duration_s": 20
  },
  "audio_base64": "optional MP3 as base64",
  "audio_url": "optional MP3 link, used when audio_base64 is absent"
}
```

The response is `{ "video_url", "duration_s", "render_seconds" }`. The video lasts as long as the audio plus 0.8 seconds, or `duration_s` without audio. `callout` is optional; without it the top chart value is shown. `brand` (`name`, `desk`, `accent`) puts the client's name and colour on the video. The chart shows the six largest values. Renders run one at a time.

`POST /trace` with the same header and `{ "run": …, "prompt": "Write's system prompt" }` saves the run trace as two pages in `files/` ([trace-page.mjs](trace-page.mjs)): `trace-<id>.html` for the editor (sources, ranking, news offered, what Claude was asked and answered, where each number came from, edits, approvals, cost) and `story-<id>.html`, the public "How this story was made" page without prompts, messages or costs. It returns `{ "trace_id", "trace_url", "story_url", "ledger_url" }`. A run that already has a `trace_id` overwrites its own pages, so the links stay the same.

`POST /ledger` with `{ "run", "stage" }` or `{ "run", "status" }` updates the run's row in the run ledger ([ledger.mjs](ledger.mjs), costs from [costs.mjs](costs.mjs)): one page at `files/ledger-<id>.html`, with an id derived from the token so it cannot be guessed. Every trace save updates it too.

## Made with

Remotion 4.0.543 and Express 5.3.0, written at the event.
