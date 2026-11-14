# Render service

Turns a story spec and narration audio into a 1080x1920 MP4 with an animated bar chart and captions. n8n calls it on the same laptop; the video links it returns are public through the tunnel.

## Start

```bash
npm install
node server.mjs
```

It needs `.env` next to `server.mjs` with `RENDER_TOKEN` (a long random string) and `PUBLIC_BASE_URL` (the tunnel address once there is one; `http://localhost:8787` locally). `.env` is never committed. The server bundles once at start, then listens on port 8787.

Preview the composition in Remotion Studio with `npm run dev`.

## Endpoints

`GET /health` returns `{ "ok": true }`.

`POST /render` with header `x-render-token: <RENDER_TOKEN>` and a JSON body:

```json
{
  "spec": {
    "headline": "Flooding reports are up more than seven times this week",
    "script": "About 50 words. Each sentence becomes one caption.",
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

The response is `{ "video_url", "duration_s", "render_seconds" }`. The video lasts as long as the audio plus 0.8 seconds, or `duration_s` without audio. `callout` is optional; without it the top chart value is shown. The chart shows the six largest values. Renders run one at a time.

## Made with

Remotion 4.0.543 and Express 5.3.0, written at the event.
