# Outside services, models and templates

The disclosure list for Devpost. Add each one the moment it enters the build.

| Service | Used for | Since |
| --- | --- | --- |
| n8n 2.47.7, self-hosted community edition | Every workflow | 2026-11-14 |
| n8n Cloud, trial | Fallback only; its API is blocked | 2026-11-14 |
| City of Vancouver open data API | 3-1-1 service requests, issued building permits, business licences | 2026-11-14 |
| Statistics Canada Web Data Service | Vancouver's monthly unemployment rate, table 14-10-0459-01, for Slack requests (8 Request) | 2026-11-15 |
| BC Government News RSS (news.gov.bc.ca) | News context for Rain City Ledger (2b Context); terms of use not yet checked | 2026-11-14 |
| Environment Canada weather alerts API (api.weather.gc.ca) | Live weather alerts for Vancouver (2b Context); terms of use not yet checked | 2026-11-14 |
| DriveBC Open511 API | Live road events in Vancouver (2b Context); terms of use not yet checked | 2026-11-14 |
| Remotion 4.0.543 | Rendering the story video. Its free licence covers "individuals and companies of up to 3 people" (remotion.dev/docs/license/pricing, read 2026-11-15); the team is two | 2026-11-14 |
| Express 5.3.0 | The render service's web server | 2026-11-14 |
| FFmpeg (ffprobe) | Measuring the narration's length in the render service | 2026-11-14 |
| ngrok, free plan | One public address for n8n, the render service's links and pages, and Slack's events, through the router (D11) | 2026-11-14 |
| create-video blank template | Starting point for the render service | 2026-11-14 |
| Claude Code (Anthropic) | Writing code, workflow JSON, docs and the repository's checks, directed by the team | 2026-11-14 |
| Anthropic API, Claude Sonnet 5.5 | Writing the headline, script, chart title and newsletter blurb | 2026-11-14 |
| Anthropic API, web search tool (`web_search_20250305`) | Recent reporting on a story asked for in Slack (2b Context), with the exact words cited from each page; $10 per 1,000 searches plus tokens, about $0.07 a request (D20) | 2026-11-15 |
| Reddit API, through n8n's Reddit node (OAuth2, read-only) | How people are reacting to each story, from r/vancouver and r/britishcolumbia: posts and their top comments, opinion only, never a source for numbers (D21) | 2026-11-15 |
| Anthropic API, Claude Haiku 5.5 | Revising drafts from the editor's replies (7 Chat) and matching Slack requests to the data (8 Request) | 2026-11-14 |
| ElevenLabs subscription API | Reading the plan's credits and price per credit for the ledger (4 Voice) | 2026-11-14 |
| ElevenLabs text to speech, Multilingual v2 | Reading the script | 2026-11-14 |
| Slack | Editor review threads (Events API and interactivity through the router, D14), the outlet channel, and "no story today" notes | 2026-11-14 |
