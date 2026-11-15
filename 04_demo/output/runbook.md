# Demo runbook

For the judges' tables and for recording the video. Everything runs on the host laptop (Vinayak's Mac).

## Before anyone watches

1. Laptop plugged in, lid open, on the event Wi-Fi. `npm run host -- status` shows every line up. If not, `npm run host`.
2. Open, each in its own tab:
   - Slack #editor and #outlet.
   - n8n at http://localhost:5678, on 0 Orchestrator, with its Executions tab ready.
   - The run ledger (its link is at the bottom of any trace page). Click "Visit Site" on ngrok's notice once, so it never shows on camera.
   - The pipeline README on GitHub, for the workflow pictures.
3. Five minutes before: `npm run invoke -- orchestrator`, so a fresh review card is waiting in #editor.

## Two minutes at a table

1. The problem: 613 local outlets closed in Canada since 2008; the rest have data but no data desk.
2. The review card in #editor: the script, the numbers behind it, the trace link. Reply "make the headline calmer".
3. Approve script: the video arrives in the thread. Reply "make it a line chart"; about 20 seconds later the new video arrives.
4. Open the trace: follow 218 back to the 3-1-1 data; show the news report, what Claude was asked and the cost.
5. Write "@NewsReels how many noise complaints in Kitsilano this week?": the answer arrives in the thread.
6. The run ledger: every run, who asked, what it cost. Then n8n: the ten workflows and their runs.

## If something fails

- Nothing answers in Slack: check `npm run host -- status`, then the router log in `03_build/output/host/logs/`.
- A step stops: the editor gets "No story today" and the reason; that is part of the demo.
- No network: show the samples in `05_submit/output/samples/` and the recorded video.
