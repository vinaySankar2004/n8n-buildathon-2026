# Must work on camera

Every step the storyboard shows, in order. Each one is the build scope and has a test. Beat IDs refer to [storyboard.md](storyboard.md).

| # | Step | Beat | Test | Owner |
| --- | --- | --- | --- | --- |
| 1 | **Collect.** An n8n workflow pulls 3-1-1 requests for the last 9 weeks, grouped by type and by week, from the Vancouver API | B3 | Output has 9 weeks of counts per type | |
| 2 | **Score.** A code step ranks types by this week against the 8-week average and picks the top story, with its neighbourhood breakdown | B4 | Top story matches a hand check of the API | |
| 3 | **Write.** An agent turns the story into a headline, a script of about 50 words, and a chart spec, using only numbers from step 2 | B5 | Every number in the script appears in the story | |
| 4 | **Voice.** ElevenLabs reads the script | B5, B6 | Audio file returns, under 22 seconds | |
| 5 | **Render.** A render service on one laptop, reached through ngrok, turns the chart spec and audio into a 9:16 video | B5, B6 | n8n Cloud gets back a playable MP4 link | |
| 6 | **Approve.** Slack sends the editor the video with approve and reject, and waits | B7 | Tapping approve on a phone resumes the run | |
| 7 | **Publish.** Approval posts the video to the outlet page and drafts a newsletter blurb | B7 | The post is visible; the blurb exists | |
| 8 | **Canvas.** Five named workflows with sticky notes, joined by Execute Workflow nodes | B8 | A cold viewer can name each stage | |

## Contracts between workflows

The JSON passed between workflows lives in [_config/contracts.md](../../_config/contracts.md). Agree a change there before building on it.
