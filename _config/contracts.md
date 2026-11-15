# Data contracts

The JSON each workflow hands to the next. Agree a change here before building on it, so four people can build in parallel.

`client` (D13): one file per newsReels client in `03_build/output/clients/`, built into the orchestrator's "Client" node. It holds `id`, `name`, `look` (`desk`, `accent`), `slack` (`editor`, `outlet` channel IDs), `data_sources` (a list of `source`, below), `news_feeds` (`{ "id", "kind": "rss" | "weather_alerts" | "open511", "label", "source_note", "url" }`) and `style` (`audience`, `tone`, `script_words` `{ "min", "max" }`, `avoid`, `samples`). See [rain-city-ledger.json](../03_build/output/clients/rain-city-ledger.json).

`source` (Orchestrator to Collect), one per entry in the client's `data_sources`:

```json
{
  "id": "311",
  "portal": "https://opendata.vancouver.ca",
  "dataset": "3-1-1-service-requests",
  "label": "3-1-1 service requests",
  "source_note": "City of Vancouver open data, 3-1-1 service requests",
  "source_url": "https://opendata.vancouver.ca/explore/dataset/3-1-1-service-requests/",
  "unit": "reports",
  "date_field": "service_request_open_timestamp",
  "category_field": "service_request_type",
  "area_field": "local_area",
  "date_only": false,
  "max_age_hours": 48,
  "filter": ""
}
```

`collected` (Collect to Score), one per source:

```json
{
  "ok": true,
  "source_id": "311",
  "dataset": "3-1-1 service requests",
  "source_note": "City of Vancouver open data, 3-1-1 service requests",
  "source_url": "https://opendata.vancouver.ca/explore/dataset/3-1-1-service-requests/",
  "unit": "reports",
  "newest_record": "2026-11-14T04:51:59+00:00",
  "week_start": "2026-11-07",
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
- Weeks are 7 days ending on `week_ending`, the Vancouver date of the newest record up to now.
- `by_area` covers this week only, sorted by count. Records with no neighbourhood are counted in `unknown_area`.
- On failure: `{ "ok": false, "step": "Collect", "source": "...", "reason": "..." }`.

Score gets every `collected` and returns `{ "ok": true, "story": …, "runners_up": […], "sources_checked": "...", "sources_failed": […] }`, or `{ "ok": false, "step": "Score", "reason": "..." }` when nothing passes the bar.

`story`:

```json
{
  "week_start": "2026-11-07",
  "week_ending": "2026-11-13",
  "dataset": "3-1-1 service requests",
  "source_note": "City of Vancouver open data, 3-1-1 service requests",
  "source_url": "https://opendata.vancouver.ca/explore/dataset/3-1-1-service-requests/",
  "unit": "reports",
  "type": "Street Surface Water Flooding Case",
  "topic": "Street Surface Water Flooding",
  "direction": "up",
  "this_week": 218,
  "avg_prev_8_weeks": 29.3,
  "ratio": 7.4,
  "pct_change": 644,
  "chart_kind": "by_area",
  "by_area": [{ "area": "Mount Pleasant", "count": 33 }],
  "unknown_area": 4,
  "weekly": [{ "week_ending": "2026-11-13", "count": 218 }]
}
```

`chart_kind` is `by_area` for a rise with at least 3 neighbourhoods, otherwise `weekly` (the last 6 weeks).

`spec` (Write to Voice and Render):

```json
{
  "headline": "Flooding reports up seven times",
  "script": "About 50 words, every number from the story",
  "callout": { "value": "7.4×", "label": "218 reports this week against an average of 29.3" },
  "chart": {
    "kind": "bar",
    "title": "Flooding reports by neighbourhood, last 7 days",
    "data": [{ "label": "Mount Pleasant", "value": 33 }],
    "source_note": "City of Vancouver open data, 3-1-1 service requests"
  },
  "brand": { "name": "Rain City Ledger", "desk": "City data desk", "accent": "#F2B33D" },
  "duration_s": 20
}
```

`source_note` on the chart also names the source of every report the script uses, separated by "; ".

`run`: from Write on, each step returns what it got plus its own part, with `ok` saying whether to go on, or `{ "ok": false, "step": "...", "reason": "..." }`.

| After | Adds |
| --- | --- |
| Run options | `client` (the client file without `data_sources`), `test_tamper` |
| Context | `reports` (up to 12, newest first: `{ "id": "r1", "source", "feed", "title", "summary", "url", "published" }`), `feeds_checked` (`{ "feed", "ok", "items", "recent" }` or `{ "feed", "ok": false, "reason" }`) |
| Write | `spec`, `blurb`, `script_words`, `chart_kind` (`by_area` or `weekly`, which the editor can change), `reports_used` (the reports the script cites), `write` (`model`, `usage`, `stop_reason`, `answer`, `number_checks`: `{ "field", "number", "from" }` for every number) |
| Voice | `audio_base64`, `audio_seconds` |
| Render | `video_url`, `video_seconds`, `render_seconds` (and drops `audio_base64`) |
| Publish | `published: true` |

Inside 7 Chat the run also carries `chat`: `{ "thread_ts", "stage", "history", "user", "text" }`. Voice and Render pass it through untouched.

Render service: `POST /render` with `{ "spec": …, "audio_base64": … }` or `{ "spec": …, "audio_url": … }` returns `{ "video_url", "duration_s", "render_seconds" }`.

## 7 Chat

The orchestrator hands 7 Chat the run from Write. 7 Chat posts it to the editor channel and keeps one row per review thread in the n8n data table `editor_threads`:

| Column | Holds |
| --- | --- |
| `thread_ts` | The Slack timestamp of the thread's first message |
| `stage` | `script` (no voice or video yet), `video` (video posted), `published` or `rejected` |
| `state` | JSON text: `{ "run": the run without audio, "history": [{ "editor": "..." } or { "bot": "..." }, last 12] }` |

The router on the host laptop checks Slack's signature and posts to n8n's `/webhook/slack-events` either `{ "source": "events", "body": Slack's event_callback }` for a message, or `{ "source": "interactivity", "payload": Slack's block_actions }` for a tap on a button whose `action_id` starts with `newsroom_` (`newsroom_approve_script`, `newsroom_approve_video`, `newsroom_reject`).

Revise with Claude returns `{ "reply": "...", "draft": { "headline", "script", "callout_label", "chart_title", "chart_kind", "blurb", "reports_used" } or null }`. The draft passes the same number guard as Write before it is used.
