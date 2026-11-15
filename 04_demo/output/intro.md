# Intro for the demo video

Vinayak's 60 second opening, spoken over the n8n canvas, before Arman's walkthrough of the Slack review (1:42). It covers what Arman's part does not show: the problem, what NewsReels is, the number check, the trace and ledger, requests in Slack, and hosting. About 150 words.

## Record it

1. Open 0 Orchestrator in n8n (http://localhost:5678/workflow/kjZJ4EboduvsCPUg), canvas zoomed to fit. Close any credentials or settings page.
2. Cmd+Shift+5, "Record Entire Screen", Options: microphone MacBook (or AirPods). Read the text below at an easy pace; a pause between paragraphs is fine. Moving the pointer slowly along the steps while you talk is enough.
3. Save it as `04_demo/raw/intro.mov`. The agent puts it after the title card and before Arman's part, levels both voices and adds the end card.

## Say

Since 2008, more than 600 local news outlets have closed in Canada. The newsrooms and creators who are left have more public data than ever. Vancouver's 3-1-1 line alone has over a million requests, updated every day. What they don't have is a data desk or a video team.

NewsReels is that desk. It reads a newsroom's own open data and news feeds, finds what really changed this week, and drafts a 30 second narrated video in their style. The editor reviews it in Slack, changes it in plain words, and nothing goes out without their approval.

Every step is an n8n workflow. Claude writes the words, but code checks every number against the data and blocks any it can't trace. Anyone in the newsroom can ask for a story or a number in Slack. Every run has a trace and a cost ledger, about a cent of Claude per story, and it runs hosted or on the newsroom's own server.

Here's Arman, reviewing this week's story.
