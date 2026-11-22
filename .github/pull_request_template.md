## What this does

<!-- One or two sentences, in plain words. Which track, which part of the brief. -->

## Done checks

<!-- Copy the done checks from your brief. For each one: pass or not, and how you checked it (on the Vercel preview, at 360 px). -->

- [ ] 
- [ ] 

## Checklist

- [ ] `npm run check` passes (lint, type check, tests) and CI is green.
- [ ] The latest `main` is merged into this branch.
- [ ] Only my track's route folders and message namespace are changed (or the exceptions are listed below).
- [ ] All interface text is in `messages/fr/<namespace>.json` (and `messages/ar/` for public pages). Arabic checked right to left.
- [ ] No pharmacy is named to another party; counts under 3 show as "<3" (`CLAUDE.md` rules 1 and 2).
- [ ] No patient data stored: no name, phone number, exact position or prescription (rule 3).
- [ ] Every simulated figure carries its origin badge; no invented figure (rules 4 and 5).
- [ ] No clinical text written by us; no other molecule suggested (rule 11).
- [ ] Google content shown only on a Google map, never stored except place IDs (rule 13).
- [ ] New dependencies have one line each in `docs/DECISIONS.md`.
- [ ] No secret, key or `.env.local` in the diff.
- [ ] Tested on the Vercel preview of this pull request.

## Migrations

<!-- List the migration files this adds and what each does. The team lead applies them after merging; do not apply them yourself. Write "None" if there are none. -->

## Screenshots at 360 px

<!-- One per new screen, in French, and in Arabic for public pages. -->

## Questions for the team lead

<!-- Anything you were unsure about, anything outside your folders you had to touch. -->
