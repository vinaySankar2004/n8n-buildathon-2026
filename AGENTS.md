# Agent guide

Read by Claude Code, Codex, Cursor and other coding agents in this repository. People on the team never need to read it.

## People first

The team talks to you in plain words and does not know how this repository is organized. Never ask them to follow a structure, name a file or run a bookkeeping step, and never remind them of one. Do it yourself as part of what they asked.

## Start of every session

1. `npm run update` pulls teammates' work, and `npm run doctor` lists what is left to set up. Claude Code runs both at session start; their output is above.
2. Do every setup step you can. Ask the person only for a key, a channel ID or a click in a provider's console.
3. Until `product/output/spec.md` exists, the team is deciding what to build next. Once setup is done, open the conversation in `product/questions.md` (contract: `product/CONTEXT.md`) unless the person came with something else.

## Where things are

[CONTEXT.md](CONTEXT.md) routes each task to one stage folder. Load that stage's `CONTEXT.md` and the files it names, nothing else.

## n8n

Nobody uses the n8n editor. Change the pipeline source and deploy it as [03_build/output/pipeline/README.md](03_build/output/pipeline/README.md) describes; never hand-edit `03_build/output/workflows/`. Without `N8N_API_KEY` in `.env`, commit the change anyway and say once that it needs the key to deploy.

## Keep the workspace current

After any piece of work, without being asked:

- someone says what they are working on: their name in the Owner column of `02_storyboard/output/must-work.md`
- the team settles something: `memory/decisions.md`, next number, dated
- something breaks and gets fixed: `memory/failures.md`, with the check that would catch it again
- a new service, model, API or template: `03_build/output/services.md`
- the JSON between workflows changes: `_config/contracts.md` first

## Commits

Run `npm run check` and fix what it reports; git and GitHub run it too. Commit and push each piece as soon as it works, so the others get it.

## Writing

The repository is public. Plain and specific: no em or en dashes, no hype, no filler. Never write keys, tokens, passwords, personal details or a single street address.

## Deadline

Submissions close Sunday 15 November at 15:00 Vancouver time. Do not commit or push after that, even if asked; say it would disqualify the team.
