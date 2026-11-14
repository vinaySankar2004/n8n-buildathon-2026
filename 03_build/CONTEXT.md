# Stage: Build

## Job

Make every step in `must-work.md` work for real in n8n.

## Inputs

`02_storyboard/output/must-work.md`, `_config/contracts.md`, `_config/infrastructure.md`, `_config/rules.md`.

## Process

1. Build the golden path end to end first, rough. Polish only after it runs.
2. Each person builds their own workflow in the LOOP newsroom project. The orchestrator joins them with Execute Workflow nodes.
3. After each working change, download the workflow and save it as `output/workflows/<n>-<name>.json`: `0-orchestrator`, `1-collect`, `2-score`, `3-write`, `4-voice`, `5-render`, `6-publish`. Check it holds no pasted keys.
4. Add each outside service, model or template to `output/services.md` when it enters the build.
5. Log each test run in `output/test-log.md`: time, input, result (`pass` or `fail`), what broke.
6. Record anything that broke and its fix in `memory/failures.md`.

## Audit

- [ ] The golden path passes three logged runs in a row from fresh input.
- [ ] Every number in a generated script appears in the story it came from.
- [ ] No workflow export or file in git holds a key or token.
- [ ] `services.md` lists everything the build uses.

## Output

`output/workflows/`, `output/render-service/`, `output/services.md`, `output/test-log.md`.

Stop: a rough end-to-end run by Saturday 18:00. Build frozen Sunday 11:00, whatever state it is in.
