# Devpost page

The text for the Devpost submission, field by field. Edit here first, then paste into Devpost.

## Project name

NewsReels

## Elevator pitch

NewsReels turns a newsroom's own open data and news feeds into short narrated news videos, which their editor reviews and edits in a Slack thread before anything is published.

## About the project

### Inspiration

613 local news outlets have closed in 391 Canadian communities since 2008, about half of them in places under 20,000 people (Local News Research Project, via The Canadian Press, August 2026). The newsrooms and solo creators that remain have the public data, such as Vancouver's 1.33 million 3-1-1 service requests, updated daily, but no data desk and no video team. A freelance editor charges $20 to $500 for one short video. We wanted the finding and drafting to cost cents, while the editor keeps the judgement.

### What it does

For each client (our demo client is Rain City Ledger, a made-up Vancouver outlet), NewsReels:

1. Pulls nine weeks of the client's open data: City of Vancouver 3-1-1 requests, building permits and business licences.
2. Compares this week with the eight before and keeps only real changes: at least 20 and twice the usual level, or a fall to half.
3. Reads the client's news feeds (BC Government News, Environment Canada weather alerts, DriveBC road events) for context.
4. Has Claude draft a headline, a script of about 30 seconds, a chart, a closing line and a newsletter blurb in the client's style. A code check blocks any number that is not in the data or in a report the script names.
5. Sends the script and its data to the editor in a Slack thread before any voice or video is made. The editor replies in plain words and can change anything but the numbers ("make the headline calmer", "make it a line chart", "make Mount Pleasant red and Downtown green", "make it shorter") and the bot revises, with the same number check.
6. On "Approve script", ElevenLabs reads it and a Remotion service renders a vertical video of about 30 seconds, in three scenes (a title card with the big number, the chart, a closing line), into the thread. On "Approve and publish", it goes to the client's channel with a public "How this story was made" page.

Anyone in the newsroom can also ask in Slack: "@NewsReels how many noise complaints in Kitsilano this week?" gets the numbers in seconds, "@NewsReels show unemployment over the last 5 years" draws Vancouver's rate from Statistics Canada, and "@NewsReels make a video about graffiti in Mount Pleasant" opens a review thread with that story. For a story someone asks for, NewsReels also searches the web for recent reporting on it and shows the editor every source it used.

Every run has a trace (sources, ranking, news used, what Claude was asked and answered, where each number came from, edits, approvals, cost) and a row in a run ledger with who asked and what it cost. A story costs about one cent of Claude.

Example from the week of 7 to 13 November: 218 street flooding reports, 7.4 times the usual 29.3 a week, most in Mount Pleasant, with Environment Canada's coastal flooding statement as context.

### How we built it

- **n8n does the work:** ten workflows built as code and deployed through the n8n API: an orchestrator, Collect, Score, Context, Write, Voice, Render, Publish, a Slack review workflow (7 Chat) with a webhook and an n8n data table per thread, and a request workflow (8 Request). They are joined by Execute Workflow, with error paths that end in a "No story today" note to the editor.
- **Claude:** Sonnet 5.5 writes each draft and makes the editor's changes from the thread; Haiku 5.5 matches Slack requests to real data categories, neighbourhoods and time series. For requested stories, Claude's web search tool finds recent reporting, and each source is kept with the words it was quoted for. Code nodes, not the model, build the chart, the quick answers and the number check.
- **Video:** a Remotion template rendered by a small Express service, in the client's name and colour: a title card, a bar, line or pie chart, and a closing card.
- **Hosting:** n8n 2.47.7 self-hosted with the render service and a router on one laptop, behind an ngrok tunnel. The router checks Slack's signature on every event. The same setup runs on a small VPS, so a client can keep their data on their own server.
- **Each client is one config file:** name and look, Slack channels, data sources, news feeds and a style card.

### Challenges we ran into

- The n8n Cloud trial blocks the API, so we self-hosted n8n to build workflows as code.
- The first narration ran 28 seconds; we tightened the script length and check it in code.
- Slack thread replies only arrived after the app was reinstalled with the right permissions.
- n8n will not switch on two workflows that call each other, so the request workflow starts the review through a webhook instead.
- Node's time zone data and macOS disagree about Vancouver, so pages show times in the reader's own zone.

### Accomplishments that we're proud of

- An editor can go from city data to a published video entirely in Slack, with two approvals and plain-language edits.
- Every number on screen and in the script traces back to its source, and every run shows what it cost.
- Anyone can ask for a story in a sentence, and the answer comes from the data, not from the model.

### What we learned

Most of the reliability came from keeping the model's job small: code finds the story, checks every number and builds the chart, and the model only writes and edits words. Putting the human approval before the expensive steps also made the product cheaper.

### What's next for NewsReels

Run it for one neighbourhood newsletter for a month and count how many drafts the editor approves. Then more cities and clients, narration in more languages, a schedule per client, and the trace and ledger hosted outside the laptop.

### Services and models we used

n8n 2.47.7 (self-hosted community edition), Anthropic API (Claude Sonnet 5.5 and Haiku 5.5), ElevenLabs text to speech (Multilingual v2), Remotion, Express, FFmpeg, Slack, ngrok, City of Vancouver open data API, Statistics Canada Web Data Service, BC Government News RSS, Environment Canada weather alerts API, DriveBC Open511 API, and Claude Code for writing the code with us. The full list is in the repository's services.md.

## Built with

n8n, anthropic, claude, elevenlabs, remotion, react, typescript, javascript, node.js, express, slack, ngrok, ffmpeg, open-data

## Try it out

- https://github.com/vinaySankar2004/n8n-buildathon-2026

## Video demo

Pending: the demo video, 3 minutes or less.

## Image gallery

Uploaded from `05_submit/output/samples/`, with captions: chart types, the n8n orchestrator, the run trace, a request trace, the public page and the run ledger. Thumbnail: `thumbnail.png`.

## Status on Devpost

The team's draft, with Vinayak and Arman: https://devpost.com/software/newsreels-f5uegw (submission 1306753), entered in the n8n track. Everything above is filled in except the video link. To finish: add the YouTube or Vimeo link, tick the terms, and submit by 14:45 (edits close at 15:00). Vinayak's earlier solo draft (submission 1306652) is hidden; Devpost does not allow deleting it, and it is not entered.
