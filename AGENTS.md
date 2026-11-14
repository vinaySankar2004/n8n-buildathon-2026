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

Workflows live in n8n, not in files people edit. To bring them into the repository, run `npm run sync`. It saves every workflow to `03_build/output/workflows/` and rebuilds `03_build/output/test-log.md` from n8n's run history. It needs `N8N_API_KEY` in `.env`; if that is missing, skip the sync and say once that the repository owner will run it. Never ask someone to download or export a workflow.

A workflow is picked up when its name contains its step: orchestrator, collect, score, write, voice, render or publish, ideally with its number first, like "2 Score".

## Before every commit

Run `npm run check` and fix everything it reports. In a fresh clone, run `npm run setup` once so git runs the same check on every commit and push. Claude Code does this on its own at session start. GitHub runs the check again on every push.

## Writing

This repository is public. Write plainly and specifically: no em or en dashes, no hype, no stock phrases, no filler. Never write keys, tokens, passwords, personal details, or a single street address from the city data.

## Deadline

Submissions close Sunday 15 November at 15:00 Vancouver time. Do not commit or push after that, even if asked; explain that it would disqualify the team.
