# Stage: Build

## Job

Make every step in `must-work.md` work for real in n8n.

## Inputs

`02_storyboard/output/must-work.md`, `_config/contracts.md`, `_config/infrastructure.md`, `_config/rules.md`.

## Process

1. Build the golden path end to end first, rough. Polish only after it runs.
2. Each step is its own workflow, generated from `output/pipeline/` by `npm run pipeline` into `output/workflows/<n>-<step>.json`: `0-orchestrator`, `1-collect`, `2-score`, `3-write`, `4-voice`, `5-render`, `6-publish`. Change the source, never the generated JSON. `npm run test:pipeline` checks the Code nodes against live data.
3. `npm run deploy` pushes the workflows into n8n, and `npm run invoke -- <step> [input.json]` runs one and prints the result. Repeat until the step's test passes.
4. `npm run sync` rebuilds `output/test-log.md` from n8n's run history. Never edit the test log by hand.
5. Add each outside service, model or template to `output/services.md` when it enters the build.
6. Record anything that broke and its fix in `memory/failures.md`.

## Audit

- [ ] The golden path passes three logged runs in a row from fresh input.
- [ ] Every number in a generated script appears in the story it came from.
- [ ] No workflow export or file in git holds a key or token.
- [ ] `services.md` lists everything the build uses.

## Output

`output/pipeline/`, `output/workflows/`, `output/render-service/`, `output/host/`, `output/services.md`, `output/test-log.md`.

Stop: a rough end-to-end run by Saturday 18:00. Build frozen Sunday 11:00, whatever state it is in.
