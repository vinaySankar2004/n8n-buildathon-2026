# Arman: recording the demo video

The setup and the links. How you shoot each part is up to you. Your coding agent can read this page.

- **Arman:** the screen takes and the voice.
- **Vinayak:** the n8n part on the host Mac ([runbook.md](runbook.md#recording-the-video)), then the upload and Submit.
- **The agent on Vinayak's Mac:** cuts the video from your files, with the logo title and end cards and captions.

Under 3 minutes in all. Takes by 13:55, voice by 14:05, files sent right after.

## Setup

- **Slack:** zoomed in so it reads on a phone, every channel but #editor-demo and #outlet collapsed, notifications paused. Practise in #editor; only #editor-demo and its ledger are for the video.
- **Browser tabs:** open each ngrok page once and click "Visit Site", so the warning never shows on camera.
  - City of Vancouver 3-1-1 data: https://opendata.vancouver.ca/explore/dataset/3-1-1-service-requests/table/
  - The run trace: https://paratactical-professionally-yasuko.ngrok-free.dev/files/trace-75af1dc7-7f0d-4a45-b660-d23ea4d96fac.html
  - The public "How this story was made" page: https://paratactical-professionally-yasuko.ngrok-free.dev/files/story-75af1dc7-7f0d-4a45-b660-d23ea4d96fac.html
  - The run ledger: https://paratactical-professionally-yasuko.ngrok-free.dev/files/ledger-341e9456e856.html
  - One config file per client: https://github.com/vinaySankar2004/n8n-buildathon-2026/blob/main/03_build/output/clients/rain-city-ledger.json
- **Recorder:** whole screen, no microphone (Cmd+Shift+5 on a Mac). One clip per part, silent; waits are fine, the edit cuts them.

## What the video covers

In order, as the parts B1 to B10 in [script.md](script.md), which also has narration you can use or rewrite:

1. The problem: the city's data, more than a million 3-1-1 requests (B1).
2. The logo title card (B2, made already).
3. n8n running the steps (B3, Vinayak).
4. The review in #editor-demo: the card, an edit in plain words, Approve script, the video, a chart change, Approve and publish, the #outlet post (B4 to B6). Click each button once.
5. The run trace and the public page (B7).
6. Asking NewsReels in #editor-demo: a question (`@NewsReels show unemployment over the last 5 years`) and a video request (`@NewsReels make a video about graffiti in Mount Pleasant`). Pick NewsReels from the @ list so the mention is real (B8).
7. The run ledger (B9) and the config file (B10).

## Send

The clips (named by part, such as `B04.mov`) and one voice recording go to Vinayak's Mac (AirDrop, or a Slack DM or Drive link), into `04_demo/raw/`.

If a run misbehaves in #editor-demo, tell Vinayak: the agent can clear the channel and post a fresh card in a minute.
