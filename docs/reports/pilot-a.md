# Session A · Trust fixes, then pilot mode

Pilot briefs 1 and 2 · 26 November 2026 · branch `pilot-a`, based on `main` at `2f6b463`.

All checks below ran locally: `npm run check`, unit and database tests (PGlite), and a production build on `http://127.0.0.1:3200`. That build read the live demo database but never wrote to it. Nothing here has been checked on a Vercel preview yet: the lead does that after applying the migration (see "Manual steps").

## Changes

One commit per numbered item, `npm run check` green before each commit (one exception, noted under item 5 of pilot-1).

| Commit | Item | What changed |
| --- | --- | --- |
| `7da60e9` | Before starting | `tsc` read the git-ignored `Claude outputs/` folder and failed locally; `tsconfig.json` now excludes it. Baseline after it: 58 test files, **651 tests**. |
| `1effe20` | Pilot-1 · 1 | A simulated public status is led by a full-width banner « Démonstration : ce niveau vient de données simulées. Il ne dit rien de la situation réelle de ce médicament. » (French and Arabic). The status sentence stays below it, smaller, so « Rupture confirmée » is still readable for e2e and the video. The banner is the first line of the shared text and the headline of the Open Graph card. It also appears on `/vues`, in the public panel only. The unused keys `public.medicine.simulation*` and `public.share.simulated*` were removed. In `tests/share.test.ts`, the first test now expects the banner as the first line, where the brief puts it. |
| `d024957` | Pilot-1 · 2 | `TesterInvitation` gets the signed-in organisation's origin. For a `simulated` organisation it shows « Lien d'invitation masqué dans la démonstration. », with no QR code and no URL in the HTML. Checked with a probe of `/coordination/invitation` and `/ordre/invitation` as demo roles: no `/rejoindre` anywhere. New test file `tests/invitation.test.ts`. |
| `722dfd1` | Pilot-1 · 3 | One showcase list in `lib/demo/showcase.ts`, reused by `shortage.ts`, `national.ts` and `clean-verification.ts`. For the one-click pharmacies, showcase molecules carry a « démonstration » tag in Signaler and Mes médicaments and cannot be tapped for reporting. The server actions (« non livré », « livré à nouveau ») and the WhatsApp bot refuse them too; the action fails closed if the molecule cannot be read. **The database insert policy is not changed**, as the brief asks. The hint strip and search example now point to CARBAMAZEPINE. New script `demo:reset -- --since <ISO time>`, documented in the header of `scripts/demo-reset.ts` and in `DECISIONS.md`; not run. |
| `0a099fe` | Pilot-1 · 4 | Doors lead with their demos: Tunis and Sfax on `pharmacie` (with the « Deux pharmacies… » line), the wholesaler demo on `grossiste`, the four demos on `institution`. The email and password form sits below in `<details><summary>J'ai un compte</summary>`. |
| `1d05693` | Pilot-1 · 5 | « État du service » removed from the footer; `/status` is still reachable by URL, without the « Contour des gouvernorats… » sentence. `/dev/carte` and `/dev/search` return `notFound()` when `VERCEL_ENV === 'production'` (`devPagesHidden()` in `lib/env.ts`, tested). |
| `4f5d082` | Pilot-1 · 6 | `LevelExplanation` and `/methode` show the rule's name (`core.method.rules.<code>.name`), never the code. `core.rules.*` untouched. `tests/content.test.ts` renders every rule and checks this. |
| `a54efba` | Pilot-1 · 7 | The pharmacy tab bar reads « Demandes » (its own key `core.pharmacy.tabs.requests`). The coordination note now reads « Gouvernorats avec au moins un signalement sur {days} jours ». The patient answers page shows « 1 ou 2 réponses » for `<3`. The report result shows the team sentence once, under one plain line built from `params.ts`. A `plural()` helper in `lib/i18n.ts` (`Intl.PluralRules`, six categories in both files) covers minutes, hours, days and pharmacy counts on public pages. `/scenario` has the showcase line with `DEMO_SHORTAGE_MOLECULE`. |
| `2088f74` | Pilot-2 · 1 | `NEXT_PUBLIC_APP_MODE` (`demo` by default) through `appMode()` and `isPilot()` in `lib/env.ts`, listed in `.env.example`. In pilot mode: <ul><li>`signInAsDemoRole` refuses on the server, and no demo button is rendered on `/connexion`, `/prescripteurs` or anywhere else.</li><li>`/scenario`, `/vues` and `/vues/[id]` return 404, and links to them are removed.</li><li>The home page has two doors.</li><li>The pilot line shows on every page, in French and Arabic.</li></ul>The demo scripts are guarded with `serviceClient({ demoOnly: true })`: `seed:demo`, `demo:*` and `verify:clean` refuse any database whose URL is not in `DEMO_SUPABASE_URL`. |
| `afda65d` | Pilot-2 · 2 | Three-screen guide at `/pharmacie/bienvenue`, skippable, shown once after joining (`localStorage`), reopened from « Plus » → « Comment ça marche ». « Gardez ce navigateur… » shows once, after joining. Tester accounts get no iPhone home-screen hint. On the pilot a pharmacy lands on `/pharmacie`; the demo still lands on `/pharmacie/signaler`. |
| `d804622` | Pilot-2 · 3 | « Un problème ? Une idée ? »: `/avis` (public, French and Arabic, linked from the footer with the page it came from) and `/pharmacie/avis` (from « Plus »). Migration `20261126000000_feedback.sql` (see "Migrations"). |
| `9607c33` | Pilot-2 · 4 | When a request reached no pharmacy, `/demandes/[id]` says « Aucune pharmacie participante dans ce gouvernorat pour l'instant. » and links to `/pharmacies` and to the medicine's status. It no longer auto-refreshes or asks the patient to wait. On the pilot, the request form adds « RuptureWatch est en test : peu de pharmacies participent pour l'instant. » under the governorate choice. |
| `f5afc8c` | Pilot-2 · 5 | A search with no result adds « Ce médicament n'est peut-être pas dans la liste CNAM des médicaments remboursés. » and a link to the feedback page. The search term is not sent. A test checks that every pilot public text exists in both languages. |
| `e0a67eb` | Follow-up | `core-flows.spec.ts` still waited for « moins de 3 » on the patient page, where item 7 now shows « 1 ou 2 réponses ». I missed this in `a54efba`. |

Decisions recorded at the top of `docs/DECISIONS.md` (section "2026-11-26, session A"):

- the simulated-status banner and the shared text;
- the showcase lock, which reverses "the one-click pharmacies stay free for a live report" for showcase molecules only;
- one codebase, two sites, and why the guard is scoped as it is;
- feedback with no visitor identifier.

`CLAUDE.md` was not changed, so `AGENTS.md` needed no update. No new dependency.

## Checks

| Check | Result |
| --- | --- |
| `npm run check` (lint, type check, unit and database tests) | Green after every commit. **651 → 724 tests**, 58 → 68 files; no test removed. Lint shows no warnings. For pilot-1 item 5 the commit was chained with `;` and went in before the check finished. That first run crashed: 10 PGlite workers aborted natively under memory pressure while two servers were running. The rerun on the same tree was green. Every later commit was gated on the check's exit code. |
| Pilot mode (pilot-2 done check 1) | Production build with `NEXT_PUBLIC_APP_MODE=pilot`: <ul><li>pilot line on every page visited;</li><li>`/scenario`, `/vues` and `/vues/<id>` return 404;</li><li>no `name="role"` button and no link to `/scenario` or `/vues` in any page probed;</li><li>`/methode` and `/retour` return 200.</li></ul>The server-side refusal of demo sign-in is covered by `tests/demo-sign-in.test.ts`. |
| Demo mode unchanged apart from pilot-1 (done check 2) | `appMode()` is `demo` unless the variable is exactly `pilot` (tested), and every pilot-only path sits behind `isPilot()`. The screenshots of pilot-1 and of pilot-2 items 2, 3 and 5 were taken on the demo build. |
| Demo script guard (done check 3) | `tests/script-env.test.ts`: accepts only a listed URL (trailing slash, case and spaces ignored), nothing when `DEMO_SUPABASE_URL` is unset or empty, refuses the pilot before any client is made, and leaves the imports free. The test never loads `.env.local`. |
| Guide (done check 4) | `tests/onboarding.test.ts` (6) and the `signInToSpace` test. Screenshots of screens 1 and 3, and of « Plus ». |
| Feedback in the database (done check 5) | `tests/db/feedback.test.ts` against the real migrations in PGlite: <ul><li>anonymous save;</li><li>the organisation's origin when signed in;</li><li>refusals of an empty message, a message over 1,000 characters, and a path with an id or a query;</li><li>5 per hour per organisation, and the reset after an hour;</li><li>200 per hour anonymous;</li><li>`anon` and signed-in users cannot read, write or change the table directly; the service role reads it.</li></ul>`tests/db/grants.test.ts` updated. |
| Zero-recipient page and no-result search, French and Arabic, 360 px (done check 6) | `tests/request-page.test.ts` renders the page in both languages. Screenshots below. |
| Lighthouse accessibility | 100 on `/connexion/pharmacie`, `/avis`, `/medicaments` and `/scenario` (demo build, Lighthouse mobile emulation). One informational audit, `label-content-name-mismatch`, flags the public header's logo link (`aria-label="RuptureWatch TN, accueil du site"`). That link predates this session, so I left it. |
| Screen review | Every changed screen was captured at 360 and 1280 px (Arabic too for public screens), and I looked at each image before committing. I read the ux-audit checklist at the start but did not run it as a separate scored pass for each item. |
| e2e (`test:e2e`) | Not run (forbidden: it writes to a live database). Spec changes are listed under "Manual steps". |
| Vercel preview | Not checked by me (no `vercel`). |

## Screenshots

In `docs/reports/pilot-a/`, each at 360 and 1280 px:

- `1-simulated-banner/`: LEVETIRACETAM status (French, Arabic), `/vues` public panel, Open Graph card.
- `2-invitation/`: `/coordination/invitation`, `/ordre/invitation` as demo roles.
- `3-showcase/`: pharmacy home, a showcase medicine page, Signaler search and the locked showcase row.
- `4-doors/`: the three doors.
- `5-dev-pages/`: `/methode`, `/status`.
- `6-rule-names/`: `/methode`, a prescriber « Pourquoi ? ».
- `7-small-bugs/`: coordination figures, pharmacy tab bar, report result, scenario line.
- `p2-1-pilot-mode/`: pilot home, pharmacy door in pilot mode, `/prescripteurs` in pilot mode.
- `p2-2-guide/`: home hint, guide screens 1 and 3, « Plus ».
- `p2-3-feedback/`: `/avis` (French, Arabic), the sent state, `/pharmacie/avis`.
- `p2-4-no-recipient/`: the pilot request form (French, Arabic), and the request page with no recipient (`demande-sans-pharmacie*`). Creating a real request would have written a row to the live demo database. So that page was rendered from its component with the test's mocked data, then shown inside the served public shell with scripts removed. The styles and fonts are the real ones.
- `p2-5-search/`: no-result search (French, Arabic).

`scripts/screenshots.ts` has new named shots for these screens (`--only <name>`).

## Migrations to apply

| File | Schema version | What it adds |
| --- | --- | --- |
| `supabase/migrations/20261126000000_feedback.sql` | 25 | Enum `feedback_rating`, table `feedback` (RLS on, no policy, nothing granted to `anon` or `authenticated`, all to `service_role`), and function `submit_feedback(text, feedback_rating, text)`, `security definer`, `search_path = ''`, executable by `anon` and `authenticated`. |

Not applied by me. Until it is applied, sending feedback shows « Le message n’a pas pu être envoyé. Réessayez. » (`erreur=1`); the rest of the site does not depend on it.

## Manual steps for the lead

1. **Apply the migration** to the demo database (`npm run db:push`), then open the Vercel preview.
2. **e2e against the preview** (`E2E_BASE_URL` = preview, plus the protection bypass if needed). The spec changed twice, with `tests/e2e/README.md` updated:
   - test 1 picks a non-showcase medicine (`a:not([data-showcase])`), because showcase rows are locked for the demo pharmacies;
   - the patient flow waits for « 1 ou 2 réponses » instead of « moins de 3 ».
3. **Rotate `TESTER_INVITE_CODE`** on Vercel (Production and Preview); it was visible in the demo until this branch.
4. **Add `DEMO_SUPABASE_URL=<the demo project URL>` to `.env.local`** before Friday's reset. Without it, `seed:demo`, `demo:*` and `verify:clean` now refuse to run.
5. **Friday morning:** `npm run demo:reset -- --since <time of last clean>`. It also clears a simulated « Sous surveillance » on CARBAMAZEPINE, left on the live demo database by earlier reports. The hint strip now uses CARBAMAZEPINE as its "no signal" example.
6. **`NEXT_PUBLIC_APP_MODE` is inlined at build time.** Setting or changing it on Vercel needs a redeploy.
7. **Pilot site checklist** (pilot-2 §1, not done by me):
   1. Supabase: new project, EU region. Auth → URL configuration: site URL = the pilot address.
   2. Pilot database: `npm run db:push` (migrations from scratch), then `npm run catalogue:import -- --apply` and `npm run notices:import -- --apply`. No `seed:demo`, no `demo:*` (both now refuse anyway).
      - Every script loads `.env.local`, but variables already set in the shell win.
      - Set **all three** pilot values in the shell before these commands: `SUPABASE_DB_URL` (read by `db:push`), and `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (read by both imports).
      - **If only `SUPABASE_DB_URL` is set, the imports write to the demo database.**
      - In Git Bash, for example: `set -a; . ./.env.pilot; set +a`, then the commands, in that same shell.
   3. Vercel: new project, same repository, branch `main`.
      - Env vars: the pilot's Supabase URL, anon key, service role key and `SUPABASE_DB_URL`; `NEXT_PUBLIC_APP_MODE=pilot`; `NEXT_PUBLIC_SITE_URL` = the pilot address; new `DEVICE_HASH_SALT`, `CRON_SECRET` and `TESTER_INVITE_CODE`; the Google browser key and map ID.
      - Leave `DEMO_ACCOUNT_PASSWORD`, `DEMO_SUPABASE_URL` and `WHATSAPP_*` unset.
   4. Google key: add the pilot domain to its referrers.
   5. `.github/workflows/keepalive.yml`: add the pilot's health URL.
   6. Check `/api/health` on the pilot, then join from a phone with the invitation link: the guide should appear once, then land on `/pharmacie`.

## Open questions

1. **Demo guard scope.** The brief puts the guard in `serviceClient()`. But `catalogue:import` and `notices:import` use the same function and must run on the pilot. So the guard is an option (`demoOnly`), passed by `seed-demo`, `demo-clear`, `demo-national`, `demo-shortage` and `clean-verification` only. Tell me if any other script should be demo-only.
2. **Feedback origin.** Signed-in messages take the organisation's origin, so a demo account's message is `simulated`; anonymous messages are `tester`; never `official_source`. Should anonymous messages on the demo site be `simulated` instead? A juror trying the form is not a real tester.
3. **`/dev/*` pages** are hidden only when `VERCEL_ENV` is `production` at build time, so previews still show them. That is the brief's wording; say if previews should hide them too.
4. **Arabic history keys** (« خلال 90 يومًا ») stay non-plural: the number is fixed at 90, and that form is correct.
5. **Pre-existing, not touched:**
   - the Lighthouse note on the public logo link;
   - « Quand l'avez-vous commandé ? » in the reporting flow uses a normal space before « ? », so the mark can wrap to the start of a line at 360 px (new strings use a non-breaking space).
6. **Stacked honesty signals** on a simulated public status: the banner, the « Simulé » origin badge and the not-official line. All three are required (brief item 1, rules 4 and 8), so I kept them; it reads heavy at 360 px.
