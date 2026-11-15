# newsReels

newsReels turns a newsroom's or creator's own sources, open data and news feeds, into short narrated news videos. Their editor reviews each one in a Slack thread before anything is published. Built in n8n for LOOP, the UBC eProjects x n8n Buildathon, 14 and 15 November 2026.

## The problem

613 local news outlets have closed in 391 Canadian communities since 2008 ([Local News Research Project, via The Canadian Press](https://www.ctvnews.ca/canada/article/ottawa-commissions-project-to-track-news-deserts-in-canada/)). The newsrooms and solo creators that remain have the public data, such as Vancouver's 1.33 million 3-1-1 requests, updated daily, but no data desk and no video team. newsReels does the finding and drafting for about a cent of Claude per story; the editor keeps the judgement. It runs hosted, or on a client's own server so their data never leaves it.

## A run

1. A run starts by hand, on a daily schedule (off during the event), or when someone writes "@Newsroom make a video about graffiti in Mount Pleasant" in the editor's Slack channel.
2. **Collect** pulls nine weeks of the client's datasets. The demo client, Rain City Ledger (made up), uses City of Vancouver 3-1-1 requests, building permits and business licences.
3. **Score** compares this week with the eight before and keeps a rise to at least 20 and twice the usual level, or a fall to half.
4. **Context** reads the client's news feeds: BC Government News, Environment Canada weather alerts and DriveBC road events.
5. **Write**: Claude Sonnet 5.5 drafts a headline, a 35 to 45 word script, a chart and a newsletter blurb in the client's style. A code check stops the run if any number is not in the data or in a report the script names.
6. The editor gets the script and its data in a Slack thread before any voice or video is made. Replies in plain words ("make the headline calmer") are applied by Claude Haiku 5.5 and checked again.
7. **Approve script**: ElevenLabs reads it and a Remotion service renders a 20 second vertical video into the thread.
8. **Approve and publish**: the video, blurb and a "How this story was made" link go to the client's channel.

If a source fails or nothing passes the bar, the editor gets "No story today" and the reason. Example, 7 to 13 November: 218 street flooding reports, 7.4 times the usual 29.3 a week, most in Mount Pleasant, with Environment Canada's coastal flooding statement as context.

## See inside every run

- **Run trace** for the editor: the sources checked, how the story was ranked, the news offered and used, what Claude was asked and answered, where each number came from, the edits, the approvals and the cost.
- **"How this story was made"**, public: the same story and sources, without prompts, messages or costs.
- **Run ledger**: one row per run, with who started it, its status, and its Claude and ElevenLabs cost.

A story costs about one cent of Claude. Samples are in [05_submit/output/samples/](05_submit/output/samples/).

## The workflows

Ten n8n workflows, built as code and deployed through n8n's API: 0 Orchestrator, 1 Collect, 2 Score, 2b Context, 3 Write, 4 Voice, 5 Render, 6 Publish, 7 Chat (the Slack review) and 8 Request (questions and video requests). What each does, with a picture of every canvas: [pipeline README](03_build/output/pipeline/README.md).

## Safeguards

- Nothing publishes without two approvals from the editor, and no voice or video is paid for before the script is approved.
- No number reaches the script unless it is in the data or a news report the script names.
- Public sources only, reported by neighbourhood, never an address or a person.
- Failures reach the editor; nothing fails silently.
- It reports what changed, not why.

## Built with

n8n 2.47.7 (self-hosted), Claude Sonnet 5.5 and Haiku 5.5, ElevenLabs, Remotion, Slack and ngrok. Everything used is listed in [services.md](03_build/output/services.md). n8n, the render service and a small router run on one laptop behind a tunnel ([infrastructure](_config/infrastructure.md)).

## A new client

One config file: name and look, Slack channels, data sources, news feeds and a style card for the writing. Example: [rain-city-ledger.json](03_build/output/clients/rain-city-ledger.json).

## For the team

Open this repository in Claude Code, Codex or Cursor and say what you want. It checks your setup, asks only for keys or clicks, and builds, deploys and tests the workflows.
