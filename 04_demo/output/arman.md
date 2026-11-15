# Arman: recording the demo video

Everything you record, step by step. The words you say are in [script.md](script.md); this page is what to put on screen and when. Your coding agent can read this page: ask it "what is my next recording step?" or "what do I click for B5?".

Who does what:

- **Arman:** screen takes B1 and B4 to B10, then the voice. This page.
- **Vinayak:** B3 (n8n) on the host Mac, then the upload and Submit. [runbook.md](runbook.md#recording-the-video).
- **B2** is the logo title card. Nobody records it.
- **The agent on Vinayak's Mac** cuts the video from your files.

Targets: takes done by 13:35, voice by 13:45, files sent by 13:50.

## 1. Set up (5 minutes)

1. **Do not touch #editor-demo yet.** Its review card ("For review: Fireworks complaints jump in Vancouver this week") is the demo. To practise anything, use #editor; nothing there reaches the demo or its ledger.
2. **Slack** (the desktop app):
   - Zoom in twice (Cmd and =, or Ctrl and = on Windows) so text reads on a phone.
   - Collapse every sidebar section and close DMs, so only #editor-demo and #outlet show. No other names or messages on screen.
   - Pause notifications: your profile picture, then "Pause notifications", for 1 hour.
3. **Browser**, one window, bookmarks bar hidden (Cmd+Shift+B), these four tabs in order:
   - B1: https://opendata.vancouver.ca/explore/dataset/3-1-1-service-requests/table/
   - B7: https://paratactical-professionally-yasuko.ngrok-free.dev/files/trace-67685038-960b-4236-9914-f89be9536c5a.html (the same page as "Open the run trace" on the review card)
   - B9: https://paratactical-professionally-yasuko.ngrok-free.dev/files/ledger-341e9456e856.html
   - B10: https://github.com/vinaySankar2004/n8n-buildathon-2026/blob/main/03_build/output/clients/rain-city-ledger.json

   The first time each ngrok page opens it shows a warning; click "Visit Site" once now, so it never shows on camera.
4. **Recorder.** Mac: Cmd+Shift+5, "Record Entire Screen", Options: microphone None, save to Desktop. Windows: Win+Shift+R (Snipping Tool), whole screen. One recording per beat.

For every take: start recording, hold still 2 seconds, do the steps, hold still 2 seconds, stop. Rename the file to its beat (`B01.mov`, `B04.mov`, and so on). Waiting on camera is fine; the edit cuts it. Do not talk while recording.

## 2. The takes, in this order

**B1, the city's data (about 15 seconds).** Browser, tab 1. Wait until the table rows load. Scroll down slowly for about 8 seconds, then back to the top so the record count shows (about 1.1 million).

**B4, the review card and an edit (about 30 seconds).** Slack, #editor-demo.
1. Scroll so the review card fills the screen: headline, script, the numbers. Hold 3 seconds.
2. Open its thread ("Reply" under the card). Type `make the headline calmer` and send.
3. Wait for the new draft in the thread (10 to 20 seconds). Hold 3 seconds on it.

**B5, approve and the video (1 to 2 minutes of waiting is fine).** Same thread.
1. Click **Approve script** on the newest draft.
2. Wait for the video in the thread (30 to 60 seconds). Click play and let it run 6 seconds.
3. Type `make it a line chart` and send. Wait about 20 seconds for the new video. Play it 3 seconds.

**B6, publish (about 30 seconds).** Same thread.
1. Click **Approve and publish** under the newest video. Wait for "Published to #outlet" in the thread.
2. Click #outlet in the sidebar: the video, its headline and blurb, and the "How this story was made" link. Hold 3 seconds.
3. Click "How this story was made". Scroll the page slowly for 5 seconds.

**B7, the run trace (about 25 seconds).** Browser, tab 2, reload it (Cmd+R) so it shows the approvals. Scroll slowly, pausing about 3 seconds on each of these headings:
1. "The story"
2. "Where every number comes from": the 37 traced back to the 3-1-1 data
3. "News context"
4. "What Claude was asked"
5. "Voice, video and cost"

**B8, asking NewsReels (1 to 2 minutes of waiting is fine).** Slack, #editor-demo, a new message (not in a thread). Type `@NewsReels`, pick NewsReels from the list that pops up, so it turns into a real mention.
1. Send `@NewsReels show unemployment over the last 5 years`. The answer arrives in its thread in about 15 seconds. Open the thread, hold 3 seconds.
2. Send `@NewsReels make a video about graffiti in Mount Pleasant`. It says "Looking through the data now." The review card arrives in its thread in 30 to 90 seconds. Open the thread, scroll to the web sources it found, hold 3 seconds. Do not approve it.

**B9, the run ledger (about 12 seconds).** Browser, tab 3, reload (Cmd+R). Every run so far, with who asked, its status and its cost. Move the pointer slowly along the Claude and ElevenLabs columns.

**B10, one config file (about 10 seconds).** Browser, tab 4. Scroll slowly from the top through name, look, slack, data_sources, news_feeds and style.

## 3. The voice

1. A quiet room. Phone Voice Memos (or any recorder), phone about 15 cm from your mouth.
2. Read the "Read-through" section of [script.md](script.md) once, all ten paragraphs, with two seconds of silence between paragraphs. B2 and B3 are in it too; read them.
3. If you stumble, pause two seconds and say the whole sentence again. The edit keeps the last try.

## 4. Send the files

AirDrop to Vinayak's Mac (from Windows: a Slack DM to Vinayak, or a Google Drive link). That is nine takes (`B01`, `B04` to `B10`) and the voice. Vinayak puts them in `04_demo/raw/` and tells the agent, which sends back the first cut to watch.

## If something goes wrong

- **A take looks bad:** record that beat again; only the last file with its name counts.
- **B4 to B6 share one thread.** If something breaks before you click Approve and publish, keep going in the same thread. After publishing it cannot be redone on that card: ask Vinayak to run `npm run invoke -- orchestrator` for a fresh card, then redo B4 to B6.
- **The bot does not answer in 2 minutes:** tell Vinayak; the host Mac may need `npm run host`.
- **Personal things on screen** (a DM, a notification, an email): record that take again.
