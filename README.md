# NewsReels

NewsReels turns a newsroom's or creator's own sources, open data and news feeds, into short narrated news videos. Their editor reviews each one in a Slack thread before anything is published. Built in n8n by Vinayak and Arman for LOOP, the UBC eProjects x n8n Buildathon, 14 and 15 November 2026.

## The problem

613 local news outlets have closed in 391 Canadian communities since 2008 ([Local News Research Project, via The Canadian Press](https://www.ctvnews.ca/canada/article/ottawa-commissions-project-to-track-news-deserts-in-canada/)). The newsrooms and solo creators that remain have the public data, such as Vancouver's 1.33 million 3-1-1 requests, updated daily, but no data desk and no video team. NewsReels does the finding and drafting for about a cent of Claude per story; the editor keeps the judgement. It runs hosted, or on a client's own server so their data never leaves it.

## A run

1. A run starts by hand, on a daily schedule (off during the event), or when someone writes "@NewsReels make a video about graffiti in Mount Pleasant" in the editor's Slack channel. A question ("@NewsReels show unemployment over the last 5 years") gets its numbers in the thread; a time series such as Vancouver's unemployment rate comes from Statistics Canada.
2. **Collect** pulls nine weeks of the client's datasets. The demo client, Rain City Ledger (made up), uses City of Vancouver 3-1-1 requests, building permits and business licences.
3. **Score** compares this week with the eight before and keeps a rise to at least 20 and twice the usual level, or a fall to half.
4. **Context** reads the client's news feeds (BC Government News, Environment Canada weather alerts, DriveBC road events), searches the web for a story someone asked for, and gathers how people are reacting on Reddit, as opinion only.
5. **Write**: Claude Sonnet 5.5 drafts a headline, a script of about 30 seconds, a chart, a closing line and a newsletter blurb in the client's style. A code check stops the run if any number is not in the data or in a report the script names.
6. The editor gets the script and its data in a Slack thread before any voice or video is made. Replies in plain words can change anything but the numbers ("make the headline calmer", "make it a line chart", "make Mount Pleasant red"); Claude Sonnet 5.5 applies them and the number check runs again.
7. **Approve script**: ElevenLabs reads it and a Remotion service renders a vertical video of about 30 seconds into the thread: a title card with the big number, the chart (bar, line or pie), and a closing line.
8. **Approve and publish**: the video, blurb and a "How this story was made" link go to the client's channel.

If a source fails or nothing passes the bar, the editor gets "No story today" and the reason. Example, 7 to 13 November: 218 street flooding reports, 7.4 times the usual 29.3 a week, most in Mount Pleasant, with Environment Canada's coastal flooding statement as context.

## See inside every run

- **Run trace** for the editor: the sources checked, how the story was ranked, the news offered and used, what Claude was asked and answered, where each number came from, the edits, the approvals and the cost.
- **"How this story was made"**, public: the same story and sources, without prompts, messages or costs.
- **Run ledger**: one row per run, with who started it, its status, and its Claude and ElevenLabs cost.

A story costs about one cent of Claude. Samples are in [05_submit/output/samples/](05_submit/output/samples/).

## The workflows

Every step is its own n8n workflow, built as code and deployed through n8n's API: an orchestrator; Collect, Score, Context, Reddit, Write, Voice, Render and Publish; the Slack review (7 Chat); and questions and video requests (8 Request). What each does, with a picture of every canvas: [pipeline README](03_build/output/pipeline/README.md).

## Safeguards

- Nothing publishes without two approvals from the editor, and no voice or video is paid for before the script is approved.
- No number reaches the script unless it is in the data or a news report the script names. Reddit is opinion only, never a source for numbers.
- Public sources only, reported by neighbourhood, never an address or a person.
- Failures reach the editor; nothing fails silently.
- It reports what changed, not why.

## Built with

n8n 2.47.7 (self-hosted), Claude Sonnet 5.5 and Haiku 5.5, ElevenLabs, Remotion, Slack, Reddit, Statistics Canada and ngrok. Everything used is listed in [services.md](03_build/output/services.md). n8n, the render service and a small router run on one laptop behind a tunnel ([infrastructure](_config/infrastructure.md)).

## A new client

One config file: name and look, Slack channels, data sources, time series, news feeds, subreddits and a style card for the writing. Example: [rain-city-ledger.json](03_build/output/clients/rain-city-ledger.json).

## For the team

Open this repository in Claude Code, Codex or Cursor and say what you want. It checks your setup, asks only for keys or clicks, and builds, deploys and tests the workflows.
