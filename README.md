# Local data newsroom

Vancouver publishes fresh city data every day, and nobody has time to turn it into stories. This project finds the week's real story in that data and turns it into a narrated 20 second video that an editor approves with one tap. It is built in n8n for LOOP, the UBC eProjects x n8n Buildathon, November 2026.

## How it works

1. n8n pulls nine weeks of 3-1-1 service requests, building permits and business licences from the City of Vancouver open data API.
2. A code step compares this week with the eight before and picks the biggest real change.
3. An AI agent writes a short script and a chart spec, using only numbers from the data.
4. ElevenLabs voices the script, and a Remotion service renders a vertical video.
5. The editor approves it in Slack, and n8n publishes it.

For the week of 7 to 13 November the top story was street flooding: 218 reports, 7.4 times the usual level, up from 45 and 93 in the two weeks before.

## For the team

- Open this repository in your AI coding tool (Claude Code, Codex or Cursor) and ask it what to do. It runs `npm run doctor`, which checks your setup and lists what is left, then does what it can and asks you only for keys or clicks. After that, say what you want to build.
- To build something, say what you want. It writes the n8n workflow as code, deploys it to our n8n, runs it and fixes it. Nobody needs the n8n editor.
- To deploy, copy `.env.example` to `.env` and fill in `N8N_API_KEY`, which Vinayak sends in a direct message. The file says what else, if anything, is yours to fill in.
- Every commit and push is checked for keys and careless mistakes, here and on GitHub.
- Nothing gets pushed after Sunday 15:00.

```bash
git clone git@github.com:vinaySankar2004/n8n-buildathon-2026.git
```
