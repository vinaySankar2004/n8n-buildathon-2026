# Infrastructure

Everything runs on Vinayak's Mac behind one public address, so the n8n API is fully available and workflows are built as code. See D11 in `memory/decisions.md`.

| Piece | Where | Access | Limits |
| --- | --- | --- | --- |
| n8n 2.47.7 | Vinayak's Mac, port 5678; editor at `https://paratactical-professionally-yasuko.ngrok-free.dev` | Owner login; API key for scripts | The Mac must stay awake and online |
| Render service | `03_build/output/render-service`, Vinayak's Mac, port 8787 | `/render` needs the `x-render-token` header | One render at a time |
| Router | `03_build/output/host/router.mjs`, port 8080 | Sends `/render`, `/files` and `/health` to the render service, answers Slack at `/slack/interactivity`, and sends everything else to n8n | None |
| Tunnel | ngrok, `https://paratactical-professionally-yasuko.ngrok-free.dev`, pointed at the router | Public | Free plan: a browser sees a warning page once; scripts skip it |
| City data | City of Vancouver open data API, v2.1 | Public, no key | 3-1-1 data refreshes once a day |
| ElevenLabs | ElevenLabs cloud | Key in an n8n credential | Creator month from the event |
| Slack | Workspace n8n-buildathon, app "Newsroom" made from `03_build/output/host/slack-app-manifest.yml` | Bot token in `.env` as `SLACK_BOT_TOKEN`; channel IDs in `pipeline/build.mjs` | Free plan |
| n8n Cloud | `vsa91.app.n8n.cloud`, project LOOP newsroom | Team invited | Trial blocks the API (F3). Kept as a fallback. |

## Building workflows as code

The source is `03_build/output/pipeline/` (see its README). `npm run pipeline` generates one JSON file per step in `03_build/output/workflows/`: `0-orchestrator`, `1-collect`, `2-score`, `3-write`, `4-voice`, `5-render`, `6-publish`. Never hand-edit those files.

- `npm run deploy` creates or updates each workflow in n8n by name and activates it. It refuses to run from a clone that is behind GitHub. `npm run deploy -- score` deploys one.
- `npm run invoke -- score [input.json]` runs one step through its test webhook and prints what it returned.
- `npm run sync` rebuilds the test log from n8n's run history. `npm run sync -- --workflows` also pulls the deployed JSON back, only to compare it with the generated files.

Each step workflow has two triggers: "When Executed by Another Workflow", which the orchestrator calls, and a Webhook at `step-<step>` (POST, respond when the last node finishes) for `invoke`. Schedules stay off while building.

These scripts read `N8N_URL` and `N8N_API_KEY` from a git-ignored `.env` at the repository root. On the host laptop `N8N_URL` is `http://localhost:5678`; everyone else uses the tunnel address. Vinayak shares the key in a direct message, never in a doc, channel or commit.

## Calling the render service from n8n

n8n and the render service share a machine, so the HTTP Request node calls `http://127.0.0.1:8787/render` directly, with:

- a Header Auth credential named "Render token" sending `x-render-token`
- a JSON body `{ "spec": …, "audio_base64": … }` or `{ "spec": …, "audio_url": … }`, with `spec` as in [contracts.md](contracts.md)
- a timeout of 120 seconds

It returns `{ "video_url", "duration_s", "render_seconds" }`, where `video_url` is a public link through the tunnel.

## Secrets

`.env.example` lists every value and who fills it in. Only two things are shared between people: the tunnel address, which is in the example, and `N8N_API_KEY`, sent by direct message. Each service key (Anthropic, ElevenLabs, Slack, render token) is loaded once by its owner with `npm run credentials` and then lives inside n8n, so nobody else needs it.

Keys and tokens live only in n8n credentials and in local `.env` files. Git ignores `.env`, and `npm run check` blocks any commit that contains one.
