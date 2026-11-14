# Proposal: Vinayak

From a conversation with Vinayak, Saturday 14 November, evening. His words where quoted; notes marked "Claude" are design suggestions he agreed to, for the team to discuss.

## Name

Not discussed yet.

## Who uses it

Not discussed yet.

## How they use it

Two approvals instead of one. The pipeline sends the editor the script, "and then it only builds the video after they see the script and approve it, and then another layer of approval so that they can actually publish it", so a rejected story does not spend ElevenLabs credits and tokens.

1. **Approve the script.** Slack shows the headline, the script, the numbers behind it, and a silent preview of the chart. The editor approves, rejects, or edits the script. An edited script goes through the number check again.
2. **Approve the video.** Only after step 1, ElevenLabs voices the script and the final video renders. The editor watches it and approves publishing.

If the editor rejects the script, the runner-up story from Score comes next as a fresh script.

Claude: a rejected story then costs one Claude call, about a cent. Rendering is local and free, so the silent preview at step 1 costs nothing.

## What it finds

Not discussed yet.

## What it makes

Not discussed yet.

## Trust

An observability and traceability layer, "because a lot of problems with AI, you can't view into it". He wants to pitch it tomorrow.

Every run gets a trace, readable by an editor:

- when each step ran and how long it took
- which datasets were checked, and how the candidate stories ranked, with why the top one won
- what Claude was asked and what it answered
- each number in the script and where it came from in the city's data
- what the run cost, in tokens and ElevenLabs characters
- who approved or edited what, and when

The editor's Slack messages link to the full trace. Each published post links to a public "How this story was made" page with the sources and the number checks, without prompts or costs.

Claude: n8n's run history already holds the raw steps; the trace turns it into something a person can read. It speaks to the event page's Trust (15%) and Workflow design (15%) criteria.

## Demo

"AI you can see into": open the trace for the story on camera and follow one number back to the city's data.

## Next three hours

Not discussed yet.

## Anything else

None yet.
