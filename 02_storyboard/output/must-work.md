# Must work on camera

Every step the storyboard shows, in order. Each one is the build scope and has a test. Beat IDs refer to [storyboard.md](storyboard.md).

| # | Step | Beat | Test | Owner |
| --- | --- | --- | --- | --- |
| 1 | **Collect.** An n8n workflow pulls 3-1-1 requests for the last 9 weeks, grouped by type and by week, from the Vancouver API | B3 | Output has 9 weeks of counts per type | Arman |
| 2 | **Score.** A code step ranks types by this week against the 8-week average and picks the top story, with its neighbourhood breakdown | B4 | Top story matches a hand check of the API | |
| 3 | **Write.** An agent turns the story into a headline, a script of 35 to 45 words, and a chart spec, using only numbers from step 2 | B5 | Every number in the script appears in the story | |
| 4 | **Voice.** ElevenLabs reads the script | B5, B6 | Audio file returns, under 22 seconds | |
| 5 | **Render.** A render service on the host laptop, next to n8n, turns the chart spec and audio into a 9:16 video | B5, B6 | n8n gets back a playable MP4 link | |
| 6 | **Approve.** Slack sends the editor the video with approve and reject, and waits | B7 | Tapping approve on a phone resumes the run | |
| 7 | **Publish.** Approval posts the video and the newsletter blurb to the outlet channel in Slack (D12) | B7 | The post is visible; the blurb exists | |
| 8 | **Canvas.** Five named workflows with sticky notes, joined by Execute Workflow nodes | B8 | A cold viewer can name each stage | |
| 9 | **Guard.** Before voicing, a check compares every number in the script with the story and stops the run on a mismatch. A story needs at least 20 reports and at least twice the usual weekly level | B5 | A script with one changed number is blocked | |
| 10 | **Quiet.** If the city API fails or no change passes the bar, the editor gets a short "no story today" note in Slack instead of a video | B7 | Pointing Collect at a dead URL produces the note, not an error | |

## Contracts between workflows

The JSON passed between workflows lives in [_config/contracts.md](../../_config/contracts.md). Agree a change there before building on it.
