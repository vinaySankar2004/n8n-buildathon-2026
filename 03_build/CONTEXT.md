# Stage: Build

## Job

Make every step in `must-work.md` work for real in n8n.

## Inputs

`02_storyboard/output/must-work.md`, `_config/contracts.md`, `_config/infrastructure.md`, `_config/rules.md`.

## Process

1. Build the golden path end to end first, rough. Polish only after it runs.
2. Each step is its own workflow, written as JSON and pushed with `npm run deploy`. The orchestrator joins them with Execute Workflow nodes. `npm run invoke -- <step>` runs a step on its own.
3. Run `npm run sync` after each working change. It saves every workflow whose name holds its step to `output/workflows/<n>-<step>.json` (`0-orchestrator`, `1-collect`, `2-score`, `3-write`, `4-voice`, `5-render`, `6-publish`) with test data stripped.
4. Add each outside service, model or template to `output/services.md` when it enters the build.
5. `npm run sync` also rebuilds `output/test-log.md` from n8n's run history. Never edit it by hand.
6. Record anything that broke and its fix in `memory/failures.md`.

## Audit

- [ ] The golden path passes three logged runs in a row from fresh input.
- [ ] Every number in a generated script appears in the story it came from.
- [ ] No workflow export or file in git holds a key or token.
- [ ] `services.md` lists everything the build uses.

## Output

`output/workflows/`, `output/render-service/`, `output/host/`, `output/services.md`, `output/test-log.md`.

Stop: a rough end-to-end run by Saturday 18:00. Build frozen Sunday 11:00, whatever state it is in.
