# Redesign ship · Institution demos, cool neutrals, merge

25 November 2026 · `codex/rupturewatch-redesign` → `main` through [pull request #2](https://github.com/cybermo-bot/RuptureWatchTN/pull/2), merge commit `a14d452`. [Production](https://rupturewatch-tn.vercel.app/)

## What changed

- **Institution demos.** `/connexion/institution` now offers four one-click demos below the credentials form, in the same quiet style as the pharmacy and wholesaler doors: Ministère de la Santé (coordination), Pharmacie centrale, Ordre des pharmaciens and pharmacie hospitalière. They call `signInAsDemoRole` with the existing role keys from `lib/demo/roles.ts`. A note states that the organisations are fictional, the data simulated and the spaces "conçus pour" the institutions, not used by them. The texts are under `core.access.institution.*`.
- **No cream or beige.** `--page` is `#f5f7f6`, and `--limestone` became `--band` at `#f3f6f5` (used by `.home-masthead` and `.home-read`). DESIGN.md, `.impeccable/design.json`, CLAUDE.md and AGENTS.md describe the same palette. Powder blue, the petrol rail and scenario colour, and the blue action colour are unchanged.
- **Contrast (WCAG AA)**, computed from the tokens:

  | Text colour | On the band | On the page | On powder blue |
  |---|---|---|---|
  | Body text | 12.1:1 | 12.2:1 | 11.0:1 |
  | Muted text | 6.3:1 | 6.4:1 | 5.7:1 |
  | Primary blue | 6.7:1 | 6.8:1 | 6.1:1 |
  | Level colours | at least 5.5:1 | at least 5.5:1 | at least 5.0:1 |

  White on the primary button is 7.3:1.
- **Methods page.** The follow-up's photo credit in `data/SOURCES.md` had no methods-page entry, which failed the sources test. It is now listed as "Photographie de la page d'accueil", credited to the National Cancer Institute on Unsplash.
- **End-to-end tests.** New test 8 signs in to each institutional demo from `/connexion/institution` and checks that it lands on its home. The scenario's no-write check now counts only requests to the app's own origin, because Vercel's preview toolbar posts to `vercel.live`.
- **Commits.** The remaining redesign changes (photo, monogram, icons, patient wordmark link, Session 7 brief, follow-up report) are their own commit. Each fix is a separate commit.

## Checks

| Check | Result |
| --- | --- |
| `npm run check` | Passed: lint, type check and 651 unit tests in 58 files. |
| Production build | The default Turbopack build fails on this Windows machine. Checked as in the redesign report: Tailwind compiled first, then `next build --webpack`. Passed, and `app/globals.css` was restored afterwards. |
| CI and Vercel on the PR | Both green on the last commit, `c2c2e0a`. |
| Preview click-through, 360 × 800 | Passed. The home page has the new tokens, both bands are `rgb(243, 246, 245)`, the demo and search actions are within the first 800 px, and nothing overflows. The patient door focuses the search. The pharmacy and wholesaler demos reach their spaces on the `#f5f7f6` page. The scenario plays to Levée. The fourth report from Tunis stays Probable, and from Sfax becomes Confirmée with `<3` and no write. All four institutional demos reach `/coordination`, `/centrale`, `/ordre` and `/hopital`. |
| Production | `/api/health` shows commit `a14d452`, `status: ok`, `patientRequests: true`. The same click-through passed. |
| Patient request with an exact presentation, production | Passed. ANTIOMAL 250 mg, boîte de 30, in Tunis: the request page names that presentation. Pharmacie démo A, Tunis sees the same presentation on its request and answers "disponible". The patient's page then shows the pharmacy and still names the presentation. |

## Left on the live database

One patient request (ANTIOMAL 250 mg, Tunis) and its "disponible" answer from the simulated Pharmacie démo A, Tunis, created after 2026-11-25T00:55:32Z. The team lead can remove them with `npm run verify:clean -- --since 2026-11-25T00:55:32Z --apply`. The other checks only signed in.

## Not verified

- **Patient request on the preview.** Not possible: `DEVICE_HASH_SALT` is set for Production only in Vercel, so the preview's health reports `patientRequests: false`. Checked on production instead.
- **Write-heavy end-to-end tests.** Tests 1, 2, 4, 5, 6 and 7 were not run, because they write to the shared live database. The flows they cover were not touched in this pass.
- **Arabic public pages.** Not re-checked visually after the palette change. Only the background tokens changed.
- **Home page link to the institution door.** Resolved in the follow-up below.
- **Vercel bypass secret.** The automation bypass secret used for the preview was pasted into the working session. Rotate it in Vercel under Settings → Deployment Protection.

## Follow-up · Fourth home door

- The home page now has four doors: patient search, pharmacy, wholesaler and institution (`/connexion/institution`, Landmark icon), with texts under `public.home.institution.*` in French and Arabic. The grid shows two by two on tablets and one row of four from 1100 px; CLAUDE.md, AGENTS.md and DESIGN.md say every space is one click from the home page.
- Branch `fix/home-institution-door`: `npm run check` passed (lint, type check, 651 unit tests in 58 files) before the pull request.
