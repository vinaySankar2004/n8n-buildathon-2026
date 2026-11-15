# Must work on camera

Every step the storyboard shows, in order. Each one is the build scope and has a test. Beat IDs refer to [storyboard.md](storyboard.md).

| # | Step | Beat | Test | Owner |
| --- | --- | --- | --- | --- |
| 1 | **Collect.** An n8n workflow pulls 9 weeks of each of the client's datasets (3-1-1 requests, building permits, business licences), grouped by category, week and neighbourhood | B3 | 9 weeks of counts per category for each source | Arman |
| 2 | **Score.** A code step ranks types by this week against the 8-week average and picks the top story, with its neighbourhood breakdown | B4 | Top story matches a hand check of the API | |
| 3 | **Write.** An agent turns the story into a headline, a script of 35 to 45 words, and a chart spec, using only numbers from step 2 or a news report it names (D15) | B5 | Every number in the script appears in the story | |
| 4 | **Voice.** ElevenLabs reads the script | B5, B6 | Audio file returns, under 22 seconds | |
| 5 | **Render.** A render service on the host laptop, next to n8n, turns the chart spec and audio into a 9:16 video | B5, B6 | n8n gets back a playable MP4 link | |
| 6 | **Approve.** Slack sends the editor the script and the data behind it first, then the video, each with approve and reject. Replies in the thread change either one (D14) | B7 | A reply such as "make the headline calmer" gets a revised draft in the thread; tapping approve on a phone makes the video, then publishes | Arman |
| 7 | **Publish.** Approval posts the video and the newsletter blurb to the outlet channel in Slack (D12) | B7 | The post is visible; the blurb exists | |
| 8 | **Canvas.** Ten named workflows with sticky notes, joined by Execute Workflow nodes | B10 | A cold viewer can name each stage | |
| 9 | **Guard.** Before voicing, a check compares every number in the script with the story and any report the script cites, and stops the run on a mismatch. A story needs at least 20 reports and at least twice the usual weekly level | B5 | A script with one changed number is blocked | |
| 10 | **Quiet.** If the city API fails or no change passes the bar, the editor gets a short "no story today" note in Slack instead of a video | B7 | Pointing Collect at a dead URL produces the note, not an error | |
| 11 | **Client.** The video and messages carry the client's name and style from its config file (D15) | B5 | The video shows "Rain City Ledger", not "[Outlet]" | Vinayak |
| 12 | **Context.** Write adds one sentence from a related news report and names it on screen and in the blurb; a feed that fails does not stop the run | B5 | `npm run test:pipeline` passes the Context and report-guard checks | Vinayak |
| 13 | **Trace.** The review card links a run trace that follows every number to its source and shows the cost; the outlet post links a public "How this story was made" page | B7 | Open the trace from the card and find 218 traced to the 3-1-1 data | Vinayak |
| 14 | **Request.** "@NewsReels make a video about graffiti in Mount Pleasant" in the editor channel opens a review thread with that story; a question gets the numbers in the thread | B7 | Both kinds of request work from Slack, and a nonsense one gets a polite "try asking" | Vinayak |
| 15 | **Ledger.** Every run, with who started it, its status and its Claude and ElevenLabs cost, is on one page | B7 | After a request, its row shows the asker, the status and the cost | Vinayak |
| 16 | **Chart.** After the video is made, a reply such as "make it a line chart" or "make Mount Pleasant red" remakes it with that chart | B6 | The new video shows the asked-for chart within about 30 seconds | Vinayak |
| 17 | **Web sources.** A video request also searches the web for recent reporting; the review card lists each source with the words it was cited for, and the script may name one (D20) | B7 | The review card shows the web sources with links and quotes, the trace lists the searches and their cost, and a number from a page passes the guard only if the script cites it | Arman |
| 18 | **Unemployment.** "@NewsReels show unemployment over the last 5 years" answers in the thread, and as a video draws Vancouver's monthly rate as a line | B9 | The answer's latest rate and month match Statistics Canada's table 14-10-0459-01 | Vinayak |
| 19 | **Free edits and scenes.** Videos run about 30 seconds in three scenes; a reply can change colours per bar, length, scenes or the closing line, and only a made-up number is refused | B6 | "Make Downtown green and drop the closing scene" remakes the video that way | Vinayak |

## Contracts between workflows

The JSON passed between workflows lives in [_config/contracts.md](../../_config/contracts.md). Agree a change there before building on it.
