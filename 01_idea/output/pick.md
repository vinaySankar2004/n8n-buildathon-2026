# Pick: local data newsroom

Team decision, 2026-11-14: "we really like the newsroom." Working name: open, the team's call. Other ideas considered are in [ideas.md](ideas.md).

## One sentence

Vancouver publishes fresh city data every day and nobody has time to turn it into stories, so this finds the week's real story in the data and turns it into a narrated 20-second video an editor approves in one click.

## User

A local newsroom editor or a city communications team with no data staff. Later: neighbourhood newsletters and community accounts.

## Golden path

1. On a schedule, n8n pulls recent 3-1-1 service requests, issued building permits, and business licences from the City of Vancouver open data API, grouped by type and neighbourhood.
2. A code step compares this week against the weeks before and ranks the biggest real changes.
3. An agent writes a 20-second script and a chart spec for the top story, citing the numbers it used.
4. Remotion renders the chart video and ElevenLabs voices the script.
5. The editor gets it in Slack with approve and reject. Approval posts it and drafts a newsletter blurb.

## Feasibility, checked 2026-11-14

- The Vancouver open data API answers. 3-1-1 service requests (1.33 million records) refresh once a day (newest record about 05:00 UTC); grouped queries over the last 7 days work. Example: 215 street flooding cases in the last 7 times 24 hours, to be compared against earlier weeks before calling it a story. Collect later settled on whole Vancouver days, which gave 218 for 7 to 13 November.
- Business licences and issued building permits are updated daily.
- The Statistics Canada Web Data Service answers; a Labour Force Survey series returned September and October 2026 values.
- Not yet proven: n8n starting a render. Prove one render by Saturday 14:00.

## Prize pools

Overall and the n8n track. The ElevenLabs award too, if it exists ([judges.md](../../_config/judges.md)).

## Limits

- Public open data only. Report by neighbourhood, never a single address.
- The demo outlet is fictional. No real newsroom's name, logo, or look.

## Fallback

If no render runs from n8n by Saturday 15:00, ship a chart image with a voice note in Slack. It is still the newsroom, without the video.
