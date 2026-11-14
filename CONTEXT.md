# Local data newsroom

Team workspace for LOOP, the UBC eProjects x n8n Buildathon, 14 and 15 November 2026. It takes one idea to a Devpost submission: a working n8n product, a demo video under three minutes, and this repository.

Read only the current stage, its declared inputs, and the configuration it names.

## Task routing

| Task | Stage | Job |
| --- | --- | --- |
| Idea | `01_idea/CONTEXT.md` | Choose the one idea and state it in one sentence. |
| Storyboard | `02_storyboard/CONTEXT.md` | Write the demo video before building, and list what must work on camera. |
| Build | `03_build/CONTEXT.md` | Make every step on that list work for real in n8n. |
| Demo | `04_demo/CONTEXT.md` | Record and cut the video from the working product. |
| Submit | `05_submit/CONTEXT.md` | Publish the Devpost page and this repository before the deadline. |

## Shared records

- `_config/rules.md`: event rules, deadlines and prizes.
- `_config/rubric.md`: the four judging criteria and what earns each one here.
- `_config/judges.md`: questions for the organizers and track judges, with their answers.
- `_config/contracts.md`: the JSON each workflow hands to the next.
- `_config/infrastructure.md`: where everything runs and how to reach it.
- `memory/decisions.md`: team decisions, numbered and dated.
- `memory/failures.md`: what broke, the fix, and the check that catches it next time.
- `memory/lessons.md`: generalizations waiting for a second case.
- `tools/architecture/`: a live page showing every piece and its state.

## Stop times

| Stage | Done when | Stop |
| --- | --- | --- |
| 01_idea | Everyone can say the problem in one sentence | Sat 13:00 |
| 02_storyboard | The storyboard has a line starting "Approved" | Sat 14:00 |
| 03_build | The golden path passes three logged runs in a row | Rough run Sat 18:00, freeze Sun 11:00 |
| 04_demo | The video is under 3:00 and uploaded | Sun 13:30 |
| 05_submit | Devpost is submitted and this repository is public | Sun 14:30 |

Submissions close Sunday 15:00. Nobody pushes to this repository or edits Devpost after that.

## Operating rules

- Nothing moves to the next stage until a person has read the last output. At a stop time, a stage hands over what it has.
- One person per n8n workflow. Change `_config/contracts.md` first, then build on the change.
- No keys, tokens or passwords in git. Secrets live in n8n credentials or a local `.env`.
- Public open data only, reported by neighbourhood, never a single address.
- Every outside service, model or template goes in `03_build/output/services.md` when it enters the build.
- Keep facts, judges' statements, team decisions and suggestions apart, and say which is which.
