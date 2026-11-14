# Pitch and answers

For the judges' table and the Devpost page. Short enough to say out loud. The questions follow the event page: the problem, the safeguards, and the next step.

## One line

We turn Vancouver's open city data into a daily narrated news video, and an editor approves it with one tap.

## Twenty seconds

Vancouver publishes city data every day: 3-1-1 complaints, permits, business licences. Nobody has time to read it. Our n8n workflow pulls it every morning, compares this week with the last eight, and finds the real story. Today that is street flooding reports at seven times their normal level, worst in Mount Pleasant. An AI agent writes a 20 second script using only those numbers, ElevenLabs voices it, we render a vertical video, and an editor approves it from Slack.

## What problem does it solve, and for whom?

Vancouver's 3-1-1 data alone holds 1.33 million requests, refreshed every day, and the stories are in there. In the week of 7 to 13 November, street flooding reports reached 7.4 times their usual level. Finding that takes someone who can query the data, compare weeks, chart it and write it up. Small newsrooms, neighbourhood newsletters and city communications teams rarely have that person. The workflow does the finding and the drafting; the editor keeps the judgement.

## Who uses it?

An editor at a local outlet or a neighbourhood newsletter, or a city communications officer. They get one message a day in Slack: a 20 second video, the numbers behind it, and two buttons.

## What does it do?

1. Collect: pulls nine weeks of 3-1-1 requests from the city's open data API.
2. Score: compares this week with the eight before and picks the biggest real change.
3. Write: an AI agent drafts a headline, a short script and a chart spec from those numbers only.
4. Guard: checks every number in the script against the data and stops the run on a mismatch.
5. Voice and render: ElevenLabs reads the script and a render service makes a vertical video.
6. Approve and publish: the editor approves or rejects in Slack, and only then does it publish.

## Safeguards

- Nothing publishes without a person. n8n waits for the editor's answer in Slack.
- The AI only drafts. It may use no number that is not in the scored data, and the guard step blocks any script that does.
- A change counts as a story only above a bar: at least 20 reports and at least twice the usual weekly level. Small, noisy counts are ignored.
- Public open data only, reported by neighbourhood. No addresses and no people.
- Every video names its source dataset.
- Failures are visible. If the city API is down or nothing passes the bar, the editor gets a "no story today" note instead of a video.

## What it does not do

It does not say why a number changed. It reports what the city's data shows, and the editor decides whether there is more to the story.

## Why n8n?

n8n runs every step: the schedule, the API calls, the scoring code, the AI agent, the voice, the render request and the approval wait. Each step is its own workflow, joined by an orchestrator, so a failure shows up at the step that broke.

## Next step

Run it daily for one neighbourhood newsletter for a month and count how many drafts the editor approves. Then add building permits and business licences, more languages for the voice, and other cities whose portals use the same open data API.

## Track fit

Human-in-the-loop: the editor approves every video, and it is always clear what the system did and who decides.
