# Infrastructure

| Piece | Where | Access | Limits |
| --- | --- | --- | --- |
| n8n Cloud | Instance `vsa91.app.n8n.cloud`, project [LOOP newsroom](https://vsa91.app.n8n.cloud/projects/zBY7jRVLjKEeTZ0a) | Team members by invite | Trial with 1,000 executions. Keep schedule triggers off while building. |
| Render service | `03_build/output/render-service`, on Vinayak's Mac, port 8787 | Through the tunnel | The Mac must stay awake and online. |
| Tunnel | ngrok, `https://paratactical-professionally-yasuko.ngrok-free.dev` | Every `/render` call needs the `x-render-token` header | Free plan |
| City data | City of Vancouver open data API, v2.1 | Public, no key | 3-1-1 data refreshes once a day |
| ElevenLabs | ElevenLabs cloud | Key in an n8n credential | Creator month from the event |
| Slack | Team workspace | Not set up yet | Free plan |

## Calling the render service from n8n

Use an HTTP Request node with:

- `POST https://paratactical-professionally-yasuko.ngrok-free.dev/render`
- a Header Auth credential named "Render token", created inside the LOOP newsroom project, sending `x-render-token`; Vinayak shares the value directly, never in a doc or chat log
- a JSON body `{ "spec": …, "audio_base64": … }` or `{ "spec": …, "audio_url": … }`, with `spec` as in [contracts.md](contracts.md)
- a timeout of 120 seconds

It returns `{ "video_url", "duration_s", "render_seconds" }`. When n8n downloads the video file, add the header `ngrok-skip-browser-warning: 1`.

## Syncing from n8n

`npm run sync` reads `N8N_API_KEY` from a `.env` at the repository root. Only the person who syncs needs one; create it in n8n under Settings, n8n API. The trial blocks API keys for now (see F3 in `memory/failures.md`).

## Secrets

Keys and tokens live only in n8n credentials and in local `.env` files. Git ignores `.env`, and `npm run check` blocks any commit that contains one.
