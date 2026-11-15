# Proposal: Vinayak

From conversations with Vinayak, Saturday 14 November, evening. His words where quoted; notes marked "Claude" are design suggestions he agreed to, for the team to discuss.

## Name

NewsReels, the team's choice (D13). It is a service, not an outlet: clients publish under their own names. The demo client is Rain City Ledger, a made-up outlet (D5); a web search found no outlet with that name.

## Who uses it

"Newsrooms" and "individual content creators" who want short videos made from their own material. They are clients of the service; their editor approves each story but does not own NewsReels. Each client gives us their input sources, and we tune how the script is written "so that it's optimized for the way they want it". The rest of the pipeline stays the same for every client.

He wants it kept simple: "we don't want to overcomplicate it" or over-engineer.

## How they use it

Two approvals instead of one. The pipeline sends the editor the script, "and then it only builds the video after they see the script and approve it, and then another layer of approval so that they can actually publish it", so a rejected story does not spend ElevenLabs credits and tokens.

1. **Approve the script.** Slack shows the headline, the script, the numbers behind it, and a silent preview of the chart. The editor approves, rejects, or edits the script. An edited script goes through the number check again.
2. **Approve the video.** Only after step 1, ElevenLabs voices the script and the final video renders. The editor watches it and approves publishing.

If the editor rejects the script, the runner-up story from Score comes next as a fresh script.

At either step the editor can also reply in the Slack thread to "edit the video generated or propose changes", in plain words such as "make it shorter" or "lead with Mount Pleasant", and get a revised version back. He wants this built "using n8n well" so it spends as few tokens as possible: a low-cost model (Claude Haiku 5.5) turns the reply into a change to the script or to the video's settings, and n8n does the rest.

Claude: a rejected story then costs one Claude call, about a cent. Rendering is local and free, so the silent preview at step 1 costs nothing. For edits, Slack sends thread replies to n8n through its Events API, which needs one more bot scope (`channels:history`). Haiku 5.5 costs $0.10 per million input tokens and $0.50 per million output tokens, a twentieth of the Sonnet that writes the script. After an edit the number check runs again, and only a changed script is voiced again. Video edits are limited to what the template exposes (wording, which number leads, chart style, length); the model cannot add a number the data does not hold.

## What it finds

Both "data real time as well as news reports". The data leads: Score still picks the biggest change in the client's data, and Write pulls recent reports on the same topic for context. Every claim in the script cites either the data or a report.

Sources for Rain City Ledger:

- the three City of Vancouver datasets we already pull (3-1-1, building permits, business licences)
- BC Government News, an RSS feed of official releases
- Environment Canada weather alerts, a live open API
- DriveBC road events, a live open API

Claude: all three new feeds answered on Saturday evening. This week they line up into one story: 218 street-flooding reports, BC Government News advising people to "plan for storm, possible flood conditions on South Coast highways", and any live weather warning. Each feed's terms of use still need a check before it goes in the demo.

## What it makes

The same as today: a narrated 9:16 video and a newsletter draft for each approved story, written in the client's style.

## Client setup

One config file per client, filled in by us. It holds:

- the client's name and look for the video
- their sources: data and news feeds
- a short style card: tone, length, audience, words to avoid, and one or two sample scripts, which Write follows

Claude: a second client is then one more file, and swapping the style card on camera shows the same story written two ways.

## Trust

An observability and traceability layer, "because a lot of problems with AI, you can't view into it". He wants to pitch it tomorrow.

Every run gets a trace, readable by an editor:

- when each step ran and how long it took
- which sources were checked, and how the candidate stories ranked, with why the top one won
- what Claude was asked and what it answered
- each number in the script and where it came from in the data, and each report it cites
- what the run cost, in tokens and ElevenLabs characters
- who approved or edited what, and when

The editor's Slack messages link to the full trace. Each published post links to a public "How this story was made" page with the sources and the number checks, without prompts or costs.

Claude: n8n's run history already holds the raw steps; the trace turns it into something a person can read. It speaks to the event page's Trust (15%) and Workflow design (15%) criteria. Built Saturday evening (D16): both pages are live, linked from the review card and the outlet post.

## Demo

"AI you can see into": open the trace for the story on camera and follow one number back to the city's data.

## Next three hours

"Client config first": the config file, the style card and the news feeds, because that is what makes the pipeline NewsReels. Then the run trace, which he wants as the pitch's point about trust. Built Saturday evening (D15).

## Anything else

None yet.
