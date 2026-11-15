# NewsReels

Team workspace for LOOP, the UBC eProjects x n8n Buildathon, 14 and 15 November 2026. It takes one idea to a Devpost submission: a working n8n product, a demo video under three minutes, and this repository.

Status, Saturday evening: NewsReels runs end to end for its demo client, from its sources to a published post, with a review thread, Slack requests, a trace and a run ledger (D13 to D17). The spec is in `product/output/spec.md`; the build freezes Sunday 11:00.

Read only the current stage, its declared inputs, and the configuration it names.

## Task routing

| Task | Stage | Job |
| --- | --- | --- |
| Idea | `01_idea/CONTEXT.md` | Choose the one idea and state it in one sentence. |
| Storyboard | `02_storyboard/CONTEXT.md` | Write the demo video before building, and list what must work on camera. |
| Product | `product/CONTEXT.md` | Gather each teammate's ideas and merge them into one spec. |
| Build | `03_build/CONTEXT.md` | Make every step on the must-work list work for real in n8n. |
| Demo | `04_demo/CONTEXT.md` | Record and cut the video from the working product. |
| Submit | `05_submit/CONTEXT.md` | Publish the Devpost page and this repository before the deadline. |

## Shared records

- `_config/`: event rules, judging rubric, judges' answers, the data contracts between workflows, and where everything runs.
- `memory/`: decisions, failures and lessons, numbered and dated.
- `_templates/`: blank starters, such as a product proposal.
- `tools/`: the scripts behind `npm run` (`package.json` lists them) and the live architecture page.

## Stop times

| Stage | Done when | Stop |
| --- | --- | --- |
| 01_idea | Everyone can say the problem in one sentence | Sat 13:00 |
| 02_storyboard | The storyboard has a line starting "Approved" | Sat 14:00 |
| product | The spec is agreed | Sat 21:00 |
| 03_build | The golden path passes three logged runs in a row | Freeze Sun 11:00 |
| 04_demo | The video is under 3:00 and uploaded | Sun 13:30 |
| 05_submit | Devpost is submitted | Sun 14:30 |

Submissions close Sunday 15:00. Nobody pushes to this repository or edits Devpost after that.

## Operating rules

- Nothing moves to the next stage until a person has read the last output. At a stop time, a stage hands over what it has.
- Change `_config/contracts.md` first, then build on the change.
- No keys, tokens or passwords in git. Secrets live in n8n credentials or a local `.env`.
- Public sources only (open data and public news feeds), reported by neighbourhood, never a single address.
- Keep facts, judges' statements, team decisions and suggestions apart, and say which is which.
