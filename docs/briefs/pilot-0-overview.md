# Pilot plan: from a jury demo to something real pharmacists use

Written Wednesday 25 November, evening, after a review of the live site, the code, Olfa's branch and `codex/medicine-search-design`, and a second review of these briefs themselves. Read `CLAUDE.md` first: its product rules (section 2) apply to every line. `DESIGN.md` and `CLAUDE.md` §9 are the design authority; the top `DECISIONS.md` entry about a plum palette is out of date.

## The goal

Put RuptureWatch in the hands of real pharmacists and real patients as soon as it is ready, and have them understand it without us next to them. The jury deliverables (link, 6-page report, 3-minute video; due Friday 27 November 23:59, submit at 20:00) come out of that work.

Priorities: **pharmacists**, then **patients**, then **Pharmacie centrale**, then polish for ministry, Ordre, hospital and wholesaler (no new features there).

## Two Claude Code sessions, one branch each, in order

| Session | Branch | Briefs | Starts when |
| --- | --- | --- | --- |
| A | `pilot-a` | `pilot-1-trust-fixes.md`, then `pilot-2-pilot-environment.md` | Wednesday night |
| B | `pilot-b` | `pilot-3-product-reporting.md`, then `pilot-4-experience.md` | Thursday, after A is merged and its migration applied |

Sequential, not parallel: every brief touches `messages/fr/core.json`, the sign-in page and the pharmacy screens. Inside a session, one commit per numbered item, plain messages.

## Step 0: done

`codex/medicine-search-design` was merged into `main` and deployed on 25 November. Everything below builds on it. `origin/olfa` is not merged: its reusable parts are ported in `pilot-4`; the globe, Three.js, its palette and its three fonts stay out.

## What only the team lead does (Claude Code never does these)

- Merge pull requests. Apply migrations to the demo database (and later the pilot database) before checking a preview that needs them.
- Rotate `TESTER_INVITE_CODE` on Vercel after session A (Production and Preview).
- Create the pilot site (checklist in `pilot-2`).
- Google Maps: browser key restricted to both domains, map ID, daily quota caps.
- Friday morning: `npm run demo:reset -- --since <time of last clean>` on the demo database, then record the video.
- Recruit pharmacists, print QR codes, run the field protocol.

## Commands Claude Code never runs

`npm run db:push`, `seed:demo`, `demo:*`, `verify:clean`, `catalogue:import`, `notices:import`, `library:import`, `test:e2e`, `test:live` (they write to a live database); `supabase`/`npx supabase`; `vercel`/`npx vercel`; `git push` to `main`, `git push --force`, `git reset --hard`, deleting a branch (including `olfa`); reading or printing `.env.local` or any secret; `npm audit fix --force`. These are also blocked in `.claude/settings.local.json`.

## Guardrails for every brief (do not degrade what exists)

- Run `npm run check` (lint, `next typegen` + `tsc`, unit and database tests) before starting and after every item. The test count never goes down. Never edit a test just to make it pass unless the brief names that test; when a test must change, change it in the same commit and say why in the report.
- Keep the selectors and texts used by `tests/e2e/core-flows.spec.ts`. If one must change, update the spec in the same commit and list it in the pull request (the lead runs e2e).
- Never change `lib/signal/`, `lib/signal/params.ts`, `docs/content/*` or the `core.rules.*` sentences (team content checked by `tests/content.test.ts`). Never relax the refusal checks in the demo scripts.
- These strings survive every text cut: the not-official line on every alert; « Ne changez pas de marque sans l'avis de votre pharmacien ou de votre médecin. »; the Library's France line; origin badges; Google and OpenStreetMap attribution; « conçu pour »; the CNAM source line; `<3` (except on the patient's own request, see `pilot-1`); the 72-hour explanation; install help under « Plus ».
- Every reversed past decision gets a dated line at the top of `docs/DECISIONS.md` saying what changed and why. Keep `AGENTS.md` in step with `CLAUDE.md`.
- New text under your brief's key prefix. Public text in French and Arabic; `core` stays French. No new namespace file.
- Every migration: timestamp after the last one, `schema_version` bump, row-level security on, explicit grants, an entry in `tests/db/grants.test.ts`, tests in `tests/db/`. Never applied by Claude Code.
- Do not rename routes or remove `id`/`aria-labelledby` anchors; keep `?m=` deep links and forms that work without JavaScript.
- Molecule names stay as written in the HTML; any small-caps styling is CSS only.
- UI work: read `.ux-profile.md` and the project skill `rw-design-system` first; finish with the project skill `rw-screen-review` (screenshots, look at them, `ux-audit`, fix). The UX skills are in `.claude/skills/`.
- Lighthouse accessibility stays at 100 where it is 100 today. Check 360 px, right-to-left, and reduced motion.
- A new dependency needs one line in `DECISIONS.md`.
- When something is unclear or a rule would be broken: do not stop the session. Skip that item, write the question in the report, continue with the next item.
- End each session with `docs/reports/pilot-a.md` or `pilot-b.md`: what was done, checks run, screenshots (360 and 1280 px) of changed screens in `docs/reports/pilot-a/` or `pilot-b/`, migrations to apply, manual steps for the lead, open questions.

## Timeline

- Wednesday night: step 0, session A, pull request.
- Thursday morning: lead merges A, applies its migration, rotates the code, creates the pilot site. First real pharmacists on the pilot as soon as it is live.
- Thursday: session B. **22:00 freeze** on the demo site.
- Friday: `demo:reset`, video in the morning, report in the afternoon with the exact tester numbers, submit at 20:00.
- Before 15 December: signal level per presentation, verified pharmacies, single-use invites, live WhatsApp, web push or another way to reach pharmacists, the business part.
