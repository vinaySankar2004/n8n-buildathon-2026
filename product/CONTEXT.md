# Stage: Product

## Job

Gather what each teammate wants the product to become, then merge it into one spec the team builds from.

## Inputs

`product/questions.md`, `01_idea/output/pick.md`, `_config/rubric.md`, and any proposals already in `product/proposals/`.

## Process

1. **Discussion.** Each teammate's Claude asks the questions in `questions.md`, one at a time, and writes the answers to `proposals/<first name>.md`, copied from `_templates/proposal.md`. Read the other proposals first and say where this person agrees or differs. Commit and push after each conversation.
2. **Consolidation,** once the team says the discussion is done. Merge the proposals into `output/spec.md`: the agreed name and user, then features ranked as "Before the freeze" or "After the event", each with its test and the stage it touches. Settled choices also go in `memory/decisions.md`, and new on-camera steps in `02_storyboard/output/must-work.md`.

## Audit

- [ ] Every teammate who wanted a say has a proposal.
- [ ] Every "Before the freeze" feature has a test and fits before Sunday 11:00.
- [ ] Nothing in the spec breaks the rules: public data, neighbourhood level, n8n doing real work.

## Output

`proposals/<first name>.md`, then `output/spec.md`.

Stop: spec agreed by Saturday 21:00, so features can land before the Sunday 11:00 freeze.
