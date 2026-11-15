# Pitch and answers

For the judges' table and the Devpost page. Short enough to say out loud. The questions follow the event page: the problem, the safeguards and the next step.

## One line

NewsReels turns a newsroom's or creator's own sources into short narrated news videos, and their editor approves each one in Slack.

## Twenty seconds

Cities publish data every day, and small newsrooms have nobody to read it. NewsReels checks a client's open data and news feeds, finds the week's real change, and drafts a 30 second video in their style. Today that is street flooding reports at 7.4 times their usual level, worst in Mount Pleasant, with Environment Canada's flooding statement as context. The editor reviews the script in Slack, asks for changes in plain words, approves the video, and every number links back to its source.

## What problem does it solve, and for whom?

Local news is disappearing: 613 local news outlets have closed in 391 Canadian communities since 2008, about half of them in places under 20,000 people ([Local News Research Project, via The Canadian Press, August 2026](https://www.ctvnews.ca/canada/article/ottawa-commissions-project-to-track-news-deserts-in-canada/)). The outlets that remain, and the solo creators filling the gap on social video, have the public data but no data desk and no video team. Vancouver's 3-1-1 data alone holds 1.33 million requests, refreshed daily.

NewsReels is for hyperlocal newsrooms, neighbourhood newsletters and solo news creators. It does the finding and drafting; the editor keeps the judgement.

## What does it cost?

A finished short video from a freelance editor typically costs $20 to $500, at $20 to $75 an hour (industry rate guides, 2026). A NewsReels story costs about one cent of Claude plus a few hundred ElevenLabs credits, and the ledger shows the exact cost of every run. The fixed cost is a small server for n8n and the render service.

## Who uses it?

The client's editor, in a Slack thread: the script and the data behind it first, then the video. They can reply in plain words to change either, and anyone in the channel can ask "@NewsReels how many noise complaints this week?" or ask for a video on any topic in the data.

## What does it do?

1. Collect: nine weeks of the client's datasets.
2. Score: this week against the eight before; the biggest real change wins.
3. Context: recent reports from the client's news feeds, and for a requested story, a web search for recent reporting, with every source shown to the editor.
4. Write: Claude drafts a headline, script, chart and blurb in the client's style; a check confirms every number.
5. Review: the script and data go to the editor in Slack; replies edit the draft, and after the video is made they can change the chart (bar, line or pie, a colour, which item stands out), which remakes the video in about 20 seconds.
6. Voice and render: only after the script is approved.
7. Publish: only after the video is approved, with a public "How this story was made" page.

## Safeguards

- Nothing publishes without two approvals, and no voice or video is paid for before the script is approved.
- The AI only drafts. It may use no number that is not in the data or a report it names, and the check blocks any draft that does, including the editor's edits.
- A change counts as a story only above a bar: at least 20 and twice the usual weekly level.
- Public sources only, reported by neighbourhood. No addresses and no people.
- Every run has a trace that follows each number to its source, and a ledger row with its cost.
- Failures are visible: the editor gets "No story today" and the reason.

## What it does not do

It does not say why a number changed. It reports what the data shows, and the editor decides whether there is more to the story.

## How it runs for a client

Hosted by us for small clients, or self-hosted for privacy: the same n8n workflows and render service run on the client's own server (a small VPS is enough), so their data, drafts and editor messages never leave it. Either way, every run has a trace and a ledger row.

## Why n8n?

n8n runs every step as its own workflow: ten in all, joined by Execute Workflow, a Slack webhook for the review thread, an n8n data table for each thread's state, and code nodes for scoring and the number check. A failure shows up at the step that broke. A second client is one config file.

## Next step

Run it for one neighbourhood newsletter for a month and count how many drafts the editor approves. Then add more datasets, more languages for the voice, and other cities.

## Track fit

Human-in-the-loop: the editor approves every script and every video, can change either by replying, and can see exactly what the system did, what it cost and who decided.
