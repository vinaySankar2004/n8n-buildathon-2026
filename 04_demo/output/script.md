# Demo script

The submission video: 2:45, narrated by Arman, recorded in #editor-demo. About 360 words, so there is room to breathe. If the review card shows different numbers on the day, say the card's numbers.

How to record it and hand it over: [runbook.md](runbook.md#recording-the-video).

## Beats

| Beat | Time | On screen | Say |
| --- | --- | --- | --- |
| B1 | 0:00 to 0:13 | City of Vancouver open data: the 3-1-1 dataset page, scrolling | Since 2008, 613 local news outlets have closed in Canada. The newsrooms that are left have more public data than ever: Vancouver alone has 1.3 million 3-1-1 requests, updated every day. Nobody has time to read them. |
| B2 | 0:13 to 0:22 | Title card: the NewsReels logo | This is NewsReels. It turns a newsroom's own data and news feeds into short news videos, and their editor approves every one in Slack. |
| B3 | 0:22 to 0:46 | n8n: 0 Orchestrator, its latest run with every step green, then 2 Score's output | Each step is its own n8n workflow. Collect pulls nine weeks of the city's data. Score compares this week with the eight before and keeps only real changes. This week, fireworks complaints hit 37, almost seven times the usual, most in Grandview-Woodland. Context adds the client's news feeds, Claude writes the script in the outlet's style, and code checks every number against the data. |
| B4 | 0:46 to 1:04 | #editor-demo: the review card. Reply in the thread "make the headline calmer"; the new draft arrives | The editor sees the script and the data behind it in a Slack thread, before any voice or video is paid for. They edit in plain words. Claude rewrites it, and the number check runs again. |
| B5 | 1:04 to 1:26 | Tap "Approve script"; the video arrives and plays for 5 seconds. Reply "make it a line chart"; the new video arrives | Approve the script, and ElevenLabs narrates it while Remotion renders a 30 second vertical video, right in the thread. Want a different chart? Just ask. About twenty seconds later, there is a new video. |
| B6 | 1:26 to 1:38 | Tap "Approve and publish"; the outlet channel with the post; open "How this story was made" | A second approval publishes it to the outlet's channel, with a public page that shows how the story was made. |
| B7 | 1:38 to 1:58 | The run trace (link on the review card): where each number came from, the news used, what Claude was asked, the cost | Every run has a trace. Each number links back to the city's data. You can see the news it used, exactly what Claude was asked and answered, and what it cost: about one cent of Claude per story. |
| B8 | 1:58 to 2:20 | In #editor-demo: "@NewsReels show unemployment over the last 5 years", the answer; then "@NewsReels make a video about graffiti in Mount Pleasant", the new review card with its web sources | Anyone in the newsroom can ask, too. A question gets numbers in seconds, from the data, not the model, like Vancouver's unemployment rate from Statistics Canada. Ask for a video, and it opens a review thread, with every web source it found. |
| B9 | 2:20 to 2:31 | The run ledger | Every run lands in a ledger: who asked, what happened, and what it cost, voice included. |
| B10 | 2:31 to 2:45 | GitHub: `03_build/output/clients/rain-city-ledger.json`, then the end card: logo and repository link | A new client is one config file. We host it, or it runs on their own server, so their data never leaves it. NewsReels does the reading. The editor keeps the judgement. |

## Read-through

The same words, without the table, for reading aloud in one take. Leave two seconds of silence between beats.

> Since 2008, 613 local news outlets have closed in Canada. The newsrooms that are left have more public data than ever: Vancouver alone has 1.3 million 3-1-1 requests, updated every day. Nobody has time to read them.
>
> This is NewsReels. It turns a newsroom's own data and news feeds into short news videos, and their editor approves every one in Slack.
>
> Each step is its own n8n workflow. Collect pulls nine weeks of the city's data. Score compares this week with the eight before and keeps only real changes. This week, fireworks complaints hit 37, almost seven times the usual, most in Grandview-Woodland. Context adds the client's news feeds, Claude writes the script in the outlet's style, and code checks every number against the data.
>
> The editor sees the script and the data behind it in a Slack thread, before any voice or video is paid for. They edit in plain words. Claude rewrites it, and the number check runs again.
>
> Approve the script, and ElevenLabs narrates it while Remotion renders a 30 second vertical video, right in the thread. Want a different chart? Just ask. About twenty seconds later, there is a new video.
>
> A second approval publishes it to the outlet's channel, with a public page that shows how the story was made.
>
> Every run has a trace. Each number links back to the city's data. You can see the news it used, exactly what Claude was asked and answered, and what it cost: about one cent of Claude per story.
>
> Anyone in the newsroom can ask, too. A question gets numbers in seconds, from the data, not the model, like Vancouver's unemployment rate from Statistics Canada. Ask for a video, and it opens a review thread, with every web source it found.
>
> Every run lands in a ledger: who asked, what happened, and what it cost, voice included.
>
> A new client is one config file. We host it, or it runs on their own server, so their data never leaves it. NewsReels does the reading. The editor keeps the judgement.

## Rubric check

| Criterion | Where it shows |
| --- | --- |
| Technical depth | B3 (n8n workflows and the number check), B7 (trace), B8 (Statistics Canada and web search), B10 (one config file) |
| Innovation and impact | B1 (news deserts), B7 (every number traced), B9 (cost per run) |
| Design and UX | B4 to B6: the whole review in one Slack thread, two approvals, edits in plain words |
| Demo | Everything on screen is the live product in #editor-demo |
