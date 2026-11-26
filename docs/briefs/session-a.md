# Session A: trust fixes, then pilot mode

Branch `pilot-a`. One Claude Code session. Contents: (1) before starting, (2) the prompt to paste, (3) the shared plan and guardrails, (4) brief pilot-1, (5) brief pilot-2, (6) after.

## 1. Before starting (team lead, in the AOTN folder)

```
git switch main
git pull
git add docs/briefs docs/field .claude/skills .ux-profile.md .gitignore
git commit -m "Pilot briefs, field protocol, UX skills and profile"
git push
git switch -c pilot-a
claude --permission-mode acceptEdits
```

`.claude/settings.local.json` is already in place: Claude Code may edit files, run the checks, commit, and push `pilot-*` branches alone; it cannot touch the live database, Vercel, Supabase, `main`, or `.env.local`. The UX skills are in `.claude/skills/` (VectorLab UI/UX skills, MIT, plus the project skills `rw-design-system` and `rw-screen-review`), and `.ux-profile.md` at the root is the profile they read.

## 2. Prompt to paste

> Read CLAUDE.md, AGENTS.md, DESIGN.md, .ux-profile.md and docs/briefs/session-a.md. You are on branch pilot-a. Carry out brief pilot-1, then brief pilot-2, item by item, without asking me for confirmation between items: one commit per numbered item, `npm run check` after each, following every guardrail in the plan section. For any item that changes a screen, follow the project skill rw-design-system and finish the item with rw-screen-review. If an item is unclear or would break a product rule, skip it, write the question in the report, and continue. Never run the commands the plan lists as forbidden. When everything is done, write docs/reports/pilot-a.md (what was done, checks run, screenshots at 360 and 1280 px of changed screens in docs/reports/pilot-a/, migrations to apply, manual steps for me, open questions), push with `git push -u origin pilot-a`, and open a pull request into main with `gh pr create`, listing the migrations and the manual steps.

## 3. Shared plan and guardrails

### Pilot plan: from a jury demo to something real pharmacists use

Written Wednesday 25 November, evening, after a review of the live site, the code, Olfa's branch and `codex/medicine-search-design`, and a second review of these briefs themselves. Read `CLAUDE.md` first: its product rules (section 2) apply to every line. `DESIGN.md` and `CLAUDE.md` §9 are the design authority; the top `DECISIONS.md` entry about a plum palette is out of date.

#### The goal

Put RuptureWatch in the hands of real pharmacists and real patients as soon as it is ready, and have them understand it without us next to them. The jury deliverables (link, 6-page report, 3-minute video; due Friday 27 November 23:59, submit at 20:00) come out of that work.

Priorities: **pharmacists**, then **patients**, then **Pharmacie centrale**, then polish for ministry, Ordre, hospital and wholesaler (no new features there).

#### Two Claude Code sessions, one branch each, in order

| Session | Branch | Briefs | Starts when |
| --- | --- | --- | --- |
| A | `pilot-a` | `pilot-1-trust-fixes.md`, then `pilot-2-pilot-environment.md` | Wednesday night |
| B | `pilot-b` | `pilot-3-product-reporting.md`, then `pilot-4-experience.md` | Thursday, after A is merged and its migration applied |

Sequential, not parallel: every brief touches `messages/fr/core.json`, the sign-in page and the pharmacy screens. Inside a session, one commit per numbered item, plain messages.

#### Step 0: done

`codex/medicine-search-design` was merged into `main` and deployed on 25 November. Everything below builds on it. `origin/olfa` is not merged: its reusable parts are ported in `pilot-4`; the globe, Three.js, its palette and its three fonts stay out.

#### What only the team lead does (Claude Code never does these)

- Merge pull requests. Apply migrations to the demo database (and later the pilot database) before checking a preview that needs them.
- Rotate `TESTER_INVITE_CODE` on Vercel after session A (Production and Preview).
- Create the pilot site (checklist in `pilot-2`).
- Google Maps: browser key restricted to both domains, map ID, daily quota caps.
- Friday morning: `npm run demo:reset -- --since <time of last clean>` on the demo database, then record the video.
- Recruit pharmacists, print QR codes, run the field protocol.

#### Commands Claude Code never runs

`npm run db:push`, `seed:demo`, `demo:*`, `verify:clean`, `catalogue:import`, `notices:import`, `library:import`, `test:e2e`, `test:live` (they write to a live database); `supabase`/`npx supabase`; `vercel`/`npx vercel`; `git push` to `main`, `git push --force`, `git reset --hard`, deleting a branch (including `olfa`); reading or printing `.env.local` or any secret; `npm audit fix --force`. These are also blocked in `.claude/settings.local.json`.

#### Guardrails for every brief (do not degrade what exists)

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

#### Timeline

- Wednesday night: step 0, session A, pull request.
- Thursday morning: lead merges A, applies its migration, rotates the code, creates the pilot site. First real pharmacists on the pilot as soon as it is live.
- Thursday: session B. **22:00 freeze** on the demo site.
- Friday: `demo:reset`, video in the morning, report in the afternoon with the exact tester numbers, submit at 20:00.
- Before 15 December: signal level per presentation, verified pharmacies, single-use invites, live WhatsApp, web push or another way to reach pharmacists, the business part.


## 4. Brief pilot-1

### Pilot 1: trust fixes and small bugs (session A, part 1)

Branch: `pilot-a`, from `main`. Read `CLAUDE.md`, `docs/briefs/pilot-0-overview.md` (guardrails), then this. Small, safe changes; one commit per item.

#### 1. A simulated status must not read as a real shortage

The public page of LEVETIRACETAM (a real antiepileptic) says « Rupture confirmée » from simulated data, and it can be shared to WhatsApp. Shared, that is the rumour the product exists to stop.

When the status shown on a public page is simulated (reuse `isSimulatedStatus()` from `lib/public/share.ts`):

- Above the status, a full-width banner in the strongest style the design allows: « Démonstration : ce niveau vient de données simulées. Il ne dit rien de la situation réelle de ce médicament. » (French and Arabic, `public.*` keys). Keep the status sentence below it, smaller: `tests/e2e/core-flows.spec.ts` and the video path still read « Rupture confirmée ».
- Keep the share feature (session 6 decision), but the banner sentence becomes the **first line** of the shared text and the headline of the Open Graph card (`lib/og/card.tsx`) for a simulated status. Add a test in `tests/share.test.ts`.
- On `/vues`, add the banner to the public panel only (`FourViewsPanels`); the page already carries its demo line.
- The unused keys `public.medicine.simulation` and `simulationNote` can go.
- `DECISIONS.md`: one line on the banner and the shared text.

Check: the LEVETIRACETAM page anonymously at 360 px; the shared text and `/medicaments/<id>/opengraph-image` start with « Démonstration ».

#### 2. The tester invite code is shown in a one-click demo

The one-click Ministry demo shows the real `TESTER_INVITE_CODE` at `/coordination/invitation` (and `/ordre/invitation`), so anyone can create tester pharmacies.

- Pass the signed-in organisation's origin from both invitation pages into `components/institutions/TesterInvitation.tsx`. When the origin is `simulated`: « Lien d'invitation masqué dans la démonstration. » and no QR code, no URL anywhere in the HTML.
- Pull request note for the lead: rotate `TESTER_INVITE_CODE` on Vercel. Until the pilot is live, the lead gives invitation links by hand.

#### 3. Jurors must not break the showcase, and the lead must be able to reset it

One juror reporting TAMOXIFENE from « Pharmacie démo A, Tunis » turns the "concentrated in Sfax, stays probable" demo into « confirmée » for everyone.

- Export one list of showcase molecules from the demo code (the `NATIONAL_MOLECULES` values plus `DEMO_SHORTAGE_MOLECULE`), and reuse it everywhere below and in `scripts/clean-verification.ts`. No second hand-typed list.
- For the two one-click demo pharmacies: showcase molecules appear in « Signaler » and « Mes médicaments » with a small « démonstration » tag and are not tappable for reporting (the medicine page still opens). The server actions for « non livré » and « livré à nouveau » refuse them too, and the WhatsApp path. The database insert policy is not changed in this brief (say so in the report).
- The hint strip's text points to a non-showcase molecule with no signal (for example CARBAMAZEPINE); keep its link (`tests/hints.test.ts`).
- Point jurors who want to see gate two to `/scenario`, which already shows it without writing anything.
- New npm script `demo:reset -- --since <ISO time>`: runs `verify:clean -- --since <time> --requests --apply`, then `demo:clear`, then `demo:shortage`, then `demo:national` (this order: `demo:national` needs the shortage seed). Never weaken the scripts' refusal checks. Document it in `scripts/` and in the report. Claude Code does not run it.
- `DECISIONS.md`: this reverses "the one-click pharmacies stay free for a live report during the demo" for showcase molecules only.

#### 4. Doors: the demo first

`app/(site)/connexion/[audience]/page.tsx` shows email and password first and the demo as a `quiet` button.

- `pharmacie`: two primary buttons first, « Pharmacie démo, Tunis » and « Pharmacie démo, Sfax » (role `pharmacie-sfax` exists), with one line: « Deux pharmacies de gouvernorats différents : essayez-les l'une après l'autre. » `grossiste`: its demo button first, primary.
- `institution`: the four demo buttons first, labels unchanged (e2e).
- The email and password form below, inside `<details><summary>J'ai un compte</summary>`. In pilot mode (`pilot-2`) the form is shown open and the demo buttons are not rendered.

#### 5. Developer pages out of the jury's way

- Remove « État du service » from `components/SiteChrome.tsx` (the only footer link). `/status` stays reachable by URL.
- `app/(public)/dev/carte` and `app/(site)/dev/search`: `notFound()` when `process.env.VERCEL_ENV === 'production'`. Do not delete them.
- `/status`: remove the sentence « Contour des gouvernorats, utilisé plus tard par la carte des signaux ». Keep the map's licence attribution if the map stays.

#### 6. No raw rule code on any screen

The labels already exist (`core.method.rules.<code>.name`, and the team sentences in `core.rules.<code>`). The leak is `components/LevelExplanation.tsx` line 16, which renders `<code>{rule}</code>`, plus any journal that prints the code. Show the label name instead. Do not edit `core.rules.*`. Extend the existing coverage in `tests/content.test.ts` if a journal path is not covered.

#### 7. Small bugs

- Pharmacy bottom bar at 375 px: labels overlap. Shorten the pharmacy tab label for requests to « Demandes » with a pharmacy-tab-specific key (do not change `core.nav.items.*`, shared with the sidebar). `pilot-4` rebuilds the bar.
- Coordination: the « Gouvernorats touchés » tile has a note keyed `core.ministry.governoratesNote` that reads « Pharmacies signalant sur {days} jours ». Fix the note to describe governorates. Do not invent a pharmacy figure.
- Patient answers page `/demandes/[id]`: when answers come back as `<3`, show « 1 ou 2 réponses » (the patient sees the named pharmacies right below). No migration; keep the suppressed « pharmacies interrogées » as is. Update `tests/db/availability.test.ts` only if it reads the page text (it should not).
- Pharmacy report result: the team sentence `core.rules.local_reports_below_threshold` appears three times. Show it once. Above it, one plain line from the result page's own keys: « Votre signalement est enregistré. Il faut le signalement d'une deuxième pharmacie pour passer à « Probable ». » (read the threshold from `params.ts`, singular/plural handled).
- Arabic plurals: « حُدّث قبل 8 ساعة » should be « 8 ساعات ». Add a small plural helper in `lib/i18n` with `Intl.PluralRules` and plural keys in both French and Arabic files (`tests/i18n.test.ts` requires the same keys). Use it for hours, days and pharmacies on public pages.
- `/scenario`: one line linking the fictional medicine to the showcase, inserting `DEMO_SHORTAGE_MOLECULE` (not typed): « Les mêmes règles s'appliquent à {molecule} dans les espaces de démonstration. »

#### Done checks (local `npm run dev` at 360 and 1280 px, then the preview)

1. LEVETIRACETAM public page: banner; shared text and OG card start with « Démonstration ».
2. Ministry demo invitation page: no code in the HTML.
3. Démo A sees showcase molecules tagged, cannot report them (server refuses); CARBAMAZEPINE reports fine.
4. `/connexion/pharmacie`: Tunis and Sfax demo buttons first, form folded.
5. No footer link to `/status`; `/dev/*` 404 in production.
6. No raw rule code anywhere.
7. Each bug above checked.
8. `npm run check` green, test count not lower than before.


## 5. Brief pilot-2

### Pilot 2: a pilot site real pharmacists can use alone (session A, part 2)

Branch: `pilot-a`, after `pilot-1`'s commits. Read `CLAUDE.md`, `docs/briefs/pilot-0-overview.md` (guardrails), then this.

#### Why

Real and simulated data share one database and one level per molecule. A real pharmacist reporting LEVETIRACETAM would be counted with 24 simulated pharmacies. Real testers need a site with the real catalogue and zero simulated rows, and a first visit they understand alone.

#### 1. One codebase, two sites: `NEXT_PUBLIC_APP_MODE`

- `NEXT_PUBLIC_APP_MODE` = `demo` | `pilot`, default `demo`, read in `lib/env.ts`, added to `.env.example`. The demo site does not change.
- In `pilot` mode:
  - `signInAsDemoRole` refuses on the server; no demo buttons on `/connexion` (form open), on `/scenario`'s role picker, on `/prescripteurs`.
  - `/vues` and `/scenario` return 404 (`/vues` needs `DEMO_ACCOUNT_PASSWORD`, unset on the pilot).
  - The home page leads with two doors: « Je suis pharmacien·ne » (sign-up by invitation, or sign-in) and « Je cherche un médicament ». `/retour` and `/methode` stay (real sourced data).
  - A thin line at the top of every page: « Pilote RuptureWatch : signalements réels de pharmacies testeuses. »
- Demo scripts guard: in `scripts/lib/script-env.ts` `serviceClient()`, accept only the demo project's URL (an allowlist from `DEMO_SUPABASE_URL`), so `seed:demo`, `demo:*` and `verify:clean` refuse on any other database. `verify:clean` deletes every tester pharmacy: it must never run on the pilot.
- Keep using `TESTER_INVITE_CODE` on the pilot (a new value, never shown in a demo space). Single-use invites wait until December.

##### Pilot site checklist for the lead (put it in the pull request; Claude Code does not do it)

1. Supabase: new project, EU region. Auth → URL configuration: site URL = the pilot address.
2. `SUPABASE_DB_URL` of the pilot in a separate local env file, then `npm run db:push` against it (migrations from scratch), then `npm run catalogue:import -- --apply` and `npm run notices:import -- --apply`. No `seed:demo`, no `demo:*`.
3. Vercel: new project, same repository, branch `main`. Env vars: the pilot's Supabase URL, anon key, service role key and `SUPABASE_DB_URL`; `NEXT_PUBLIC_APP_MODE=pilot`; `NEXT_PUBLIC_SITE_URL` = the pilot address; new `DEVICE_HASH_SALT`, `CRON_SECRET`, `TESTER_INVITE_CODE`; the Google browser key and map ID. Leave `DEMO_ACCOUNT_PASSWORD`, `DEMO_SUPABASE_URL` and `WHATSAPP_*` unset.
4. Google key: add the pilot domain to its referrers.
5. `.github/workflows/keepalive.yml`: add the pilot's health URL, so the free database does not pause.
6. Check `/api/health` on the pilot, then join from a phone with the invitation link.

#### 2. First visit, for a pharmacist alone

- After sign-up, three short screens, skippable, shown once (remembered in the browser), reopened from « Plus » → « Comment ça marche ». One sentence and one Lucide icon each:
  1. « Une commande n'arrive pas depuis plus de 3 jours ? Signalez-la en deux gestes. »
  2. « Quand plusieurs pharmacies signalent le même médicament, un niveau apparaît et tout le monde est prévenu. »
  3. « Des patients près de chez vous cherchent un médicament : répondez en un geste, et choisissez si votre pharmacie s'affiche. »
- Then the pharmacy lands on `/pharmacie` (pilot mode only; the demo keeps landing on `/pharmacie/signaler` for the video and e2e).
- Texts under `core.onboarding.*`.
- One line, once, after joining: « Gardez ce navigateur : votre accès est lié à ce téléphone et à ce navigateur. » For tester accounts, do not show the iPhone "add to home screen" hint (a home-screen app on iPhone has separate storage, so the tester would be signed out). Keep install help under « Plus » for other accounts.

#### 3. « Un problème ? Une idée ? »

- A link in the pharmacy « Plus » menu and in the public footer. Opens a short page: one textarea (max 1,000 characters), three optional choices « Facile » / « Pas clair » / « Ne marche pas ». Under the textarea: « N'écrivez ni nom ni numéro de patient. » Public texts under `public.*` (French and Arabic), pharmacy texts under `core.*`.
- Migration: table `feedback` (`id`, `created_at`, `path` (route pattern only, ids and query removed), `organisation_id` nullable, `rating` nullable, `message`, `origin`). Insert through a `security definer` function in the `public` schema with `search_path = ''`; rate-limited without storing any visitor identifier: 5 per hour per organisation when signed in, and a global cap of 200 per hour for anonymous visitors. No device hash (it would link feedback to patient requests). No select for `anon` or `authenticated`; the lead reads it in the Supabase dashboard. Add it to `tests/db/grants.test.ts` and test the rules in `tests/db/`.

#### 4. A patient where no pharmacy participates yet

On the pilot almost every request will reach no pharmacy. Today `/demandes/[id]` shows « 0 » pharmacies and « Gardez cette page ouverte » for three hours.

- When pharmacies asked = 0: replace the waiting state with « Aucune pharmacie participante dans ce gouvernorat pour l'instant. », a link « Voir les pharmacies ouvertes près de vous » (`/pharmacies`) and a link back to the medicine's status. French and Arabic.
- On the request form, under the governorate choice, one line: « RuptureWatch est en test : peu de pharmacies participent pour l'instant. » (pilot mode only).

#### 5. Search for a product outside the list

When the search finds nothing, add: « Ce médicament n'est peut-être pas dans la liste CNAM des médicaments remboursés. » and a link to the feedback page. French and Arabic.

#### Done checks

1. Locally with `NEXT_PUBLIC_APP_MODE=pilot`: no demo door, no demo role anywhere, `/vues` and `/scenario` 404, pilot line on every page, demo sign-in refused by the server.
2. With `demo`: the demo site unchanged apart from `pilot-1`.
3. Demo scripts refuse with a non-demo database URL (unit test on the guard).
4. Guide shown once after a tester joins, reopened from « Plus »; no iPhone install hint for testers.
5. Feedback saved through the function; `anon` cannot read the table (database tests).
6. Zero-recipient request page and no-result search text, in French and Arabic at 360 px.
7. `npm run check` green.


## 6. After the session (team lead)

1. Read `docs/reports/pilot-a.md` and the pull request. Open the Vercel preview (send the link to the reviewer chat).
2. Apply the session's migration (the `feedback` table) to the demo database. Run `npm run test:e2e` against the preview (`E2E_BASE_URL` = the preview link, plus the Vercel protection bypass if needed): pilot-1 blocks reports on showcase medicines, and e2e shows whether a test relied on that. Then merge into `main`.
3. Rotate `TESTER_INVITE_CODE` on Vercel (Production and Preview).
4. Create the pilot site with the checklist in pilot-2 §1 (can be done while session B runs).
