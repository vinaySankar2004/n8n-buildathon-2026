# Demo runbook

For the judges' tables and for recording the video. Everything runs on the host laptop (Vinayak's Mac). The demo happens in #editor-demo, whose run ledger stays clean; try things out in #editor, which has its own test ledger (D25).

## Before anyone watches

1. NewsReels is a member of every channel it works in (#editor-demo, #editor, #outlet): in a channel it is not in, it can post text but cannot upload the video or hear replies (F19). If in doubt, write `/invite @NewsReels` in the channel.
2. Laptop plugged in, lid open, on the event Wi-Fi. `npm run host -- status` shows every line up. If not, `npm run host`.
3. Open, each in its own tab:
   - Slack #editor-demo and the outlet channel.
   - n8n at http://localhost:5678, on 0 Orchestrator, with its Executions tab ready.
   - The run ledger (its link is at the bottom of any trace page). Click "Visit Site" on ngrok's notice once, so it never shows on camera.
   - The pipeline README on GitHub, for the workflow pictures.
4. Five minutes before: `npm run invoke -- orchestrator`, so a fresh review card is waiting in #editor-demo. A practice run goes to #editor instead: `npm run invoke -- orchestrator '{"desk":"test"}'`.

## Two minutes at a table

1. The problem: 613 local outlets closed in Canada since 2008; the rest have data but no data desk.
2. The review card in #editor-demo: the script, the numbers behind it, the trace link. Reply "make the headline calmer".
3. Approve script: the video arrives in the thread. Reply "make it a line chart"; about 20 seconds later the new video arrives.
4. Open the trace: follow the week's number back to the 3-1-1 data; show the news report, what Claude was asked and the cost.
5. Write "@NewsReels how many noise complaints in Kitsilano this week?": the answer arrives in the thread.
6. The run ledger: every run, who asked, what it cost. Then n8n: the workflows and their runs.

## Recording the video

The words are in [script.md](script.md). Arman records B1 and B4 to B10 and the voice, step by step in [arman.md](arman.md). Vinayak records B3 on the host Mac. B2 is the logo title card. The agent on the host Mac cuts the video. Target times for Sunday:

| By | Step | Who |
| --- | --- | --- |
| 13:00 | A review card waits in #editor-demo (posted again 13:35) | Agent |
| 13:35 | Screen takes B1, B4 to B10 ([arman.md](arman.md)) | Arman |
| 13:35 | Screen take B3, below | Vinayak |
| 13:45 | The voice | Arman |
| 13:50 | All files in `04_demo/raw/` | Vinayak |
| 14:05 | First cut | Agent |
| 14:15 | Fixes from one watch-through | Agent |
| 14:25 | Uploaded to YouTube, unlisted; the link goes to the agent for Devpost | Vinayak |
| 14:45 | Terms ticked and Submit pressed on Devpost | Vinayak |

**Vinayak: B3, n8n (about 24 seconds).** Same recording rules as Arman's (whole screen, silent, hold 2 seconds at each end). Close any n8n credentials or settings page first.

1. Open the demo run in 0 Orchestrator: http://localhost:5678/workflow/kjZJ4EboduvsCPUg/executions/406. Every step is green; hold 3 seconds, then move the pointer slowly along Collect, Score, Context, Write and Chat.
2. Open its 2 Score run: http://localhost:5678/workflow/4Yz4ps6sUDrcbUae/executions/410. Click the last node so its output shows: Fireworks, 37 this week against 5.5, 6.7 times, Grandview-Woodland 19. Hold 4 seconds.
3. Save it as `B03.mov` in `04_demo/raw/`.

If Arman needs a fresh card (after B6 cannot be redone), run `npm run invoke -- orchestrator`; B3's links then change to the newest runs.

**Hand-off.** Arman's files go to Vinayak's Mac and into `04_demo/raw/`, which git ignores, so nothing large is pushed. Then tell the agent.

**The edit.** `python3 tools/edit_demo.py --look` shows each take's length and a contact sheet, and finds the ten spoken parts of the voice; `python3 tools/edit_demo.py` builds the video. The agent cuts each clip to its beat (parts to keep go in `04_demo/raw/cuts.json`), lays the voice over it, adds the logo title and end cards and captions (judges may watch muted), and levels the sound. Out comes `04_demo/raw/newsreels-demo.mp4`, under 3:00. Watch it once and send the fixes as times ("1:12 cut the wait"); each round takes a few minutes.

## If something fails

- Nothing answers in Slack: check `npm run host -- status`, then the router log in `03_build/output/host/logs/`.
- A step stops: the editor gets "No story today" and the reason; that is part of the demo.
- No network: show the samples in `05_submit/output/samples/` and the recorded video.
