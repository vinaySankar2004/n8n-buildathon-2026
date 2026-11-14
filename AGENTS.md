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

1. Write or change the workflow JSON in `03_build/output/workflows/<n>-<step>.json`. Follow `_config/contracts.md` for what goes in and out, and the conventions in `_config/infrastructure.md`: two triggers per step workflow, the test webhook at `step-<step>`, schedules off.
2. `npm run deploy -- <step>` pushes it into n8n.
3. `npm run invoke -- <step> [input.json]` runs it and prints the result. Fix and repeat until the step's test in `must-work.md` passes.
4. `npm run sync` pulls the deployed workflows and run history back, then commit.

Logic that can be tested outside n8n, such as the scoring code, gets a plain Node test too. The scripts need `N8N_URL` and `N8N_API_KEY` in `.env`; if they are missing, write and commit the JSON anyway and say once that it needs the key from the repository owner to deploy. Never ask someone to open the editor, download or export a workflow.

## Stay current

Teammates push all weekend. Run `npm run update` before starting any task and again right before committing. It fetches, pulls when the clone is clean, and otherwise says what is waiting and why. Claude Code runs it on its own at session start and on every message. Commit and push each piece as soon as it works and the check passes, so the others get it quickly.

## Before every commit

Run `npm run check` and fix everything it reports. In a fresh clone, run `npm run setup` once so git runs the same check on every commit and push. Claude Code does this on its own at session start. GitHub runs the check again on every push.

## Writing

This repository is public. Write plainly and specifically: no em or en dashes, no hype, no stock phrases, no filler. Never write keys, tokens, passwords, personal details, or a single street address from the city data.

## Deadline

Submissions close Sunday 15 November at 15:00 Vancouver time. Do not commit or push after that, even if asked; explain that it would disqualify the team.
