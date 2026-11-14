# Local data newsroom

Vancouver publishes fresh city data every day, and nobody has time to turn it into stories. This project finds the week's real story in that data and turns it into a narrated 20 second video that an editor approves with one tap. It is built in n8n for LOOP, the UBC eProjects x n8n Buildathon, November 2026.

## How it works

1. n8n pulls nine weeks of 3-1-1 service requests from the City of Vancouver open data API.
2. A code step compares this week with the eight before and picks the biggest real change.
3. An AI agent writes a short script and a chart spec, using only numbers from the data.
4. ElevenLabs voices the script, and a Remotion service renders a vertical video.
5. The editor approves it in Slack, and n8n publishes it.

On 14 November the top story was street flooding: 215 reports in a week, 7.3 times the usual level.

## Repository

This repository is the team's working space, laid out as an ICM workspace: numbered stage folders, each with a `CONTEXT.md` contract. Start at [CONTEXT.md](CONTEXT.md).

## Working in it

```bash
git clone git@github.com:vinaySankar2004/n8n-buildathon-2026.git
```

1. Read [CONTEXT.md](CONTEXT.md), then the contract of the stage you are working on.
2. Put your name against your step in [must-work.md](02_storyboard/output/must-work.md).
3. Build inside the LOOP newsroom project in n8n, never in your Personal space.
4. After each working change, download your workflow from n8n and save it as `03_build/output/workflows/<n>-<name>.json`, for example `2-score.json`. Check it holds no pasted keys before you commit.
