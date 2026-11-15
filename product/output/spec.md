# Spec

Agreed Saturday 14 November, evening, from the team's discussion and [Vinayak's proposal](../proposals/vinayak.md). Decisions D13 to D17 hold the detail; this page says what is built and what is left.

## Product

newsReels turns a newsroom's or creator's own sources, open data and news feeds, into short narrated news videos that their editor reviews in Slack (D13). Each client is one config file: name and look, Slack channels, data sources, news feeds and a style card (D15). The demo client is Rain City Ledger, a made-up Vancouver outlet.

## Built and working live

Each row is in [must-work.md](../../02_storyboard/output/must-work.md) with its test.

| Feature | Decision | Must-work |
| --- | --- | --- |
| Collect, Score, Write with the number guard, Voice, Render, Publish | D12 | 1 to 10 |
| Client config, with its name and colour on the video | D15 | 11 |
| News context from BC Government News, Environment Canada alerts and DriveBC | D15 | 12 |
| Review in one Slack thread: script first, then video; replies edit the draft | D14 | 6, 7 |
| Run trace and public "How this story was made" page | D16 | 13 |
| Slack requests: "@Newsroom make a video about ..." or a question | D17 | 14 |
| Run ledger: who, what, status, Claude and ElevenLabs cost | D17 | 15 |
| Chart edits from the thread: bar, line or pie, a colour, a highlight; the video is remade in about 20 seconds | D18 | 16 |

## Before the freeze, Sunday 11:00

In order. Each has its test and the stage it touches.

1. **Account settings (Arman).** The ElevenLabs key gets User: Read; the Slack app gets `users:read` and is reinstalled. Test: the ledger shows a dollar figure for ElevenLabs and a name in "Who". Stage: 03_build.
2. **Three clean runs in a row**, from the orchestrator through publish, logged with `npm run sync`. Test: three consecutive runs in `test-log.md` without a failure. Stage: 03_build.
3. **Guard test live** (must-work row 9). Test: with `test_tamper` on, the editor gets "Blocked: 219 ...". Stage: 03_build.
4. **Licence and terms checks** for Remotion and the three news feeds, recorded in `services.md`. Test: no open "check" left in `services.md`. Stage: 05_submit.
5. **Storyboard approved and recording planned.** Test: `storyboard.md` has a line starting "Approved". Stage: 02_storyboard, 04_demo.

## After the event

- More cities and clients; a second client file to show it scales.
- Narration in more languages, and a social post or weekly digest alongside the video.
- A schedule per client, and the trace and ledger hosted somewhere other than the laptop.

## Open

- The bot's Slack name: "Newsroom" today, or "newsReels" for one consistent name (a manifest change and a reinstall, which can go with item 1).
- Who narrates the submission video.
