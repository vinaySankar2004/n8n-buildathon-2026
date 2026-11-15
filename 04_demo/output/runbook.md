# Demo runbook

For the judges' tables and for recording the video. Everything runs on the host laptop (Vinayak's Mac). The demo happens in #editor-demo, whose run ledger stays clean; try things out in #editor, which has its own test ledger (D25).

## Before anyone watches

1. Laptop plugged in, lid open, on the event Wi-Fi. `npm run host -- status` shows every line up. If not, `npm run host`.
2. Open, each in its own tab:
   - Slack #editor-demo and the outlet channel.
   - n8n at http://localhost:5678, on 0 Orchestrator, with its Executions tab ready.
   - The run ledger (its link is at the bottom of any trace page). Click "Visit Site" on ngrok's notice once, so it never shows on camera.
   - The pipeline README on GitHub, for the workflow pictures.
3. Five minutes before: `npm run invoke -- orchestrator`, so a fresh review card is waiting in #editor-demo. A practice run goes to #editor instead: `npm run invoke -- orchestrator '{"desk":"test"}'`.

## Two minutes at a table

1. The problem: 613 local outlets closed in Canada since 2008; the rest have data but no data desk.
2. The review card in #editor-demo: the script, the numbers behind it, the trace link. Reply "make the headline calmer".
3. Approve script: the video arrives in the thread. Reply "make it a line chart"; about 20 seconds later the new video arrives.
4. Open the trace: follow the week's number back to the 3-1-1 data; show the news report, what Claude was asked and the cost.
5. Write "@NewsReels how many noise complaints in Kitsilano this week?": the answer arrives in the thread.
6. The run ledger: every run, who asked, what it cost. Then n8n: the workflows and their runs.

## Recording the video

The words and shots are in [script.md](script.md). Arman records; the agent on the host laptop edits. Target times for Sunday:

| By | Step | Who |
| --- | --- | --- |
| 13:00 | A fresh review card waits in #editor-demo; the tabs above are open | Vinayak, with the agent |
| 13:35 | Screen takes, one per beat | Arman |
| 13:45 | The voice take | Arman |
| 14:05 | First cut | Agent |
| 14:15 | Fixes from one watch-through | Agent |
| 14:25 | Uploaded to YouTube, unlisted; the link goes to the agent for Devpost | Vinayak |
| 14:45 | Terms ticked and Submit pressed on Devpost | Vinayak or Arman |

**Screen takes.** Do Not Disturb on. Slack zoomed to 125% so text reads on a phone, with every channel but #editor-demo and the outlet channel collapsed, so no names or messages from elsewhere show. Record each beat as its own clip with Cmd+Shift+5 (whole screen, 1080p or larger), named `B01.mov` to `B10.mov`. Stay silent; waits are fine, since the edit cuts them. Hold still for two seconds at the start and end of each clip.

**Voice take.** In a quiet room, phone about 15 cm from the mouth, Voice Memos. Read the read-through in [script.md](script.md) once, two seconds of silence between beats. If you stumble, pause and say the sentence again; the edit keeps the last try.

**Hand-off.** AirDrop the clips and the voice memo to Vinayak's Mac and move them into `04_demo/raw/` in this repository. Git ignores that folder, so nothing large is pushed.

**The edit.** `python3 tools/edit_demo.py --look` shows each take's length and a contact sheet, and finds the ten spoken parts of the voice; `python3 tools/edit_demo.py` builds the video. The agent cuts each clip to its beat (parts to keep go in `04_demo/raw/cuts.json`), lays the voice over it, adds the logo title and end cards and captions (judges may watch muted), and levels the sound. Out comes `04_demo/raw/newsreels-demo.mp4`, under 3:00. Watch it once and send the fixes as times ("1:12 cut the wait"); each round of fixes takes a few minutes.

## If something fails

- Nothing answers in Slack: check `npm run host -- status`, then the router log in `03_build/output/host/logs/`.
- A step stops: the editor gets "No story today" and the reason; that is part of the demo.
- No network: show the samples in `05_submit/output/samples/` and the recorded video.
