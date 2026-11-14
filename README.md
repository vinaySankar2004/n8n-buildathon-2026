# Local data newsroom

Vancouver publishes fresh city data every day, and nobody has time to turn it into stories. This project finds the week's real story in that data and turns it into a narrated 20 second video that an editor approves with one tap. It is built in n8n for LOOP, the UBC eProjects x n8n Buildathon, November 2026.

## How it works

1. n8n pulls nine weeks of 3-1-1 service requests from the City of Vancouver open data API.
2. A code step compares this week with the eight before and picks the biggest real change.
3. An AI agent writes a short script and a chart spec, using only numbers from the data.
4. ElevenLabs voices the script, and a Remotion service renders a vertical video.
5. The editor approves it in Slack, and n8n publishes it.

On 14 November the top story was street flooding: 215 reports in a week, 7.3 times the usual level.

## For the team

- Build your part in n8n, inside the LOOP newsroom project.
- To work on anything in this repository, open it in your AI coding tool (Claude Code, Codex or Cursor) and say what you are doing. The tool knows how the repository is kept.
- Every commit and push is checked for keys and careless mistakes, here and on GitHub.
- Nothing gets pushed after Sunday 15:00.

```bash
git clone git@github.com:vinaySankar2004/n8n-buildathon-2026.git
```
