# Infrastructure

Everything runs on Vinayak's Mac behind one public address, so the n8n API is fully available and workflows are built as code. See D11 in `memory/decisions.md`.

| Piece | Where | Access | Limits |
| --- | --- | --- | --- |
| n8n 2.47.7 | Vinayak's Mac, port 5678 | Owner login; API key for scripts | The Mac must stay awake and online |
| Render service | `03_build/output/render-service`, Vinayak's Mac, port 8787: renders videos, and saves the run traces and the run ledger under `/files/` | `/render`, `/trace` and `/ledger` need the `x-render-token` header | One render at a time |
| Router | `03_build/output/host/router.mjs`, port 8080 | Sends `/render`, `/files` and `/health` to the render service; checks Slack's signature on `/slack/events` and `/slack/interactivity` and passes both to 7 Chat; sends everything else to n8n | None |
| Tunnel | ngrok, `https://paratactical-professionally-yasuko.ngrok-free.dev`, pointed at the router | Public | Free plan: a browser sees a warning page once; scripts skip it |
| City data | City of Vancouver open data API, v2.1 | Public, no key | 3-1-1 data refreshes once a day |
| News feeds | BC Government News RSS, Environment Canada alerts API, DriveBC Open511 | Public, no key | A feed that fails is skipped |
| Claude | Anthropic API: Sonnet 5.5 (3 Write), Haiku 5.5 (7 Chat, 8 Request) | Key in the n8n credential "Anthropic" | Billed per token; each run's cost is in the run ledger |
| ElevenLabs | ElevenLabs cloud, Multilingual v2 | Key in the n8n credential "ElevenLabs" | Monthly credits; the key needs User: Read for the ledger's price |
| Slack | Workspace n8n-buildathon, app "Newsroom" made from `03_build/output/host/slack-app-manifest.yml` | Bot token in the n8n credential "Slack"; channel IDs in the client file | Free plan |
| n8n Cloud | `vsa91.app.n8n.cloud` | Team invited | Trial blocks the API (F3). Not used. |

## Running the host laptop

`npm run host` starts whatever is not running: the render service, n8n, the router and the tunnel, each detached so it outlives the terminal or agent that started it, plus keep-awake so the Mac does not idle-sleep. `npm run host -- status` shows what is up, including n8n through the tunnel, and `npm run host -- stop` stops all of it. Logs are in `03_build/output/host/logs/`. It reads `N8N_START`, `TUNNEL_URL` and `SLACK_SIGNING_SECRET` from the host's `.env`. After a restart, a lid close or a network change, run `npm run host` again.

## Building and calling

Workflows are generated from `03_build/output/pipeline/` and deployed with npm scripts; its README has the steps and tests. The scripts read `N8N_URL` and `N8N_API_KEY` from `.env`: `http://localhost:5678` on the host laptop, the tunnel for everyone else. n8n reaches the render service directly at `http://127.0.0.1:8787`; its endpoints are in the render service's README.

## Secrets

`.env.example` lists every value and who fills it in. Only two things are shared between people: the tunnel address, which is in the example, and `N8N_API_KEY`, sent by direct message. Each service key (Anthropic, ElevenLabs, Slack, render token) is loaded once by its owner with `npm run credentials` and then lives inside n8n, so nobody else needs it.

Keys and tokens live only in n8n credentials and in local `.env` files. Git ignores `.env`, and `npm run check` blocks any commit that contains one.
