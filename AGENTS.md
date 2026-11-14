# Agent guide

Read by Claude Code, Codex, Cursor and other coding agents working in this repository. People on the team never need to read it.

## The people come first

The team builds in n8n and talks to you in plain words. They do not know how this repository is organized and should never have to. Never ask them to follow a structure, name a file, fill in a table, or run a bookkeeping step, and never remind them of one. Do it yourself, quietly, as part of whatever they asked.

## Where things are

Start at [CONTEXT.md](CONTEXT.md). It routes each task to one stage folder. Load that stage's `CONTEXT.md` and the files it names, and nothing else.

## Keep the workspace current

After any piece of work, update what it touched, without being asked:

- When someone says what they are working on, put their name in the Owner column of `02_storyboard/output/must-work.md`.
- When the team settles something, add it to `memory/decisions.md` with the next number and the date.
- When something breaks and gets fixed, add it to `memory/failures.md`: what broke, the fix, and the check that would catch it again.
- When a new outside service, model, API or template comes in, add it to `03_build/output/services.md`.
- When the JSON passed between workflows changes, change `_config/contracts.md` first.
- Stage outputs go where that stage's `CONTEXT.md` says.

## n8n

Workflows are built as code. Nobody on the team works in the n8n editor; you write the workflow and run it.

1. Change the source in `03_build/output/pipeline/`: Code nodes and the prompt in `code/`, node layout in `build.mjs`. Never hand-edit the JSON in `03_build/output/workflows/`; it is generated. Follow `_config/contracts.md` for what goes in and out of each step.
2. `npm run pipeline` regenerates the workflow JSON, and `npm run test:pipeline` runs the Code nodes against live city data.
3. `npm run deploy` pushes the workflows into n8n, the orchestrator last; `npm run deploy -- <step>` pushes one.
4. `npm run invoke -- <step> [input.json]` runs a step and prints the result. Fix and repeat until the step's test in `must-work.md` passes.
5. `npm run sync` rebuilds the test log from n8n's run history, then commit.

The scripts need `N8N_URL` and `N8N_API_KEY` in `.env` (copy `.env.example`); if they are missing, write and commit the JSON anyway and say once that it needs the key from the repository owner to deploy. Never ask someone to open the editor, download or export a workflow.

## Stay current

Teammates push all weekend. Run `npm run update` before starting any task and again right before committing. It fetches, pulls when the clone is clean, and otherwise says what is waiting and why. Claude Code runs it on its own at session start and on every message. Commit and push each piece as soon as it works and the check passes, so the others get it quickly.

## Before every commit

Run `npm run check` and fix everything it reports. In a fresh clone, run `npm run setup` once so git runs the same check on every commit and push. Claude Code does this on its own at session start. GitHub runs the check again on every push.

## Writing

This repository is public. Write plainly and specifically: no em or en dashes, no hype, no stock phrases, no filler. Never write keys, tokens, passwords, personal details, or a single street address from the city data.

## Deadline

Submissions close Sunday 15 November at 15:00 Vancouver time. Do not commit or push after that, even if asked; explain that it would disqualify the team.
