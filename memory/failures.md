# Failures

What broke, how it was fixed, and the check that would catch it again.

- **F1, 2026-11-14. The countdown ran an hour early.** Node's bundled time zone data and macOS disagree about Vancouver's offset. Fix: the architecture server sends wall-clock times with no offset, and the browser reads them in the computer's own zone. Check: the page's next stop matches the clock on the wall.
- **F2, 2026-11-14. We said the 3-1-1 data updates every few hours.** A live check showed it refreshes once a day. Fix: corrected in the pick and the storyboard. Check: the architecture page shows the dataset's latest update time.
- **F3, 2026-11-14. The n8n Cloud trial blocks the public API.** Settings, n8n API shows "Upgrade to use API", so `npm run sync` cannot run. Fix: n8n is self-hosted on the host laptop, where the API is on (D11). Check: `npm run deploy` and `npm run sync` both run.
- **F4, 2026-11-14. Building permit days came out one day early.** `issuedate` has no time, so the API stores it at UTC midnight, and grouping in Vancouver time moved every permit to the day before. Fix: a source with `date_only: true` is grouped in UTC. Check: `npm run test:pipeline` confirms each source's neighbourhood counts add up to its weekly count.
- **F5, 2026-11-14. The first draft of Score picked "election inquiries fell to 0".** A category dropping to zero is usually a season or program ending, and it leaves no neighbourhoods to chart. Fix: drops must stay above zero, and a drop story charts the weekly trend. Check: `npm run test:pipeline` prints the top story and runners-up.
