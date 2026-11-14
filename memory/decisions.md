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
- **D10, 2026-11-14. Collect pulls 3-1-1 only.** Building permits, business licences and Statistics Canada wait until the golden path passes. "This week" is the 7 whole Vancouver days ending on the city's newest refresh. Collect keeps every request type; Score's bar does the filtering. Replaced in part by D12.
- **D11, 2026-11-14. n8n runs on Vinayak's Mac, and workflows are built as code.** The Cloud trial blocks the API, so n8n 2.47.7 (the version Cloud runs) is self-hosted beside the render service, behind one tunnel and a small router. Claude writes each workflow as JSON, deploys it, runs it and reads the result back; nobody works in the editor. Moving to Cloud later is optional: the same JSON imports there.
- **D12, 2026-11-14. The pipeline is general across Vancouver datasets.** Replaces the 3-1-1-only part of D10. Each dataset is a short config (date, category and neighbourhood fields) in the orchestrator's "Vancouver sources" node; it starts with 3-1-1, issued building permits and business licences. Score ranks every category in every source, rises and drops alike, and ignores drops to zero. Vancouver only for now. Write uses the Anthropic API, Voice ElevenLabs, Publish Slack. See [pipeline/README.md](../03_build/output/pipeline/README.md).
