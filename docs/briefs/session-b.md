# Session B: product on reports, then one coherent interface

Branch `pilot-b`. One Claude Code session (a second one continues it if context runs out). Contents: (1) before starting, (2) the prompt to paste, (3) the shared plan and guardrails, (4) brief pilot-3, (5) brief pilot-4, (6) after.

## 1. Before starting (team lead)

Session A merged into `main`, its migration applied to the demo database. Then:

```
git switch main
git pull
git switch -c pilot-b
claude --permission-mode acceptEdits
```

`.claude/settings.local.json` is already in place: Claude Code may edit files, run the checks, commit, and push `pilot-*` branches alone; it cannot touch the live database, Vercel, Supabase, `main`, or `.env.local`. The UX skills are in `.claude/skills/` (VectorLab UI/UX skills, MIT, plus the project skills `rw-design-system` and `rw-screen-review`), and `.ux-profile.md` at the root is the profile they read.

## 2. Prompt to paste

> Read CLAUDE.md, AGENTS.md, DESIGN.md, .ux-profile.md, docs/briefs/session-b.md and docs/reports/pilot-a.md, then the project skills rw-design-system and rw-screen-review. You are on branch pilot-b. Carry out brief pilot-3, then brief pilot-4 in this order: steps 0, 1, 4, 3, 2, 5, 6. If the experimental view transition flag causes any problem, use the template.tsx fallback immediately instead of debugging it. Work without asking me for confirmation between items: one commit per item or step, `npm run check` after each, following every guardrail in the plan section. For pilot-4, use the skills listed in its "Skills to use" section while building, and end every step with rw-screen-review: take the screenshots, look at every image, run ux-audit, fix hard failures, look again, then commit. Each step must leave the site working; if time or context runs short, finish the current step cleanly, record where you stopped in the report, and stop. If an item is unclear or would break a product rule, skip it, write the question in the report, and continue. Never run the commands the plan lists as forbidden. When done, write docs/reports/pilot-b.md with screenshots at 360 and 1280 px in docs/reports/pilot-b/, push with `git push -u origin pilot-b`, and open a pull request into main with `gh pr create`, listing the migrations and the manual steps.

If the session runs out of context before the end, start a new one on the same branch with:

> Read CLAUDE.md, .ux-profile.md, docs/briefs/session-b.md, the skills rw-design-system and rw-screen-review, and docs/reports/pilot-b.md, and continue from the first item not marked done, with the same rules.

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


## 4. Brief pilot-3

### Pilot 3: say which product (session B, part 1)

Branch: `pilot-b`, from `main` after `pilot-a` is merged. Read `CLAUDE.md`, `docs/briefs/pilot-0-overview.md` (guardrails), `docs/reports/medicine-search-design.md`, then this.

#### Why

Shortages hit products: EPITAM syrup can be missing while EPITAM 500 mg tablets are fine. Pharmacists, wholesalers and the Pharmacie centrale think and order by product (`code_pct`). Today a report says only the molecule.

#### Scope: product on reports, level still per molecule

The level stays per molecule in `lib/signal/` (unchanged). The pharmacist says which product when they know it; professionals see which presentations are reported. The signal per presentation group (molecule + strength + form) is planned before 15 December, in a separate brief. Write this in `DECISIONS.md`.

**Already built, do not rebuild:** the patient request with the chosen product preselected and « toute marque » widening (`components/public/RequestForm.tsx`), the pharmacy seeing the product on a request (`components/pharmacy/RequestList.tsx`), `availability_requests.medicine_id`, the presentation helpers in `lib/public/presentation.ts`.

#### 1. The pharmacist picks the product, still in two taps

- Step 2 of « Signaler » (`/pharmacie/signaler/[id]`), above the four delay buttons: « Quelle présentation ? » as a compact list of the molecule's CNAM presentations (form picture, brand, label), preselected with the last product this pharmacy reported for this molecule, with a first choice « Plusieurs ou je ne sais pas ». Choosing a delay sends the report, as today: still two taps after the medicine is found.
- `reports.medicine_id` is stored when a product is chosen; it stays nullable (WhatsApp, seeds and existing tests insert without it). The server action checks the product belongs to the molecule. Add the same check to the database insert policy only if `tests/db/pharmacy-flow.test.ts` and `tests/db/access.test.ts` stay green; otherwise leave it in the action and say so.
- « Livré à nouveau » stays per molecule (the level is per molecule; a delivered tablet must not lift a syrup shortage at product level later).
- Keep the e2e selectors of the report flow (`choix-suivis` and the others in `tests/e2e/core-flows.spec.ts`); add, do not rename.

#### 2. Which presentations are reported

- Function `public.presentations_reported(p_molecule_id uuid)`, `security definer`, `search_path = ''`: for the last 14 days, per `medicine_id`, the label, brand and `app.shown_count(distinct pharmacies)`. Never an organisation. Callable by coordination, centrale and hospital roles. Grants test entry, database tests (no organisation returned, `<3` kept, `anon` and pharmacies refused).
- Shown under the level on the coordination panel and the centrale panel (rows with form picture, brand, label, count or `<3`), sorted by count.
- The pharmacy's own result screen: one line with the product it just reported, no counts of others (the session-5 decision keeps pharmacies out of counts).
- Public page, only when the level is « confirmée » on non-simulated data: « Présentations signalées » with product names only. A separate anonymous function gated on « confirmée », like `public_arrival`. In « Autres marques de la même molécule », a small « signalée » tag on those presentations.
- Seeds: add `medicine_id` to the simulated reports in `lib/demo/shortage.ts` and `lib/demo/national.ts` (choose real CNAM presentations of each molecule, spread over two or three), so the demo site shows the lists. Update `tests/db/demo-*` accordingly. The lead re-seeds with `demo:reset` on Friday.

#### Not now

The form picker for patients (« Sous quelle forme ? ») and any change to `create_availability_request`; following products; product-level « livré à nouveau »; changing the signal key; WhatsApp product choice.

#### Done checks

1. Démo A reports CARBAMAZEPINE with a chosen presentation in two taps; the row has `medicine_id`; « Plusieurs ou je ne sais pas » stores none.
2. After the lead applies the migration and re-seeds: the coordination and centrale panels for LEVETIRACETAM list presentations with counts or `<3`.
3. Database tests for the two functions; `npm run check` green; e2e selectors unchanged.


## 5. Brief pilot-4

### Pilot 4: one coherent, living interface (session B, part 2)

Branch: `pilot-b`, after `pilot-3`'s commits. Read `CLAUDE.md` (§4, §9), `DESIGN.md`, `docs/briefs/pilot-0-overview.md` (guardrails), then this. Versions: Next 16.4, React 19.3, Tailwind 4.3.

#### The problem

The colour tokens are respected, but the structure is not shared: seven header variants, three footers, four page shells with different widths and backgrounds (public pages are white, the others grey), two root layouts, `.panel`, `Panel` and hand-made cards side by side, five corner radii, 11 different `<h1>` styles, 17 pages that write their own `<h1>`, icons in ten sizes, motion timings from 180 ms to 1.2 s, nothing between pages. Only the home page holds together.

#### Keep

The current identity: cool neutrals, powder blue, petrol rail, primary `#235c76`, IBM Plex Sans and Mono, the Rw monogram, level colours with their shapes. The home page looks the same after this brief. No new palette, no new font, no Three.js.

#### Skills to use (installed in `.claude/skills/`, profile in `.ux-profile.md`)

- **Before each step:** read `.ux-profile.md` and the project skill `rw-design-system` (tokens, components, shells, transitions, text budget, never-list). It is the design authority for this brief, after `CLAUDE.md` and `DESIGN.md`.
- **While building**, load the skill for what you are touching: `page-patterns` (name the pattern of each page before changing its markup), `typography`, `spacing`, `colour-palette`, `viewports` (360 px first), `anti-slop`, `empty-states`, `loaders`, `motion`, `transitions`, `reduced-motion`, `verbs` and `labels` (French copy: verb-first buttons, visible labels), `errors`, `forms`, `keyboard`, `icon-buttons`, `surfaces`, `defaults`.
- **At the end of each step:** run `rw-screen-review` (screenshots at 360 and 1280 px in French and Arabic, look at every image, compare with the home page and a neighbour screen, run `ux-audit`, fix hard-rule failures, look again). Do not commit a step you have not looked at.
- Where a generic skill and this project disagree (for example a different motion token or a different aesthetic default), `CLAUDE.md`, `DESIGN.md`, `rw-design-system` and `.ux-profile.md` win.

#### Work in this order; each step leaves the site working

**Order: steps 0, 1, 4, 3, 2, 5, 6.** The pharmacy space and the report-result moment (step 4) come first: they are the key moment of the video. Step 2 (shells and page transitions) is the riskiest and helps the video least; if time runs out, it is the step to lose. Stop cleanly at the end of any step and say where you stopped. Steps 0, 1, 4, 3 are the must; 2, 5, 6 if time allows.

##### Step 0. Tokens (nothing should look different)

In `@theme` / `app/globals.css`:

- Type: display `clamp(2.5rem, 4.35vw, 4rem)` (home only); `title-1` 1.5rem (1.75rem from `sm`), line-height 1.15, 600, -0.02em; `title-2` 1.25rem/1.3, 600; `title-3` 1rem/1.4, 600; body 1rem/1.55; small 0.875rem/1.45; eyebrow 0.75rem Mono uppercase 0.06em; `figure` Mono 2rem/1, 500.
- Spacing on 4/8/12/16/24/32/48/64 px. Rows 12×16 px, panels 16 px (20 from `sm`).
- Radii: `--radius-sm` 6 px (inputs, buttons, badges), `--radius-md` 12 px (panels, pictures), `--radius-lg` 22 px (home chapters, the public status hero), `--radius-pill`.
- Motion (aligned with the `motion` skill): `--dur-instant` 100 ms, `--dur-fast` 150, `--dur-base` 200, `--dur-slow` 300; one documented exception `--dur-emph` 600 ms for a chart line drawing itself once (write it in `DECISIONS.md`). `--ease-out` `cubic-bezier(.2,.7,.2,1)` on enter, `--ease-exit` `cubic-bezier(.4,0,1,1)` on exit. Replace the scattered timings with these.
- Shell widths: `--shell-wide` 82rem, `--shell-narrow` 48rem, console 90rem.
- Reduced motion also covers view transitions: `@media (prefers-reduced-motion: reduce) { ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; } }`.
- Clean-up: delete the unused `components/home/HomeStage.tsx`; remove stale "plum" comments; replace the two off-token hex values in `globals.css`.

##### Step 1. Shared components (pages untouched)

In `components/ui/` or by extending the existing files, tokens only:

- `PageHeader`: optional eyebrow or meta line, `title-1`, one lead sentence (max 60ch), actions, optional back link, optional picture slot (`FormPicture` at 64–96 px). Replaces the 17 hand-written `<h1>`.
- `Section`: `title-2`, optional eyebrow (Mono uppercase label with a short rule, from Olfa's section rhythm), optional link on the right.
- `ListRow`: leading picture or icon (40–56 px), title, one meta line, a trailing level badge or chevron; at least 56 px tall; hairline separators; hover tints powder blue and the arrow moves 4 px. Replaces `MoleculeRow`, request rows, signal rows, `.home-role-link`.
- `Stat` / `StatRow`: Mono figure, label under it, `<3` kept, never animated (Olfa's `.counts` strip, re-skinned).
- `StatusCard`: the one panel per screen: powder blue, `--radius-md`, large `LevelBadge`, one sentence, origin badge, not-official line.
- `LevelBadge` sizes sm/md/lg. Shapes unchanged.
- `EmptyState` with a slot for a small drawing.
- `Tabs`: the underline style of `PublicNav` (2 px brand bar), state in the URL.
- `BottomBar`: one component for the public and pharmacy tabs; `main` gets `padding-bottom: calc(3.5rem + env(safe-area-inset-bottom))` (fixes the overlap at 375 px).
- `Journal`: dated rows with a dot and a connecting line, the level's shape inside the dot (ported from Olfa's change journal, `LandingNational.tsx` "changes" and `landing.css` `.changes`). Never colour alone.
- `Button`: move the seven hand-made buttons onto `buttonClass` (`PrintButton`, `WhatsAppLinkForm`, `SiteChrome` header button, wholesaler `DecisionForm`, `InstallHint`, coordination export, centrale), all 48 px. Add a `pill` shape used only for the main public and home actions.
- Icons: sizes 16, 20, 24; stroke 1.75 (2.25 when active).
- `FormPicture`: a soft powder-blue tinted square, drawing at 48–56 px in lists and 96 px in page headers. Same drawings (no redraw now). No product photos: a real brand's box next to a simulated level is a rumour, and the rights question is open (`docs/reports/medicine-search-design.md`).

##### Step 2. Shells and page transitions

- One header per family built from the same parts: wordmark, 56 px on phones and 64 px on desktop, `--page` background, gutters 16/24/32 px, `PageHeader` and the scales above.
  - Showcase pages (home, scenario, methode, retour, vues, connexion): `SiteHeader` adopts the home masthead's markup and links. The home page must look the same.
  - Public: keep the sticky header and bottom tabs; `PublicMain` gets the `--page` background (today white); `PublicFooter` loses its separate background.
  - Consoles: keep the petrol rail on desktop; one white mobile header for every role (logo mark, organisation name, origin badge, menu button for non-pharmacy roles) replacing the dark one.
- Page transitions. Check the current Next 16 and React 19.3 documentation first, then:
  - Within a root layout: React `<ViewTransition>` around the children of each shell's `<main>` (Next's `experimental.viewTransition` flag in `next.config.ts` if the docs still require it; one line in `DECISIONS.md`). Header, rail and bottom bar get a `view-transition-name` so they stay still. Old page fades out in `--dur-fast`, new page fades in rising 8 px in `--dur-base`. No sideways slides (right-to-left).
  - Shared elements: the product picture and title from a search row to the medicine page header (`product-<code_pct>`), the « Mes médicaments » row to `/pharmacie/molecule/[id]`, a coordination list row to its detail; the `LevelBadge` on the report result (`level-<moleculeId>`) may then replace step 4's CSS animation with a morph, only if it works on the first try. Names unique per page.
  - Between the two root layouts (`(site)` and `(public)`, a full load): `@view-transition { navigation: auto; }` and a named wordmark.
  - If the experimental flag causes any problem (build, type, runtime, a flicker, a broken back button), switch immediately to the fallback, without debugging it: a `template.tsx` per family with an enter-only fade-and-rise. Say so in the report.

##### Step 3. Patient screens (convert one at a time)

Search → medicine page → request → answers → pharmacies near me → past shortages. With `PageHeader`, `ListRow`, `StatusCard`, `Section`, half the visible words (details behind « Pourquoi ? » or `<details>`), one honesty signal per status (origin badge, plus the not-official line once). Answers page: a new answer slides into the list and its pin drops on the map. Arabic checked at 360 px on every converted screen.

##### Step 4. Pharmacy space

- `/pharmacie` is already the home (report button, open requests, followed medicines, level watcher). Rework it in place as « Aujourd'hui », in this order: patient requests waiting (answer in one tap from here), « Vos médicaments » with levels (changed ones first, « nouveau » since the last visit, a « avis étranger » tag when a foreign notice exists), then a large « Signaler une commande non livrée ». The demo still lands on `/pharmacie/signaler`; testers land here (`pilot-2`).
- Bottom bar: Accueil · Signaler · Demandes · Plus, with pharmacy-specific keys.
- Report result: the check, then « Avant → Après » revealed in sequence (Olfa's staggered callout), and the new level badge fading and scaling in from the old one, all in plain CSS (step 4 runs before step 2, so no view transitions here). This is the video's key moment.
- A new patient request while the page is open: a toast and a single pulse on the « Demandes » badge (the page polls; there is no realtime for requests).
- Every screen readable in three seconds at a counter: one title, one action.

##### Step 5. Pharmacie centrale, then coordination

- Centrale: `StatRow`, presentations reported (`pilot-3`), the arrival announcement as one compact block. Keep `#m-<id>` anchors and the « Annoncer un arrivage » / « Annoncer l'arrivage » labels (e2e).
- Coordination: first screen = `StatRow`, map, signal list; the rest under `Tabs` « Signaux », « Demande des patients », « Journal » with the tab in the URL. Keep `section[aria-labelledby="signaux"]` and the `?m=<id>#detail` links. Use `Journal` for level history.

##### Step 6. Scenario, then Ordre, hospital, wholesaler

- `/scenario`: a stepper driven by Olfa's `tourStops()` (port `lib/landing/tour.ts` and its test from `origin/olfa` with `git show`), her stepper rail re-skinned (petrol, `--scenario-accent`, `LevelShape`, no glow), her step-curve level chart with `var(--level-*)` instead of hard-coded colours, drawn once.
- Ordre, hospital, wholesaler: shells, `PageHeader`, `ListRow`, buttons. No new features.

#### Motion rules (all steps)

Animate only transform and opacity (and background colour for a highlight); at most 12 px of movement; only real state changes; one animated element per interaction; nothing loops except a single pulse on a live change; no animated counters; no scroll hijacking; under reduced motion, nothing or a short opacity fade.

#### Not taken from `origin/olfa`

The globe and Three.js, its palette and three fonts, the glass nav, glows, gradient text, marquee, magnetic/tilt/spotlight effects, count-up figures, looping phone demos, blur reveals, its `.panel` override and link-underline removal.

#### Done checks per step

`npm run check` green; screenshots at 360 and 1280 px of every changed screen in `docs/reports/pilot-b/`; right-to-left checked on public screens; reduced motion checked; Lighthouse accessibility still 100 where it was; e2e selectors untouched or updated in the same commit and listed.


## 6. After the session (team lead)

1. Read `docs/reports/pilot-b.md` and the pull request; send the preview link to the reviewer chat.
2. Apply pilot-3's migration (the two presentation functions) to the demo database.
3. **Safety net before merging:** run `npm run test:e2e` against the preview (`E2E_BASE_URL` = the preview link, plus the Vercel protection bypass if previews are protected; the tests leave demo rows that Friday's `demo:reset` removes), and click through the report flow yourself on a phone: Pharmacie démo A → Signaler → a non-showcase medicine → a presentation → a delay → result. If it fails and cannot be fixed by 22:00, do not merge: record the video from `main`.
4. Merge.
5. Thursday 22:00: freeze. Friday morning: `npm run demo:reset -- --since <time>` on the demo database, check the showcase, record the video.
6. Apply all migrations to the pilot database too.
