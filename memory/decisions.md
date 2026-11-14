# Decisions

Team decisions, with date and what they affect. Add new ones at the bottom with the next number.

- **D1, 2026-11-14. Overall prizes and the n8n track only.** We do not enter the Investly finance track.
- **D2, 2026-11-14. Build the local data newsroom.** See [pick.md](../01_idea/output/pick.md).
- **D3, 2026-11-14. One n8n Cloud project, one workflow per person.** The project is LOOP newsroom. An orchestrator workflow calls each step workflow with Execute Workflow.
- **D4, 2026-11-14. Public open data, reported by neighbourhood.** A story never points at a single address, even though the city data includes addresses.
- **D5, 2026-11-14. The outlet is made up.** No real newsroom's name, logo or look.
- **D6, 2026-11-14. Storyboard before build.** We build only what the demo video shows. See [must-work.md](../02_storyboard/output/must-work.md).
- **D7, 2026-11-14. Rendering runs on a laptop behind a tunnel.** n8n Cloud cannot run local commands, so a Remotion service on Vinayak's Mac renders the video and ngrok exposes it, guarded by a token. First render through the tunnel took 5.2 seconds.
- **D8, 2026-11-14. This repository is the team workspace and the submission.** It is public from the start, so everything in it is written for anyone to read.
- **D9, 2026-11-14. The repository keeps itself in order.** Teammates never follow or learn its structure. Coding agents do the bookkeeping (see AGENTS.md), `npm run sync` pulls workflows and runs from n8n, and `tools/check.mjs` runs on every commit, push and GitHub build.
