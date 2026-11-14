# 1 Collect

Step 1 in [must-work.md](../../../02_storyboard/output/must-work.md). Owner: Arman. The workflow is [workflows/1-collect.json](../workflows/1-collect.json), deployed to the self-hosted n8n on 2026-11-14.

## Running it

1. `npm run deploy -- collect` pushes the JSON into n8n.
2. `npm run invoke -- collect` runs it through its "Test webhook" trigger and prints the `collected` JSON. It needs no credentials: the city API is public.
3. Expect `ok: true`, 9 `weeks` and about 220 `types`. On 14 November it returned 222 types in under 3 seconds.

## What each node does

| Node | Does |
| --- | --- |
| When called by orchestrator | Starts the workflow from the orchestrator's Execute Workflow node |
| Test run | Starts it by hand in the editor |
| Test webhook | Starts it from `npm run invoke -- collect` and returns the result |
| Newest record | Asks the city when its newest 3-1-1 record was logged |
| Set window | Sets 9 weeks of 7 days ending on that day, Vancouver time. Fails if the data is over 48 hours old |
| Data fresh? | Sends a stale or empty answer to "No data today" |
| Daily counts by type | One grouped query: requests per type per day for the 63 days |
| This week by area | One grouped query: requests per type per neighbourhood for the last 7 days. Runs once, not once per row |
| Build collected | Adds days into weeks and returns the `collected` JSON in [contracts.md](../../../_config/contracts.md) |
| No data today | Any failure ends here with `ok: false` and a reason, so the run ends in a note, not an error |

Each HTTP node retries 3 times and then sends its error to "No data today".

## Queries

Base: `https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/3-1-1-service-requests`. The `exports/json` endpoint returns all grouped rows in one call, with no 100-row page limit. Both queries use `timezone=America/Vancouver`, so days and weeks follow local time. Neither one reads the `address`, `latitude` or `longitude` fields.

## Checked against live data, 2026-11-14

- Newest record 04:51 UTC on 14 November, which is 13 November in Vancouver. The week runs 7 to 13 November.
- 222 request types, about 7,200 daily rows, under a second per query. The output is about 140 KB.
- Flooding: 218 this week against an average of 29.3 over the 8 weeks before, 7.5 times. Mount Pleasant 33, Downtown 24, Grandview-Woodland 20, 4 with no neighbourhood. The neighbourhood counts add up to the weekly count.
- The storyboard says 215 and 29.6 because it used the last 7 times 24 hours instead of whole local days. Rerun before recording either way.

## Test for must-work row 1

Output has 9 weeks of counts per type. For the quiet path (row 10), change the URL in "Newest record" to a dead one and run it: the run should end at "No data today".
