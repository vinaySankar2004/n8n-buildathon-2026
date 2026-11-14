# Failures

What broke, how it was fixed, and the check that would catch it again.

- **F1, 2026-11-14. The countdown ran an hour early.** Node's bundled time zone data and macOS disagree about Vancouver's offset. Fix: the architecture server sends wall-clock times with no offset, and the browser reads them in the computer's own zone. Check: the page's next stop matches the clock on the wall.
- **F2, 2026-11-14. We said the 3-1-1 data updates every few hours.** A live check showed it refreshes once a day. Fix: corrected in the pick and the storyboard. Check: the architecture page shows the dataset's latest update time.
- **F3, 2026-11-14. The n8n Cloud trial blocks the public API.** Settings, n8n API shows "Upgrade to use API", so `npm run sync` cannot run. Fix: n8n is self-hosted on the host laptop, where the API is on (D11). Check: `npm run deploy` and `npm run sync` both run.
