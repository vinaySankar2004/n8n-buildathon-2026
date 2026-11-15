# Storyboard

Draft of 2026-11-14, evening, rewritten for newsReels (D13 to D17). Edit it in place. Total 2:50. Approve it with a line starting "Approved" before recording.

## Hero story, from real data

From Collect on 2026-11-14, using whole Vancouver days (7 to 13 November): street surface flooding reports were 218 against an average of 29.3 a week over the previous 8 weeks, 7.4 times normal, after 45 and 93 in the two weeks before. Mount Pleasant had the most (33), then Downtown (24). Context: Environment Canada's coastal flooding statement for the Metro Vancouver coastline. Rerun before recording; the numbers will move.

## Beats

| ID | Time | On screen | Narration | Earns |
| --- | --- | --- | --- | --- |
| B1 | 0:00 to 0:12 | The open data portal, 1.3 million 3-1-1 rows scrolling | Vancouver logs every flooded street, pothole and missed green bin: 1.3 million requests, updated every day. A small newsroom has nobody to read them. | Impact |
| B2 | 0:12 to 0:22 | Title card: newsReels | newsReels turns a newsroom's own data and news feeds into short videos their editor approves in Slack. | Demo |
| B3 | 0:22 to 0:40 | n8n canvas, the run starts, Collect and Score light up, the ranking output | It checks the client's datasets and compares this week with the eight before. Flooding reports are up more than seven times, worst in Mount Pleasant. | Technical |
| B4 | 0:40 to 0:55 | Context and Write: the news report and the script, each number marked | It adds Environment Canada's flooding statement as context, and Claude writes a script in the client's style. A check confirms every number. | Technical, Innovation |
| B5 | 0:55 to 1:15 | Slack on a phone: the review card with the script and data; the editor replies "make the headline calmer"; the new draft arrives | The editor sees the script and the numbers first, and changes it by replying in plain words. No voice or video is paid for yet. | Design |
| B6 | 1:15 to 1:40 | Approve script; the video arrives in the thread and plays full screen | Approve the script, and the voice and video are made. | Design, Demo |
| B7 | 1:40 to 1:55 | Approve and publish; the post in the outlet channel with its "How this story was made" link | One more approval, and it is published with a page that shows how it was made. | Demo |
| B8 | 1:55 to 2:15 | The run trace: follow 218 back to the 3-1-1 data; the news report; what Claude was asked; the cost | AI you can see into: every number traces back to its source, and every run shows what it cost. | Innovation, Trust |
| B9 | 2:15 to 2:35 | A teammate writes "@NewsReels make a video about graffiti in Mount Pleasant"; the draft arrives in the thread; the run ledger with every run and its cost | Anyone in the newsroom can ask for a story or a number, and every run lands in a ledger. | Impact, Technical |
| B10 | 2:35 to 2:50 | The ten workflows, then the client config file, then newsReels | Ten n8n workflows. A new client is one config file. | Technical |

## Open for the team

- Who narrates the submission video.
- The bot's Slack name: it is "Newsroom" today; renaming it "newsReels" would make one consistent name on camera.
