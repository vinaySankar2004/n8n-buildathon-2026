# Architecture page

A live page showing every piece of the newsroom, where it runs, who owns it, and its state right now.

```bash
cd tools/architecture
node server.mjs
```

Then open http://127.0.0.1:4310. No install needed; it uses Node 18 or newer.

The page reads this repo every 5 seconds: which stage outputs exist, owners from the Owner column of `02_storyboard/output/must-work.md`, the data contracts, exported workflows in `03_build/output/workflows/`, and services named in `03_build/output/services.md`. It also checks n8n Cloud, the city data API, and, on the render laptop only, the render service and the ngrok tunnel.
