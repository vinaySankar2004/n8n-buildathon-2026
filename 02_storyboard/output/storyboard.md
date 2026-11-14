# Storyboard

Draft of 2026-11-14, early afternoon. Edit it in place. Total 2:50. Product and outlet names are open; `[Name]` marks where they go.

## Hero story, from real data

From Collect on 2026-11-14, using whole Vancouver days (7 to 13 November): street surface flooding reports were 218 against an average of 29.3 a week over the previous 8 weeks, 7.4 times normal, after 45 and 93 in the two weeks before. Mount Pleasant had the most (33), then Downtown (24) and Grandview-Woodland (20). Runner-up: fireworks requests, 4.1 times normal. Rerun before recording; the numbers will move.

## Beats

| ID | Time | On screen | Narration | Earns |
| --- | --- | --- | --- | --- |
| B1 | 0:00 to 0:12 | The open data portal, 1.3 million 3-1-1 rows scrolling | Vancouver logs every flooded street, pothole and missed green bin. That is 1.3 million requests, updated every day. An editor has ten minutes, not ten hours. | Impact |
| B2 | 0:12 to 0:25 | Title card with `[Name]` | `[Name]` finds the week's real story in city data and turns it into a video your editor approves in one click. | Demo |
| B3 | 0:25 to 0:45 | n8n canvas, the run starts, the data nodes light up | Every morning it pulls the city's latest 3-1-1 data. | Technical |
| B4 | 0:45 to 1:10 | The ranking output: flooding 218 against 29.3, 7.4 times, and the rising weekly line | It compares this week with the eight before. Flooding reports are up more than seven times. Mount Pleasant is hit hardest. That is the story. | Technical, Innovation |
| B5 | 1:10 to 1:35 | The agent's script with each number cited, then the render finishing | It writes a 20 second script, citing every number, and renders the chart. | Technical |
| B6 | 1:35 to 1:55 | The generated video, full screen, with its own voice | (the video plays) | Design, Demo |
| B7 | 1:55 to 2:15 | Slack on a phone: the video with Approve and Reject; tap Approve; it publishes, and a newsletter blurb appears | The editor approves from their phone. One tap, and it is out. | Design, Demo |
| B8 | 2:15 to 2:35 | The whole n8n canvas, five labelled workflows, the sources | Five n8n workflows: collect, score, write, render, publish. Public data only, reported by neighbourhood, every number traceable. | Technical |
| B9 | 2:35 to 2:50 | Other cities' open data portals, then `[Name]` | Every city publishes this data. `[Name]` works on any open data portal. | Impact |

## Open for the team

- Product and outlet names. Both made up; no real newsroom's name or look.
- Video shape: vertical 9:16 for social is the default.
- Where approval publishes: a Slack outlet channel (D12).
- Who narrates the submission video.
