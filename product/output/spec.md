# Spec

Agreed Saturday 14 November, evening, from the team's discussion and [Vinayak's proposal](../proposals/vinayak.md), and kept current since. Decisions D13 to D24 hold the detail; this page says what is built and what is left.

## Product

NewsReels turns a newsroom's or creator's own sources, open data and news feeds, into short narrated news videos that their editor reviews in Slack (D13). Each client is one config file: name and look, Slack channels, data sources, time series, news feeds and a style card (D15). The demo client is Rain City Ledger, a made-up Vancouver outlet. Team: Vinayak and Arman (D22).

## Built and working live

Each row is in [must-work.md](../../02_storyboard/output/must-work.md) with its test.

| Feature | Decision | Must-work |
| --- | --- | --- |
| Collect, Score, Write with the number check, Voice, Render, Publish | D12 | 1 to 10 |
| Client config, with its name and colour on the video | D15 | 11 |
| News context from BC Government News, Environment Canada alerts and DriveBC | D15 | 12 |
| Review in one Slack thread: script first, then video | D14 | 6, 7 |
| Run trace and public "How this story was made" page | D16 | 13 |
| Slack requests: "@NewsReels make a video about ..." or a question | D17 | 14 |
| Run ledger: who, what, status, Claude and ElevenLabs cost | D17 | 15 |
| Web search for requested stories, every source shown to the editor | D20 | 17 |
| Vancouver unemployment rate from Statistics Canada, for requests | D21 | 18 |
| Edits that change anything but the numbers; about 30 second videos in three scenes; bar, line or pie charts | D18, D21 | 16, 19 |
| Reddit reactions to each story, opinion only: built, but off, since Reddit's API needs Reddit's approval and Reddit blocks Anthropic's web search (F16) | D23 | 20 |

## Before the freeze, Sunday 13:00

1. **Done 12:20:** account settings. The ElevenLabs key reads the plan, so the ledger prices narration (about $0.000191 a credit), and Slack names who asked.
2. **Done 12:12:** the guard test live ("Blocked: 38 in script") and three clean runs in a row, logged in `test-log.md` (F17).
3. **Done:** #editor-demo and an empty run ledger (D24). Left: the storyboard's "Approved" line, the demo video, and Submit on Devpost by 14:45.

## After the event

- More cities and clients; a second client file to show it scales.
- Narration in more languages, and a social post or weekly digest alongside the video.
- A schedule per client, and the trace and ledger hosted somewhere other than the laptop.

## Open

- Who narrates the submission video.
