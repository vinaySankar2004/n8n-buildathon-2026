# Data contracts

The JSON each workflow hands to the next. Agree a change here before building on it, so four people can build in parallel.

`collected` (Collect to Score), draft of 2026-11-14:

```json
{
  "ok": true,
  "dataset": "3-1-1 service requests",
  "source": "City of Vancouver open data, 3-1-1 service requests",
  "source_url": "https://opendata.vancouver.ca/explore/dataset/3-1-1-service-requests/",
  "newest_record": "2026-11-14T04:51:59+00:00",
  "week_ending": "2026-11-13",
  "weeks": ["2026-09-18", "...", "2026-11-13"],
  "types": [
    {
      "type": "Street Surface Water Flooding Case",
      "weekly": [{ "week_ending": "2026-09-18", "count": 18 }],
      "by_area": [{ "area": "Mount Pleasant", "count": 33 }],
      "unknown_area": 4
    }
  ]
}
```

- `weeks` and each `weekly` hold 9 entries, oldest first. The last one is this week.
- Weeks are 7 days ending on `week_ending`, the Vancouver date of the newest record.
- `by_area` covers this week only, sorted by count. Requests with no neighbourhood are counted in `unknown_area` and left out of `by_area`.
- On failure Collect returns `{ "ok": false, "dataset": "...", "reason": "..." }` and nothing else. Score passes that on so Publish can send the "no story today" note.

`story` (Score to Write):

```json
{
  "week_ending": "2026-11-14",
  "dataset": "3-1-1 service requests",
  "type": "Street Surface Water Flooding Case",
  "this_week": 215,
  "avg_prev_8_weeks": 29.6,
  "ratio": 7.3,
  "by_area": [{ "area": "Mount Pleasant", "count": 33 }],
  "weekly": [{ "week_ending": "2026-11-07", "count": 31 }]
}
```

`spec` (Write to Voice and Render):

```json
{
  "headline": "Flooding reports up seven times",
  "script": "About 50 words, every number from the story",
  "callout": { "value": "7.3×", "label": "215 reports this week against an average of 29.6" },
  "chart": {
    "kind": "bar",
    "title": "Flooding reports by neighbourhood, last 7 days",
    "data": [{ "label": "Mount Pleasant", "value": 33 }],
    "source_note": "City of Vancouver open data, 3-1-1 service requests"
  },
  "duration_s": 20
}
```

Render service: `POST /render` with `{ "spec": …, "audio_url": … }` returns `{ "video_url": … }`.
