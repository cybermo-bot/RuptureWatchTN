# Decisions

Newest first. Each entry: what was decided, and why.

## 2026-11-26, session B (branch `pilot-b`)

### The scenario's stepper rail and level chart; the wholesaler's decisions as rows (pilot-4, step 6)

- `lib/landing/tour.ts` and its test are ported from `origin/olfa` (`git show`). The test's message check now reads `core.rules`, because this branch has no `core.landing` texts. `tourStops()` gives six stops: the start, the foreign notice (J0), the first report (J2), the step where one governorate is not enough (J4), « confirmée » (J5) and the stand-down (J22).
- On `/scenario` they drive `StopRail`, which replaces the coloured band (`StateTimeline`, removed):
  - one 48 px node per stop, the level's shape inside;
  - `--scenario-accent` for the walked path and the current stop, on petrol, with no glow;
  - stops still to come show an empty ring and no level, as the band did.
  - A node jumps to its step. Play, the arrow keys, `data-step` and `data-done` are unchanged, so e2e test 3 still holds.
- `LevelStepChart` is Olfa's step curve in `var(--level-*)`, with no gradient, glow or drawing animation. It is one chart, shown up to the step on screen; the steps still to come stay empty, like the rail. It uses percentage coordinates, so its labels keep their size at 360 px. Each row carries its level's shape and word, and the change list under it is the text version.
- Ordre and hospital already used the console shell, `PageHeader` and `Button`. The Ordre's lists are tables of counts, which stay tables. The wholesaler's « Vos dernières décisions » moves to `List`/`ListRow` (one tappable row per decision, with date, outcome and origin). No new feature.

### Coordination in tabs; the centrale with key figures (pilot-4, step 5)

- Coordination: the figures, the map and the recent changes stay on the first screen; below them `Tabs` « Signaux » (the default: the list, `section[aria-labelledby="signaux"]`, and the selected medicine's detail, `?m=<id>#detail` unchanged), « Demande des patients » (the national demand chart, moved out of « À examiner », and the selected medicine's demand by governorate) and « Journal » (the decision log). The tab is `?vue=` in the URL, keeping the selection; « Voir le journal » links to `?vue=journal#journal-decisions`. The other users of `SignalsDashboard` (hospital) get no tabs and see everything as before.
- The level history (« Historique des niveaux ») is drawn with `Journal`: dated rows, the new level's shape in each dot, a connecting line, the change in words.
- Centrale: a `StatRow` over the list, computed from it (medicines at each level, with the level's shape and word, and arrivals announced). The `#m-<id>` anchors and the « Annoncer un arrivage » / « Annoncer l'arrivage » labels are unchanged.

### Page transitions use the fallback; shells share one header style (pilot-4, step 2)

- **Fallback, not React `<ViewTransition>`.** React 19.3 ships `ViewTransition` and Next 16.4 needs no flag, but its own guide says enter and exit never fire for a wrapper in a layout, and a layout-level wrapper animates every `router.refresh()`: « Aujourd'hui » and the answers page refresh every 10–15 s and would fade each time. The brief says to switch at the first such problem. A family `template.tsx` only remounts when its own child segment changes (Next docs: deeper navigations do not remount higher templates), so the fallback is one `PageEnter` in each shell (public layout, `SiteMain`, the console's `<main>`), keyed on the path: the new page fades in rising 8 px (`--dur-base`, enter easing, fill `backwards` so fixed toasts are never held in a transformed box). No animation on the first page, on a refresh or on a query change. Header, rail and bottom bar sit outside it and stay still.
- Between the two root layouts (a full load): `@view-transition { navigation: auto; }`, the old page out in `--dur-fast`, the new in `--dur-base`, the header wordmark named `wordmark` (the home's second wordmark is not named: a name must be unique on a page). Reduced motion stops both.
- Not done: the shared-element morphs (`product-<code_pct>`, the medicine row, the coordination row, the level badge); they need `<ViewTransition>` pairs and prefetched pages, and the search rows are not prefetched.
- Shells: public pages sit on `--page` with a footer without its own background; every console role gets the same white phone header (mark, organisation, origin badge, then « Menu » for roles other than the pharmacy), replacing the dark one. `SiteHeader` was not rebuilt from the home masthead (the home must not move); it keeps its markup.

### Patient screens on the shared parts (pilot-4, step 3)

- Search, medicine, request, answers and past shortages use `PageHeader` (back link, picture, `title-1`), `RowLink` rows and `Section`. The search loses its panel; the medicine status is the screen's one powder-blue card (`--radius-lg`, the public status hero); the answers page's request state is its one card, and the answers a hairline list.
- Fewer words on the status card: « Ce signal regroupe les signalements par molécule… » moved into « Détails du signal », now always present. The « Démonstration » band stays (pilot-1 item 1): it is about the whole page, the origin badge about the status.
- A patient's answer is new when it is less than 15 s old (the page refreshes every 10 s): computed on the server from `answered_at`, so a list row slides in and its pin drops on both maps (Google and OpenStreetMap) without any client state. An older answer, or one already shown, never moves.

### The pharmacy home becomes « Aujourd'hui »; the result's actions return to the page (pilot-4, step 4)

- `/pharmacie` shows, in order, the patients waiting (the first two answered in one tap from there, the rest on « Demandes »), « Vos médicaments », then the large report button. Medicines with a level, an active foreign notice or an unread alert come first; the ones with no signal fold behind « N médicaments sans signal ». A foreign notice is a tag (« avis étranger »), never a higher place than the level gives.
- « nouveau » means an alert this pharmacy has not opened yet (`alerts.read_at` is null); it clears under Plus › Alertes. A per-device "last visit" would have marked the same change new again on another phone.
- Bottom bar: Accueil · Signaler · Demandes · Plus (keys `core.pharmacy.tabs.*`); the sidebar starts with « Aujourd'hui ». The home rows lost their `aria-label`, which hid the level from screen readers behind « Ouvrir la fiche de … ».
- **Reversed (session 6):** the report result's two buttons were fixed above the tab bar "in reach of the thumb". With the tab bar they repeated « Accueil » and « Signaler » and covered 40 % of a 360 × 800 screen, so they sit at the end of the page now.
- The result moment is plain CSS (`rw-check`, `rw-step`, `rw-level-in`): the check pops in, « Avant → Après » rises 8 px, 30 ms apart, and the new level fades and scales in. A new request while « Aujourd'hui » is open (it polls every 15 s) shows a toast and pulses the « Demandes » badge once. Reduced motion also cancels animation delays now, so nothing waits hidden.

### One set of scales: type, radii, motion, shells (pilot-4, step 0)

- Tokens in `app/globals.css` (`@theme static`, so CSS and components read the same variables): `title-1/2/3`, `eyebrow` and `figure` utilities, body 1rem/1.55 and small 0.875rem/1.45; radii `--radius-sm` 6 px, `--radius-md` 12 px, `--radius-lg` 22 px, `--radius-pill`; motion `--dur-instant` 100, `--dur-fast` 150, `--dur-base` 200, `--dur-slow` 300 ms, `--ease-out` (enter) and `--ease-exit` (exit); shells `--shell-wide` 82rem, `--shell-narrow` 48rem, `--shell-console` 90rem. Spacing stays on the 4 px grid.
- **One timing exception, `--dur-emph` 600 ms:** a chart line or bar drawing itself once (`rw-grow`). A drawing shorter than that reads as a jump, not as a trend arriving. Nothing else may use it.
- Radius classes were renamed so their pixels stay put (`rounded-md` 6 px became `rounded-sm`, `rounded-xl` 12 px became `rounded-md`); the two odd radii joined the scale (4 px badges now 6 px, 8 px boxes now 12 px). The single highlights (`rw-pulse-*`, the scenario's stage pulse) went from 0.9–1.2 s to `--dur-slow`; the hover transitions from 180 ms to the tokens. Reduced motion now also stops view transitions.
- The plum-palette note further down this file is out of date: the stage is petrol (`--stage`), and the comments saying "plum" were corrected.

### Reports name the product; the level stays per molecule (pilot-3)

- Shortages hit products (EPITAM syrup missing, EPITAM 500 mg tablets fine), and professionals order by `code_pct`. Step 2 of « Signaler » now asks « Quelle présentation ? » above the delay buttons, preselected with the last product this pharmacy reported for the molecule, or « Plusieurs ou je ne sais pas ». A delay button still sends the report: two taps after the medicine is found.
- `reports.medicine_id` (already in the schema, nullable) is stored when a product is chosen. The server action and the insert policy (migration `20261126010000_report_medicine.sql`) both require it to be a presentation of the reported molecule; `tests/db/pharmacy-flow.test.ts` and `tests/db/access.test.ts` stayed green with the policy, so it stays in the database.
- Which presentations are reported (migration `20261126020000_presentations_reported.sql`): `presentations_reported` gives the coordination unit, the centrale and hospitals each product named on a « non livré » report in the last 14 days, with its distinct pharmacies (`<3` below 3, and the `<3` rows keep the catalogue order so their order never tells 1 from 2), never an organisation. Pharmacies stay out of counts (session 5): their result screen names only the product they just reported. The public page lists product names only, and only while the level is « confirmée » on non-simulated data (`presentations_reported_public`, gated like `public_arrival`), so the demo site never shows it publicly. The « signalée » tag is a word, with no level shape: the level belongs to the molecule.
- The demo seeds name real CNAM presentations (`lib/demo/presentations.ts`, two or three per molecule, looked up by `code_pct` within the molecule) so the professional panels show the lists after `demo:reset`.
- The signal is unchanged: `lib/signal/` still keys on the molecule, and « Livré à nouveau » stays per molecule. A signal per presentation group (molecule + strength + form) is planned before 15 December in a separate brief. WhatsApp reports, the seeds and the molecule page's own report form still insert without a product.

## 2026-11-26, session A (branch `pilot-a`)

### « Un problème ? Une idée ? » keeps no visitor identifier (pilot-2, item 3)

- Table `feedback`, written only through `submit_feedback` (security definer, `search_path = ''`), read only by the service role (the lead, in the dashboard). The path is a route pattern: the server replaces every segment that is not a plain lowercase word by `[id]` and drops the query, and the database refuses any other shape, so no medicine id, request id or invitation code is stored. Rate limits use no identifier: 5 messages per hour per organisation when signed in, 200 per hour for all anonymous visitors together (an advisory lock makes the count exact under parallel calls).
- Origin: the organisation's own origin when signed in, as for reports (a demo account's message is `simulated`, its organisation says which); `tester` for an anonymous visitor, a real person trying the prototype; never `official_source`.

### One codebase, two sites: `NEXT_PUBLIC_APP_MODE` (pilot-2, item 1)

- `demo` (the default) is the jury's site, unchanged. `pilot` is the site real tester pharmacies use, on its own Supabase project with the real catalogue and no simulated row: `signInAsDemoRole` refuses on the server, no demo button anywhere (`/connexion` opens the form of real accounts, `/prescripteurs` says the view is not open yet), `/scenario` and `/vues` answer 404 and leave the « Comprendre » links, the home page leads with two doors (« Je suis pharmacien·ne », « Je cherche un médicament ») and keeps the directory, the replay and the method, and a thin petrol line at the top of every page reads « Pilote RuptureWatch : signalements réels de pharmacies testeuses. » Why: real and simulated reports share one level per molecule; a real report of LEVETIRACETAM on the demo database would be counted with 24 simulated pharmacies.
- The mode is read at build time (a `NEXT_PUBLIC_` value is inlined), so changing it on Vercel needs a redeploy.
- The demo-script guard is narrower than the brief's wording: the brief puts the allowlist in `serviceClient()`, but `catalogue:import` and `notices:import` use the same function and the pilot checklist runs them on the pilot database. So `serviceClient({ demoOnly: true })` checks `NEXT_PUBLIC_SUPABASE_URL` against `DEMO_SUPABASE_URL`, and only `seed:demo`, `demo:clear`, `demo:shortage`, `demo:national` and `verify:clean` (through `demo:reset` too) ask for it. With `DEMO_SUPABASE_URL` unset, they refuse everywhere: the lead adds the demo project's URL to `.env.local` before Friday's `demo:reset`.

### The one-click pharmacies cannot report the showcase medicines (pilot-1, item 3)

- Reverses "the one-click pharmacies stay free for a live report during the demo", for the showcase medicines only: LEVETIRACETAM and the four national situations, one list in `lib/demo/showcase.ts` (`SHOWCASE_MOLECULES`), read by the pharmacy screens, the report actions, the WhatsApp bot and `scripts/clean-verification.ts`. Why: one juror reporting TAMOXIFENE from « Pharmacie démo A, Tunis » turned "concentrated in Sfax, stays probable" into « confirmée » for every visitor. The rows are tagged « démonstration » and open the medicine page; « non livré » and « livré à nouveau » are refused on the server, and the bot offers no delay list. Every other medicine stays free to report; the hint now names CARBAMAZEPINE. Gate two is shown without writing anything in `/scenario`, which the refusal links to.
- The database insert policy on `reports` is unchanged: a direct insert with a demo account's session is still possible. The lead's `npm run demo:reset -- --since <time>` (clean, clear, shortage, national, in that order) restores the picture.

### A simulated public status says « Démonstration » first (pilot-1, item 1)

- Reverses session 6's "« Simulation » sits in the heading block": when the status shown on a public page rests on simulated data (`isSimulatedStatus()`), a full-width petrol band above it reads « Démonstration : ce niveau vient de données simulées. Il ne dit rien de la situation réelle de ce médicament. », and the status sentence below it is set smaller. The same sentence is the first line of the shared text, of the page description and the headline of the share card, replacing the « Simulé : … » line. Why: LEVETIRACETAM is a real antiepileptic; a simulated « Rupture confirmée » shared to WhatsApp out of context is the rumour the product exists to stop. On `/vues` only the public panel carries it, as the visitor would see it. The share feature stays (session 6).

## 2026-11-24, session 6

### Visual direction: plum stage, lavender paper, violet action, citron accent (part 6, branch `ui-refresh`)

- The handoff's palette replaces the green-and-ink one, and CLAUDE.md §9 and AGENTS.md are rewritten to match. Why: the home page gave its first screen to a map and a list and the scenario sat below the roles; the jury opens `/` cold and must find the scenario in five seconds. The scenario is now the stage, and the national picture and roles come after it.
- Where colour goes: plum and citron only on `/` and `/scenario`. The consoles keep a plum rail (the old dark sidebar's role), lavender paper and white panels, and violet only for action, selection or a meaningful state. Citron is used for two things only: the primary launch button on the home stage and the current position on the scenario timeline.
- Contrast, checked with the WCAG formula: ink 16.7:1 and secondary ink 6.6:1 on white (5.4:1 on the subtle band); white on violet 7.8:1; the four level colours 5.5:1 or more on the lavender page; text on plum 15.5:1 and secondary text on plum 10.5:1; plum on citron 13.9:1. On plum the levels use lighter tints (`--level-*-on-stage`, 7.7:1 or more on the stage), always with their shape and word. The focus ring turns citron on plum. `--line` is a hairline, not text, so it carries no contrast requirement.
- The home stage and the scenario share one component, `StateTimeline`: one segment per step coloured by its level up to the selected step, blank afterwards (the outcome is not given away), changes annotated with their day and shape. The home shows a frozen moment, the step where the scenario reaches "confirmée", computed from `scenarioFrames()` at render. Nothing is hardcoded.
- Scenario: manual playback by default. Play, previous, next and restart sit together, with the step as text and a "Raccourcis" line; left and right arrows step, Space plays or pauses (part 8 item 9 done here, since the controls were rebuilt). "Qui peut agir ?" reads the same actors table as the playbook (`lib/playbooks/actors.ts`, moved out of the LEVETIRACETAM file so both share it). "Ce qui manque" shows exact counts there, because the scenario is fictional.
- Pharmacy: the install help moved under "Plus" (it crowded the work on the first screen). The result screen reads "Signalement reçu", "Ce que votre signalement a changé", "Prochaine action". The animated count-up on that screen is removed (the guardrails forbid animated counters); the figure is plain, with its unit. The 72-hour rule is stated at the timing choice, its number read from `params.ts`.
- "Simulation" sits in the heading block of the public medicine page when the shown status or arrival is simulated, and of the wholesaler split page when the level is (the needs by governorate there are always demonstration data, and the heading says so).

### The home page shows only simulated signals, as the national unit's view (part 8, item 1)

- The home page is public, and it listed every medicine with a level, "probable" and "sous surveillance" included: rule 10 forbids that for real data. The national picture is now framed as what the national unit sees in the demonstration: title "Ce que voit la cellule nationale", the line "Démonstration · données simulées" beside it, one sentence saying the public only ever sees a confirmed shortage. `loadNationalPicture()` keeps only signals whose evidence is entirely simulated (`isDemonstrationSignal`, tested): a signal with any tester or official evidence never appears there, at any level. Done before the visual pass (part 6), so the `ui-refresh` branch starts from it.

### Hint strip per role (part 8, item 2)

- A demo account's space opens with one line, "Essayez : ...", the first thing to try there (`lib/demo/hints.ts`, `components/console/HintStrip.tsx`). Why: a jury clicks around without instructions; this is their instruction. Only for organisations whose origin is `simulated`: a tester or a real member never sees it. A hint whose action is on another page links to it and hides on that page; the wholesaler's links to the split panel of the medicine selected by default.
- Dismissal is kept in the browser only (`localStorage`), never sent. Until the browser answers, nothing is drawn, so a dismissed hint never flashes back; the cost is that the strip appears just after the first paint.

### "Ouvrir sur votre téléphone" (part 8, item 3)

- On the home page, desktop only, a QR code to `/medicaments` sits beside the public tiles, so a judge on a laptop tries the patient side on their phone. Drawn on the server by `qrcode`, the library the tester invitation already uses (entry of session 2): no new dependency. `lib/qr.ts` holds the helper; its dark modules take `currentColor`, so the code follows the design tokens. The link is built from the host that served the page, so a preview deployment points to itself.
- The invitation screens of the Ordre and the coordination already show the tester invitation link as a QR code (`TesterInvitation`); nothing to add there.

### Share a verified status (part 8, item 4)

- The public medicine page has "Partager ce statut": the phone's share sheet (Web Share API) where the browser offers it, otherwise a WhatsApp link and "Copier le lien". The fallback is drawn on the server, so the WhatsApp link works without JavaScript. The shared text is built on the server (`lib/public/share.ts`, tested): the page's own status sentence (never a level below "confirmée", rule 10), "Simulé : données de démonstration..." when the shown status rests on simulated data, and "Ceci n'est pas une déclaration officielle de rupture." Nothing about the visitor is shared or stored.
- The shared link is the production address (`siteUrl()`), not the host that served the page, so a link shared from a preview still opens the real site.
- Each medicine page has its own Open Graph card (`opengraph-image.tsx` beside the page, `medicineCard()` in `lib/og/card.tsx`): the medicine, its public status with the level's shape, the "Simulé" badge when it applies, the disclaimer. The page's Open Graph description carries the same lines. The card is in French: a link preview is fetched without the visitor's language. If the status cannot be read, the card says to check the page, never "Aucune rupture".

### "Comparer les cas" on the scenario page (part 7, handoff C)

- Under the scenario player, two named cases: "Signal réparti" and "Signal concentré". The same four fictional pharmacies report on the same days; only the governorate of the fourth changes (Sfax or Tunis). At day 4 the spread case reaches "confirmée" (`confirmed_threshold`) and the concentrated one stays "probable" (`single_governorate_cap`, gate two). The visitor can switch case at any step: the step stays, and a small table shows both levels at that step.
- The recovery is the same in both cases: on day 10 a wholesaler announces an arrival, an upstream event that is not an input of `evaluate()` and changes no level; on days 19 and 20 two Tunis pharmacies report the medicine delivered again, after the quiet period, and the level becomes "levée".
- `evaluate()` from `lib/signal`, in the browser, deterministic, nothing written (`lib/scenario/compare.ts`, tested against the acceptance: four in one governorate stay "probable", one moved confirms, only that report differs). "Ce qui manque" uses exact counts, as the cases are fictional. A line computes "à l'échelle d'un pilote" from the parameters (4 pharmacies up to 200 active members, then 2 %), and a link opens the threshold explorer on `/methode`. Its own module, so the ui-refresh changes to `lib/scenario/frames.ts` do not conflict.

### Ctrl+K in the consoles (part 8, item 10)

- In the ministry's, hospital's and wholesaler's consoles, Ctrl+K (Cmd+K on a Mac), or the "Aller à un médicament" button for touch screens, opens a native `<dialog>`: type a brand or a molecule, with or without accents. It reuses the catalogue search (`/api/medicines/search`: `search_molecules` and `search_medicines`, pg_trgm). The medicines with a level in this space match at once, before the catalogue answers.
- A medicine with a level here opens its panel; Enter opens the first one. A medicine without a level here is listed with "Aucun niveau ici" and is not a link, because the panel would fall back to another medicine. No new dependency (`lib/console/quick-search.ts`, tested).

### Skeleton loading (part 8, item 8)

- While a page loads its data, it shows its own shape in grey: the console (header, key figures, the list, the selected medicine) for every signed-in space, the app (main action, list) for the pharmacy, and on the patient's answers page the title, the two figures and the list, in French or Arabic. Next.js `loading.tsx` files, one shared component (`components/Skeleton.tsx`). A `loading.tsx` only shows when its own segment's child changes, so each space has one (the `(espace)` one alone covered entering a space, not moving between its pages: checked with a slowed navigation).
- A placeholder never shows a figure or a made-up text: grey bars only, hidden from screen readers, with one status line in words ("Chargement de la page…", "Chargement des réponses…"). The pulse is `motion-safe` only, so `prefers-reduced-motion` keeps the bars still.

### The last five level changes (part 8, item 7)

- A short feed, newest first, in the ministry's space (beside the national map) and in the home page's picture (under its map; after the medicine list on phones). Each row: the medicine, the change as shape and word, how long ago (exact time in the tooltip), the pharmacies and governorates over 14 days as the screens receive them, the rule id and the origin badges. It opens the medicine.
- Counts come from the event's evidence as `signal_events_view` returns it (`app.shown_evidence`): "Moins de 3 pharmacies" below 3, and then no number of governorates. Never a pharmacy (`lib/signals/recent.ts`, tested).
- On the home page the feed keeps item 1's frame: only changes whose evidence is entirely simulated, of medicines whose current signal is a demonstration signal, read through the demonstration coordination account. A change from tester or official data never appears there.

### A 90-day public status strip (part 8, item 6)

- The public medicine page shows the last 90 days as a band, with the same text list under it: only "Rupture confirmée", "Rupture levée" (after a confirmation) and "Aucune rupture confirmée". It reuses `LevelBand`, which now takes optional words (`text`), so the public page speaks French or Arabic and names its three public levels; the console keeps its default. The band and its axis are left to right in both languages (time runs left to right); the list follows the page's direction.
- The data comes from a new database function, `public_molecule_history` (migration 0024, applied), and not from `signal_events`, which the public cannot read. It maps each change to the public level, then keeps only the rows where the public level changes. So a change below "confirmée" leaves no trace, not even its time (rule 10; database tests, including a molecule that went through "sous surveillance" and "probable").

### "Mis à jour il y a …" (part 8, item 5)

- Beside a level, the time since the signal was last evaluated: on the public medicine page (under the status) and on the console's medicine panel (coordination, hospital, wholesaler). It reads `signals.updated_at`, which `apply_signal_evaluation` sets on every evaluation, the daily recompute (04:30 UTC) included; so it usually reads in hours, and that is the honest figure. Whole minutes, hours, days, rounded down (`lib/freshness.ts`, tested); the exact time is in the tooltip and the `<time>` element.
- The public page needed the time: migration 0023 adds `evaluated_at` to `public_molecule_status`, for a shown level only ("confirmée", or "levée" after one). Below "confirmée" it stays null, so the time never hints that a medicine has a signal the public may not see (rule 10; database test). Applied to the live project before the code that reads it.

### "Ce qui manque" beside a level (part 5)

- One line on the coordination, hospital (and wholesaler) medicine panel and the prescriber check says which condition is still missing for the next level: "Pour « Confirmée », il manque un deuxième gouvernorat.", "… des signalements d’autres pharmacies, jusqu’au seuil de « confirmée »", for "confirmée" what "levée" needs. Nothing at "levée".
- Computed by `missingForNextLevel()` (`lib/signals/missing.ts`) from the evaluator's own output: the level, the rule that fired and the evidence, against `DEFAULT_PARAMS` and `confirmPharmaciesNeeded()` from `lib/signal`. No threshold is typed there. Tests in `tests/missing.test.ts` run `evaluate()` and check the line against its result (four pharmacies in one governorate: only the second governorate is missing; moved to two governorates: the evaluator confirms).
- On real data the line names the condition and never prints a computed count of pharmacies (a test runs every small case and allows only days and design parameters). When the shown evidence reads "<3" "livré à nouveau" reports and the bar is 2, the count may already be enough: the line then says "s’il n’y en a pas encore assez" rather than claim it is missing. The scenario can pass `exact: true` and get exact counts.
- The confirm bar uses the floor (`confirmMinPharmacies`) on screens, where the active member count is not loaded; it only decides whether "more pharmacies" is listed, and no number is printed on real data.

### A draft playbook for LEVETIRACETAM (part 4)

- The playbook is a typed, versioned file in `lib/playbooks/` (`levetiracetam.ts`, version 0.1, status "Brouillon"), keyed by the exact CNAM molecule name. Its `signal` and `allocation` are the very objects `evaluate()` and `fairSplit()` use (`DEFAULT_PARAMS`, `ALLOCATION_PARAMS`), so a threshold changed in `params.ts` changes the playbook too; a test checks they are the same objects and that the file types no number besides its version and date. Its words are in `messages/fr/core.json` under `core.playbook`.
- It shows its scope (the molecule, every CNAM presentation together for now, the count read from the catalogue), when it triggers (from "probable", with the thresholds and both gates), the hospital reserve and the split rule, and who can act at each level. "Who can act" lists only what the platform lets each role do today (the split from "probable", an arrival announced at "probable" or "confirmée", the public status at "confirmée" and after, and so on).
- Three clauses wait for their reviewers, named by role only: "Priorité de continuité" (hospital pharmacy and a clinical reviewer), "Plafond de commande" (wholesaler and supply coordination), "Clause de substitution" (qualified clinical reviewers). Each says "En attente de validation" and has no content: we write none of it (rule 11). No signatory is named.
- Read at `/methode/protocoles/levetiracetam`, from a "Protocoles par médicament" section of `/methode`. "Voir le protocole appliqué" sits on the coordination and hospital medicine panel, the wholesaler's split (next to the decision) and the pharmacy's alert, for that molecule only. No event records a playbook version yet, so the link reads "Paramètres actuels" and the page opens with that notice. Recording the version with every event and decision, and the approval itself, need a migration: after the jury build.
- The page is public, like `/methode`: it shows rules and roles, never the medicine's current level, a count or a stock.

### Allocation comparison on the wholesaler's split page (part 3)

- The split page now shows the same stock shared two ways, side by side: "Répartition proportionnelle à l'usage", labelled "Modèle de référence" (a point of comparison, not a claim about any wholesaler's practice), and "Répartition selon les jours de couverture" (`fairSplit()`), labelled "Répartition proposée". The decision is recorded on the proposed split, as before; the action recomputes it on the server.
- `proportionalSplit()` (`lib/allocation/proportional.ts`, pure) follows the same rules as `fairSplit()`, shared through `stockAndReserve()` and `governorateNeeds()` in `split.ts`, not copied: the reserve first, no governorate above its need for the period, what nobody needs stays unallocated. A share above a need is capped and the surplus shared again in proportion. Whole boxes: rounded down, then the largest remainders, equal remainders by governorate code (input order never changes the result).
- The handoff's fixture figures are confirmed by the code: at 2,500 boxes, 250 reserved, 2,250 allocated under both, lowest cover after 11.0 days (reference) against 17.3 (proposed), from 2.0 before. "Stock nécessaire pour viser 14 jours": 1,604 boxes in all (160 reserve, 1,444 to share); 1,603 falls short. All in `tests/allocation-compare.test.ts`.
- Both splits are computed in the browser from the same pure functions, so typing a stock updates both at once; the URL keeps `?stock=`, `gouvernorats=tous`, `cible=`. Without JavaScript the GET forms and the link do the same through the server. The page opens on the 2,500-box example so a visitor sees a result at once.
- The range plot (before: open circle; reference: square; proposed: diamond, on one 0–30 day scale) is HTML, not a server-rendered SVG chart, because it moves as the stock is typed; the table under it carries the same values for screen readers. `CoverChart` is removed.

### The showcase's "confirmée" medicine is an antiepileptic: LEVETIRACETAM (part 2)

- Everything we submitted says the pilot starts with antiepileptics (Phase 2.2 names carbamazepine and levetiracetam); the national picture confirmed amlodipine. `DEMO_SHORTAGE_MOLECULE` is now `LEVETIRACETAM`: six brands on the CNAM list (Antiomal, Epilepta, Epitam, Epixx, Levet, Vetira), no report, notice, request or past episode of its own on the live project. The 23 simulated reports, 13 governorates, 8 patient requests and the applied wholesaler split are unchanged; only the molecule moved. The four other showcase medicines are unchanged.
- Not carbamazepine: it has a real past episode (Tégrétol LP, December 2022) in `data/reference/episodes.csv`, shown on `/ruptures-passees`. A simulated "confirmée" next to a real archived shortage on the same medicine would mix the two. The handoff also keys the draft playbook to levetiracetam.
- The two one-click pharmacies follow levetiracetam (seed), so their alerts show the showcase. Two consequences, both handled: end-to-end test 1 now reports the first followed medicine other than the showcase, and `verify:clean` never resets a showcase molecule (that would erase its simulated history): it deletes the test reports, recomputes the signal and says to rebuild with `demo:clear` then `demo:national` if the level moved.
- `verify:clean` also removes answers by the one-click pharmacies, and with `--requests` the patient requests of origin `tester` made by an end-to-end run (never to use once real patients use the site).

## 2026-11-23, session 5

### Three institutions' spaces: Ministère, Pharmacie centrale, Ordre des pharmaciens (part 5)

- **Two new organisation types and roles** (`central_pharmacy`/`central_buyer`, `pharmacists_order`/`order_council`), demo organisations "Centrale d'achat démo, Tunis" and "Conseil régional démo, Sfax", every screen labelled "Espace conçu pour …". No logo, no real name.
- **Ministry order: level, then CNAM category (V, E, I), then fewer other brands.** Computed from the CNAM rows (`lib/institutions/catalogue.ts`, tested). A vital medicine with no other brand is the one a shortage hurts most; this is a reading order, never a level. The category is the most critical one among the molecule's CNAM rows.
- **"Arrivage annoncé" never changes a level.** `arrival_announcements` is written only through `announce_arrival()`, by the centrale, for a medicine at "probable" or "confirmée", for a date between today and a year ahead (Tunis time). Quantity is a range in months of cover, not a stock figure, so no stock quantity ever reaches a pharmacy or the public (rule 10). Pharmacies see it on the medicine and in alerts; the public sees only the date and origin, through `public_arrival()`, and only while the medicine is "confirmée".
- **Ordre messages go only to the governorates chosen**, enforced by row-level security (`current_governorate_code = any(governorate_codes)`), not by the screen. The body is the Ordre's own words (10 to 600 characters), shown with its sender, date and origin badge, and the line "Ceci n'est pas une déclaration officielle de rupture."; we write none of it.
- **The Ordre sees participation, never a pharmacy.** `pharmacy_network()` returns members and active members per governorate ("active": reported or signed in within 30 days), counts below 3 as "<3"; `network_weekly()` gives national reports per week. Neither carries a name, an id or a report.
- **Note de situation**: one A4 page built only from computed values and fixed sentences in `messages/fr/core.json` (no free text), printed with the browser (`@page` A4 in `globals.css`), no PDF library.
- **Ministry charts** (`daily_activity`, `demand_totals`) are coordinator-only functions that return every day of the window with counts below 3 as "<3", so a chart never reveals a single pharmacy.
- **`/vues` shows six panels** (centrale and Ordre added), each loaded through its own demo account, as before.

### "Levée" holds (part 4)
- Rule change, asked by the team (session 5 brief, answer 2): a foreign notice published before a medicine became "levée" no longer raises it on its own. Only a notice published after the levée (a new notice, or a new one from the same regulator), or new Tunisian reports, can. Before, a notice still active (they count 90 days) brought a "levée" back to "sous surveillance" at the next evaluation, the evening of day 22 in the scenario: the medicine had been delivered again, and the notice was about the episode that had just ended.
- How: `PreviousState.clearedAt` (optional) and `Evaluation.clearedAt`, the time of the last levée, kept after "levée" itself expires to "aucun signal" (then `since` is no longer the levée, and a notice from before it would come back 7 days later). Without a stored value, a shown "levée" counts from its `since`. The old notice still accompanies a new Tunisian report (`local_report_plus_foreign_notice`, "probable"), as before: only its power to raise the level alone is gone. No threshold changed and no rule id was added: the case reads `delivered_again_cleared`, then `cleared_expired`, then `no_evidence`, whose text on the methods page now says so.
- Stored in `signals.cleared_at` (schema 21), written by `apply_signal_evaluation` with the level, filled for existing rows from the last change to "levée" in the event log. The nine-argument function stays until the code that passes `p_cleared_at` is deployed, then the next migration drops it.
- Tests first: seven cases in `tests/signal.test.ts`, the service keeping the time in `tests/signal-service.test.ts`, the replay on the methods page now ending on "levée" (`tests/explore.test.ts`).

### Public side, track B on main (part 3)
- `public_molecule_status(molecule)` (schema 18, 19) is the only level the public reads: "confirmée" with its date, "levée" with its date only when the clearing came from "confirmée", otherwise nothing. A "levée" after "probable" would tell the public that a level below "confirmée" existed (rule 10). It returns the origins behind the shown level, so a simulated confirmation keeps its badge (rule 4), and no count and no rule. Tested in `tests/db/public-status.test.ts` for visitors, pharmacies and prescribers.
- `governorate_counts` now lists the roles that may call it (wholesaler, hospital pharmacy, coordinator, prescriber) instead of refusing pharmacies: a role added later (Ordre, centrale) gets nothing until someone decides it should.
- The status page groups the CNAM presentations by brand, folded under each brand (`<details>`, no script): amlodipine has 48 presentations, which made the page five screens long at 360 px. Labels stay as written in the list. The caution line sits above the list.
- The request is its own page (`/medicaments/[id]/demande`): a governorate list, or "Près de moi", which finds the governorate on the phone by point in polygon against the outlines of the national map. `npm run map:build` now writes the map's projection into `governorates-map.json` (the outlines are unchanged, checked byte for byte), so the phone projects its own position the same way. The position never leaves the phone; the server action receives the molecule, a governorate code and the random device id, nothing else. Requests from the public site carry the origin `tester` until a pilot.
- The phone keeps its device id, the ids of its requests (to link back to an open one when the 24-hour limit refuses a second) and the "Préviens-moi" list, in `localStorage` only. To check followed medicines, the phone asks `/api/public/status?ids=…`, which answers the same public status as the medicine pages and stores and logs nothing.
- `/demandes/[id]` re-renders from the server every 10 seconds while the request is open; answers from the pharmacies that showed themselves go on the patient map, framed on the markers (`fitToMarkers`, a new optional prop of the shared `PatientMap`, off by default so track C is unchanged), and in a text list with their origin badge.
- The pharmacy answers in one tap on `/pharmacie/demandes` (sidebar item with a count; on phones the count sits on "Plus", and a line on "Mes médicaments" says how many patients wait). The answer is inserted with the pharmacy's own session, so row-level security checks the governorate, the time and the origin. An answered request stays on screen with what the patient now sees, even after the list refreshes without it.
- WhatsApp: "Demandes" (a word or a button) lists the open requests of the pharmacy's governorate, a row opens the question with three buttons ("Oui, me montrer", "Oui, anonyme", "Pas disponible": Meta allows 20 characters, so the button words are shorter than the web's, and the question explains each). The bot works with the service role, which row-level security does not stop, so two service-role-only functions (`requests_for_pharmacy`, `answer_request_as`, schema 20) apply the web's rule themselves; the web list now reads through the first, so there is one rule. When a patient asks, linked pharmacies of the governorate that wrote to the bot in the last 24 hours get a message with a "Répondre" button (sent after the patient's page has its answer, with `after()`); the others are skipped, as for alerts, until a template is approved.
- The prescriber is a demo role like the others ("Médecin prescripteur", "Cabinet médical démo, Tunis", simulated). `/prescripteurs` is a public page: signed out, it explains and offers the one-click sign-in; signed in as a prescriber, it shows every level with the rule that fired and the counts by governorate (`governorate_counts`, "<3" below three), never a pharmacy and never a switch: the substitution note reads "en attente de validation clinique". The level and its explanation stay in French, like every professional space, marked `lang="fr"` inside an Arabic page.
- `/ruptures-passees` lists `data/reference/episodes.csv` as it is: one row per episode, newest first, label and source names as written, a link for every date. The French labels stay French on the Arabic page: they are the team's data, not interface text.
- `demo:national` now adds four simulated answers to its tamoxifen requests, from demo pharmacies of each request's own governorate: in Tunis one shows itself and one stays anonymous, in Sousse and Sfax "pas disponible"; three Sfax requests stay unanswered. None comes from the two one-click pharmacies, so the video's answer (Pharmacie démo A) stays free. `demo:clear` removes them with their requests.

### National demo picture (part 2)
- `npm run demo:national` puts the demo shortage in place (AMLODIPINE, "confirmée", 23 simulated reports over 11 days in 13 governorates, unchanged from session 3) and adds four molecules, each showing one rule: TAMOXIFENE "probable" (five pharmacies, all in Sfax: `single_governorate_cap`, gate two), METFORMINE "sous surveillance" (one pharmacy in Gabès), AZATHIOPRINE "sous surveillance" (a foreign notice alone: `foreign_notice_only`, gate one), CIPROFLOXACINE "levée" (confirmed in Tunis and Sousse 26 to 21 days ago, delivered again by two pharmacies). Six patient requests on tamoxifen (eight on amlodipine from the shortage), one wholesaler split applied (amlodipine) and one not applied with its reason (tamoxifen). The history starts 26 days ago.
- Chosen from the CNAM list: each has several brands (4 to 13), tamoxifen and azathioprine are vital ("V"), and none has a report, follow, notice, request, decision, signal or past episode of its own. The run refuses to start otherwise, so `npm run demo:clear` (now clearing both) returns the database to exactly where it was: checked on the live project with `db:fingerprint` (identical, every table) and in `tests/db/demo-national.test.ts` on the real migrations.
- The foreign notice names a fictional regulator, "Régulateur fictif (démonstration)", and links to the methods page section on origins. A simulated notice under a real regulator's name would be a fabricated record of a real institution.
- The levels are replayed through `recomputeSignal` at each report's and the notice's own time, so every timeline shows the days the levels changed, as the real service would have stored them.
- The stray LEVETIRACETAM report (Pharmacie démo F, Sfax, 23 Nov 01:42 UTC) was removed first with `npm run verify:clean -- --since 2026-11-23T01:40:00Z --apply`: one report, its signal, its event and six alerts, through `reset_molecule_signal`.

### Design direction: an operations console and a phone app (part 1)
- CLAUDE.md and AGENTS.md section 9 replaced with the brief's direction. Two families of screens share one identity: the professional spaces are a console (ink sidebar `--sidebar` #0B1A16 with the logo, the role, its organisation and origin badge, the sections with icons and "Changer de rôle"; a top drawer on phones; light `--page` content with white panels), the pharmacy space and the public pages are a phone app (app header, bottom tab bar, large search, full-width rows, primary action fixed at the bottom of a flow).
- New mark (`components/brand/Logo.tsx`, `lib/og/mark.tsx`): an open ring broken at one point with the dot that escapes it. It replaces the session 3 mark (the "probable" half-filled circle), which could be read as a level. Favicon, app icons and share cards rebuilt from it with `npm run icons:build`.
- `lucide-react` added: the one icon set the direction asks for, tree-shaken per icon, icons always next to a word. `d3-scale` (and `@types/d3-scale` in dev) added: scales for the server-rendered SVG charts (sparklines, level band over 30 days, bars per day); no chart library, nothing sent to the browser for the charts.
- Key figures are computed from the event log (`lib/charts/series.ts`, Tunisian day = UTC+1): number of medicines at a level each day for 14 days, from the level changes. Tested in `tests/series.test.ts`.
- Live feel on the existing refresh: when the page re-renders after a signal change (`components/LiveRefresh.tsx`), `components/live/LevelChangeWatcher.tsx` compares the new levels with the ones on screen, pulses the row and the governorates that changed once and shows a small toast. Nothing on the first render: only changes seen live. `prefers-reduced-motion` stops the pulse, never the toast.
- The report confirmation counts up from 0 to the number of pharmacies (only when it is 3 or more), rather than from N-1 to N: a "before" count would claim a figure we did not show, and below 3 the count is not shown at all.
- Home page: the live national picture first (map filled by the most serious active level per governorate, medicines with their level), read through the demo coordination account, as `/vues` already does (session 4). It therefore shows levels below "confirmée", like `/vues` and the scenario: the home page is the professional showcase, not a public page (rule 10 covers `app/(public)/`). Each level row links to the four views of that medicine. Then "Choisissez un rôle" in three groups (Terrain, Pilotage, Public), each tile with its icon, one line and a preview.
- Previews of the spaces are screenshots, never drawn: `npm run previews:build` (`scripts/screenshots.ts --previews`) signs in with each demo role and writes `public/previews/<role>.jpg` plus `manifest.json`; a tile shows a preview only when its file is listed. The same script writes the report screenshots (`npm run screenshots`).
- Public pages: app header with the mark and the language switch, sections as a bottom tab bar on phones (Médicaments, Pharmacies, Ruptures passées). The Library is in the footer, not a tab, so it never sits next to the patient's request flow (rule 12). The tab bar and header sit above the map layers (z-index over Leaflet's).

## 2026-11-23, session 3

### Security pass: per-table access tests, rate limits, secret check
- `tests/db/grants.test.ts` adds one behavioural test per table (18), on real rows: what a visitor, a pharmacy, another pharmacy, a coordinator and a wholesaler can read or write. The privilege matrix above it stays.
- Rate limits, counted in the database (no address or device stored): 30 reports per pharmacy in 10 minutes on the web (`lib/limits.ts`; the WhatsApp webhook keeps its own, 20 messages per sender in 10 minutes); 20 new tester pharmacies per hour for the whole site, so a leaked invitation link cannot flood the network. Each limit has a plain French message; nothing is saved when it applies.
- The pharmacy's molecule page now shows the error when "Livré à nouveau" fails (it used to redirect with `?erreur=1` and show nothing).
- `npm run check:bundle` reads what the browser receives (local build, or `--url` for the deployed site) and looks for every server-only value of the environment and for Supabase secret-key and service_role JWT patterns; it prints names only. Not in CI, which does not build (a build needs the project's public variables); run it after a build and before a release.

### Icons and share cards
- The mark is the "probable" shape (half-filled circle) in white on the brand colour: the product's own sign, no logo borrowed. `app/icon.svg` for browsers that take SVG; `npm run icons:build` (`scripts/build-icons.tsx`, with next/og already in Next) writes `app/favicon.ico` (PNG entries 16, 32, 48), `app/apple-icon.png` and the manifest icons. No new dependency.
- Open Graph cards for the home page, `/scenario`, `/methode` and `/retour` (`lib/og/card.tsx`, rendered by next/og at build): white, IBM Plex Sans, title, one sentence, the four levels as shape plus word, "Prototype de démonstration". Texts in `core.og.*`. Each of those pages sets its own og:title and description.
- IBM Plex Sans Regular and SemiBold TTF are committed in `assets/fonts/` with their licence (SIL OFL 1.1, from IBM's repository): next/og needs the font file, and `next/font` files are not reachable from it.

### Threshold explorer on the methods page
- Four sliders (pharmacies for confirmed 2 to 12, governorates 1 to 5, pharmacies for likely 1 to 5, wait 24 to 120 hours). Each change replays two simulated scenarios through `evaluate()` in the browser (`lib/scenario/explore.ts`): evaluation at every step and at the end of every day, carrying the previous level, as the signal service does. Nothing is written; no request is made.
- Second scenario `buildFalseAlarmScenario` in `lib/signal/scenario.ts`: in one governorate, one pharmacy reporting every day for 14 days plus three other pharmacies on days 4 to 6. With the defaults it stops at "probable" (one count per pharmacy, one governorate); with one governorate enough it confirms. Tested in `tests/explore.test.ts`.
- Every sentence under the timelines is computed from the replay ("Avec 4 pharmacies : confirmée au jour 5."). Each line changes that setting alone, so its effect reads on its own; the timelines show all settings together.
- Each threshold has its reason under its value, and the section opens with the case-definition reading (suspect, probable, confirmé). No digit is typed in these texts (tested).
- Seen while building it, not changed then: once "levée", a molecule with a foreign notice still active went back to "sous surveillance" at the next evaluation. Changed in session 5, part 4 (above).

### DPM list: names only, flag rebuilt by script
- `scripts/build-dpm-list.ts` (`npm run dpm:build`) rebuilds `dpm-dci.csv` and `dpm-dci.json` from the raw copy and the CNAM file. The name key (`lib/dpm/key.ts`) drops accents, articles ("DE"), salt and hydrate words (when another word remains, so "CALCIUM" stays calcium but "ROSUVASTATINE CALCIUM" is rosuvastatin), and a final E on long words, so English forms match French ones ("METFORMIN HYDROCHLORIDE" = METFORMINE). A name counts as in the CNAM VEI list when it is a CNAM molecule or a component of a combination. Result: 599 of 2,227 names flagged, 48 flags changed against the first pass (mostly English salt forms now matched; "CHLORURE DE CALCIUM" now "no", since CNAM lists calcium only as CALCIUM and in combinations).
- The "registered in Tunisia, not followed" answer (`lib/dpm/match.ts`) uses only names outside the CNAM list, and only when the catalogue search found nothing. It accepts a start of a name (5 letters or more) and one or two typos. Used by the WhatsApp search now; `/medicaments` belongs to track B and gets it when track B merges.
- The sentence for `/medicaments` is ready for track B as `public.dpm.notFollowed`, in French and Arabic, with `matchesDpm()` to call when the catalogue search finds nothing. The Arabic was written by the developer, not a translator: it needs review by an Arabic speaker before the jury sees it.
- `data/SOURCES.md` gains the DPM list, `episodes.csv` and `foreign_notices.csv` (compiled by the team, with their links); the methods page lists them. No compile or copy dates.

### WhatsApp bot: built on Meta's payload shapes, waiting for the Meta values
- The access token, phone number id and app secret are not set (in `.env.local` or Vercel), so the bot is built and tested with recorded payload shapes (`tests/fixtures/whatsapp/`) and has not exchanged a message with Meta yet. Without the values the webhook refuses every POST (no app secret, no valid signature) and the link page says WhatsApp is not active.
- The report in four taps: "Signaler" sends the list of followed medicines (open, pick), then a second list with the four delays (open, pick). A list, not buttons, for the delays: reply buttons are limited to three and there are four choices. Row ids carry the molecule and the delay ("rw:d:<id>:d5"), so the bot keeps no conversation state. Same delay mapping as the web (`lib/pharmacy/delay.ts`), same `recomputeSignal`, `channel = whatsapp`, through the service role. The reply gives the level change, the rule's sentence (counts below 3 read "moins de 3"), the link to the method, and the disclaimer.
- Typing anything else searches the catalogue (`search_medicines`), one row per molecule. Levels are written as a shape and a word (○ Sous surveillance, ◐ Probable, ● Confirmée, ✓ Levée), as on screens.
- Linking, as the brief says: the pharmacist types the number in `/pharmacie/whatsapp`, receives a 6-digit code on WhatsApp, types it back (10 minutes, 5 tries, one new code a minute, 3 numbers per pharmacy). `wa_links` stores the salted hash of the number (the same derivation as `wa_inbound`), the number itself as `reply_to` (needed to send alerts), and the hash of the business-scoped user id learnt on the first message, so a pharmacist who later hides their number behind a username is still recognised. Pending codes are stored hashed, bound to the pharmacy. Both tables are service-role only (migration 0015); the actions check the pharmacy session first.
- Sending the code is a message we start, so outside a conversation Meta requires an approved authentication template (`WHATSAPP_LINK_TEMPLATE`). Until it exists the code goes as a free-form message, which arrives only if that phone wrote to the service in the last 24 hours; the page says so ("écrivez d'abord « Bonjour »").
- Alerts: after a level change from a web report, a WhatsApp report or the daily recompute, linked pharmacies that follow the molecule get it on WhatsApp: free-form inside the 24-hour window, the approved utility template (`WHATSAPP_ALERT_TEMPLATE`) outside it, otherwise skipped and counted in the logs. The alert is always in the web space too.
- Abuse: a sender writing more than 20 messages in 10 minutes is stored but not answered; an unlinked number gets the link at most once an hour.
- The demo pharmacy accounts are open to everyone, so anyone can link a number to them; the page shows linked numbers masked (+216 •• ••• 456). Links on demo accounts are visitors' data: clear them after the jury period.

### Demo shortage: amlodipine, fixed ids, undone exactly
- `npm run demo:shortage` simulates a shortage of AMLODIPINE: 13 brands on the CNAM list, no tester reports or follows, no past episode in `episodes.csv` and no foreign notice. Amoxicillin with clavulanic acid was the first choice and was dropped because the archive holds its real 2022 episode: a simulated shortage of it would blur real and simulated data.
- 23 not_delivered reports from 23 simulated pharmacies (10 of the seed, 13 created as "Pharmacie démo 13, Bizerte" and so on) in 13 governorates over 11 days, plus 8 patient requests. Sfax and Tunis end with 4 reporters and Sousse with 3, so the coordination map shows counts there and "<3" elsewhere. The one-click pharmacies (Tunis A, Sfax F) are not used, so a live report during the demo adds to the count.
- The signal service is replayed at each report's time, so the level history shows the climb on the days it happened (watch, likely on day 1, confirmed on day 2, then still spreading).
- Every row has a fixed id. `npm run demo:clear` resets the molecule's signal (`reset_molecule_signal`), then deletes those ids only, then recomputes from any other report. The run refuses to start if anyone else reported the molecule or it already has a signal, so clearing returns the database to where it was. Tested on PGlite (every public table compared row by row) and on the live project with `npm run db:fingerprint` (row count and SHA-256 per table, no new dependency).

### The "confirmed" bar scales with the network (`confirmMemberShare`)
- The thresholds stay as they were (72 hours; likely with 2 pharmacies in 7 days; confirmed with 4 pharmacies in 2 governorates within 14 days; 2 deliveries to clear). They are design values for a pilot, and the methods page says so.
- New parameter `confirmMemberShare: 0.02`. Pharmacies needed for "confirmée" = max(`confirmMinPharmacies`, ceil(0.02 x active member pharmacies)). Why: 4 pharmacies is a meaningful bar for a pilot of a few dozen members, but with 1,500 members four reports would be noise; the share keeps the bar proportional, and 4 stays the floor. With today's network the floor always wins, so no current level changes.
- `evaluate()` stays pure: it takes the count as an optional input (`activeMemberPharmacies`); without it the floor applies. Only the signal service passes it, from `active_member_pharmacies()` (migration 0014, service role only): participating pharmacies, simulated accounts excluded, with a report or a sign-in in the last 90 days (`ACTIVE_MEMBER_DAYS`). If the count cannot be read, the floor applies rather than blocking a report. The scenario, the time machine and the explorer run without a count, so they use the floor.
- The same pharmacy count decides gate two's "enough pharmacies, but one governorate" (`single_governorate_cap`), so the two rules never disagree about what "enough" means.
- Tests: the floor wins at 100 members, the share wins at 1,500 (30 needed), a missing or invalid count means the floor (`tests/signal.test.ts`); the count and its effect through the signal service on the real migrations (`tests/db/active-members.test.ts`). The 31 earlier tests are unchanged.

## 2026-11-23, track D (wholesaler)

### The wholesaler space reuses the coordination view
- `/grossiste` calls `loadDashboard` and `SignalsDashboard` (track A) with the wholesaler's own client: the database already gives a wholesaler `signals_view`, `governorate_counts` (counts under 3 as "<3") and `demand_by_governorate`, and nothing that names a pharmacy. "Levée" is left out: the brief asks for "sous surveillance" and above. Above the dashboard, a band offers the split when the selected molecule is "probable" or "confirmée", and says why not otherwise. No change to the shared component.

### The fair split
- `lib/allocation/split.ts`, pure: the hospital reserve first (rounded down), then water filling: the governorates with the fewest days of cover are raised first until all reach the same level, capped at the need for the period (enough for `periodDays` of cover). Whole boxes: the continuous split is rounded down and the few boxes left go one at a time to the lowest cover after, ties by governorate code, so the result is deterministic. What no governorate needs stays "non attribué"; reserve + allocated + unallocated always equals the stock (tested for stocks from 0 to 1,000,000).
- `lib/allocation/params.ts`: reserve 10 %, period 30 days. Design parameters proposed for a pilot, shown on screen as such; nothing in the Phase 2.1 notes in this repository fixes their values.
- Monthly use and days of cover by governorate: `supabase/seed/allocation-demo.json`, invented for the demonstration, every value marked `simulated`, one set for every molecule. The screen shows the "Simulé" badge and says a pilot would take them from the wholesaler's own sales.
- The page computes the split on the server from the typed stock (a GET form, so it works before JavaScript loads). The server action computes it again before storing: what is recorded is always the platform's proposal, never figures sent by the browser.

### The decision log (migration `20261123003000_track_d_allocation_decisions.sql`)
- `allocation_decisions`: molecule, organisation (set by the database), stock, `recommended` (reserve, boxes and cover by governorate, parameters, origin of the figures), applied, reason, time, origin (the deciding organisation's, set by the database). Insert granted on the decision's own columns only. A wholesaler inserts and reads its own; coordinators read all; nobody updates or deletes. "Ne pas appliquer" needs a reason of at least 15 characters, checked in the form, the server action and a table constraint.
- The migration does not bump `system_meta.schema_version`, to avoid colliding with the other tracks' migrations: the team lead sets it when merging.
- For the coordination log (track A): read `allocation_decisions` with the coordinator's client, joined to `molecules (name)`; the wholesaler's name is in `organisations` but a coordinator cannot read other organisations, so show "un grossiste" or add a view.

### End-to-end tests
- New dev dependency `@playwright/test`: the brief asks for Playwright. `playwright.config.ts`, `tests/e2e/*.spec.ts` (Vitest only runs `*.test.ts`), `npm run test:e2e`, against `E2E_BASE_URL`; skipped when it is not set, so CI is unchanged. Tests 1 and 2 run in order (2 looks for the medicine reported in 1); test 3 is independent; test 4 waits for track B.

## 2026-11-23, track C (directory and Library)

### The Google search runs in the browser; the server route is gone
- Rule 3: the visitor's position never reaches our server. `components/directory/PharmacyFinder.tsx` calls the Places library of the Maps JavaScript API that `PatientMap` already loads (`Place.searchNearby`, 3 km, 20 results, `includedPrimaryTypes: ["pharmacy"]`, ranked by distance). `app/api/places/nearby/route.ts` and its test are deleted, and `GOOGLE_PLACES_API_KEY` is no longer used. The browser key must now allow "Places API (New)" as well as "Maps JavaScript API" (`.env.example`).
- Fields asked: id, display name, formatted address, location, regular and current opening hours, national phone number, Google Maps link (`GOOGLE_FIELDS`, tested). Results live in the component's memory only: never stored, cached, logged or sent to our server. When the map falls back to OpenStreetMap, Google results are dropped and the search runs again on the OpenStreetMap list.

### A governorate picked from the list: search inside its outline, not around its centre
- The centroid of a large governorate falls far from its towns (Sfax's is 35 km from the city, Tataouine's is in the desert), so a 3 km search around it finds nothing. With Google, `Place.searchByText` ("pharmacie", type pharmacy, strict) restricted to the governorate's bounding box. With OpenStreetMap, the pharmacies whose point falls inside the governorate's outline (computed at export), the 20 nearest to the mean position of that governorate's pharmacies, which sits in its main town.
- `data/reference/governorate-areas.json` (`npm run directory:areas`): names from the governorates migration, centroid and bounding box from the geoBoundaries file. A test recomputes it from the source.
- `PatientMap` takes its centre only when it mounts, so the page remounts it (a `key` per governorate) instead of changing the shared component.

### One representation of opening hours, computed on the phone
- `lib/directory/hours.ts`: a week of intervals in minutes from Sunday 00:00, Tunis time (`Intl`, Africa/Tunis, whatever the phone's zone). Google periods are converted in the browser; OpenStreetMap's `opening_hours` tag is converted at export time.
- "Ouvert maintenant": the current minute is inside an interval (Google's current hours, which include special days, when given). "Ouvert ce soir après 22 h": open at some moment between 22:00 and 06:00. "Ouvert le week-end": open on Saturday from 14:00 or on Sunday, because nearly every Tunisian pharmacy opens on Saturday morning and the filter would mean nothing otherwise; the page says so under the filters. A pharmacy without hours shows "Horaires non renseignés" and only when no filter is on.

### OpenStreetMap fallback: parsed at export, not on the phone
- New dev dependency `opening_hours` (opening_hours.js, maintained, LGPL-3.0): the reference parser for the OSM tag. Used only by `scripts/export-osm-pharmacies.ts`, so nothing heavy is sent to phones: the export stores each pharmacy's regular week, computed over the week after the export date.
- The library has no Tunisian public holidays: a value with `PH` or `SH` rules is read again without those rules, and the count is printed. A value it cannot read gives no hours, never a guess. The page says the hours are for an ordinary week without public holidays, and gives the data date.
- `/api/places/osm` serves the whole file (static, cached an hour); the phone sorts by distance, so no position is sent. 404 and an honest empty state until `npm run osm:export` has been run.

### The Library
- `npm run library:import` downloads `CIS_bdpm.txt`, `CIS_COMPO_bdpm.txt` and `CIS_CPD_bdpm.txt` into `data/raw/bdpm/` and writes `data/reference/library-fr.json`, for the CNAM molecules only. Text decoded as UTF-8, or Windows-1252 when it is not valid UTF-8. A line with too few columns stops the import instead of being skipped.
- Matching: a CNAM molecule matches a French product when its components, normalised (upper case, no accents, every word and salt kept, order ignored), equal the product's active substances, or the same with each substance replaced by its therapeutic fraction (FT) where the BDPM gives one ("VALPROATE DE SODIUM" → "ACIDE VALPROÏQUE"). Exact names only: no fuzzy matching, since a wrong match shows the status of another medicine. Only products with an active authorisation; marketed first.
- Reading the conditions: "liste I", "liste II", "stupéfiant" and any other prescription condition read as "Sur ordonnance en France". A condition that says in words that no prescription is needed reads "Sans ordonnance en France". No condition at all reads "Sans ordonnance en France" only if all ten known products of the check agree (`KNOWN_PRODUCTS` in `scripts/lib/library.ts`, result stored in the file); otherwise it reads "Statut non déterminé", with a line explaining why. The conditions are shown word for word under each product.
- The page reads the molecule by id with the public key, and the file on the server. No link to or from the request flow, no alternative, no suggestion (rule 12). The banner is a full band with heavy rules and bold ink text, no alarm colour.

### Files outside track C changed, to be reviewed by the team lead
- `messages/fr/core.json` (`method.sources.bdpm`, and the OpenStreetMap use sentence) and `tests/method.test.ts` (the new source heading), because every `data/SOURCES.md` heading needs its methods-page text.
- `next.config.ts`: file tracing for `library-fr.json` and `osm-pharmacies.json`.
- `.env.example`: the browser key's restrictions; `GOOGLE_PLACES_API_KEY` removed. `docs/CONTRIBUTING.md` still mentions it.

## 2026-11-22, session 4

### Fixes from session 2's questions
- **Valproate**: the demo pharmacies follow both ACIDE VALPROIQUE (Depakine, Valoxine) and VALPROATE DE SODIUM + ACIDE VALPROIQUE (`supabase/seed/demo-follows.json`, applied live).
- **No exact count under 3 through the API** (migration 0011). Signed-in users lose select on `signals.evidence` and `signal_events.evidence` and keep it on the other columns (level, since, rule, times), so Realtime still announces changes. Evidence is read only through `signals_view`, `signal_events_view` and `my_alerts`, which pass it through `app.shown_evidence`: pharmacy counts 1 and 2 become `'<3'`, the number of governorates is withheld (null) below 3 pharmacies, and the object is rebuilt key by key so a key added to stored evidence later is never passed on unseen. The stored evidence stays exact for the service role and the audit. `lib/signals/shown.ts` applies the same rule in TypeScript for the in-memory scenario; a test checks that both agree. `explanationText` also suppresses a raw 1 or 2, in case exact counts are ever passed to it.
- **Impact wording**: `report_impact` keeps counting the reporting pharmacy; the sentence now says so: "Avec la vôtre, N pharmacies signalent ce médicament…", "Avec la vôtre, moins de 3 pharmacies…" below 3.
- **Tester numbering** (migration 0012): `reset_tester_numbering()` restarts the sequence at 1 only when no tester pharmacy exists, so two pharmacies can never share a number; the migration calls it once. `npm run verify:clean` calls it after removing a run's testers, and no longer removes the seeded follows of the demo pharmacies when re-seeding happened after `--since`.

### Signals carry the origins of their data; `public_status` for the public side (migration 0013)
- The signal service stores, with the evidence, the origins of the reports and notices it counted (`official_source`, `tester`, `simulated`). `shown_evidence` passes them on, so every screen that shows a level can show its origin badge (rule 4) without reading a single report.
- `public_status(molecule)` is the only signal read open to the public key: confirmed or not, and, only when confirmed, since when and from which origins. The public key cannot call `signals_view`, so rule 10 holds in the database, not only in the pages. Track B's medicine page should use it.

### Coordination and hospital spaces
- One server component (`SignalsDashboard`) and one loader (`loadDashboard(client, …)`) serve the coordinator, the hospital pharmacy and `/vues`. The selected molecule is in `?m=` (checked as a UUID), so each row is a plain link and the page works before JavaScript loads.
- The map fills a governorate with its level's colour mixed with white in three bands (`<3`, 3 or 4, 5 and more), with a legend and a table of the same counts, so colour never carries the meaning alone. Every number comes from the database already suppressed.
- The hospital space is the same without the event log and the export.

### Export
- `/api/coordination/export?format=csv|json`, coordinator only (403 otherwise), never cached. CSV: one row per molecule and governorate, UTF-8 with a byte order mark so Excel reads the accents, CRLF line ends, and a cell starting with `=`, `+`, `-` or `@` prefixed with `'` so a spreadsheet never runs it as a formula. Counts are the database's (`<3` below 3); `governorates_14d` is empty when `pharmacies_14d` is `<3`.

### Methods page
- Static. Every threshold is read from `DEFAULT_PARAMS` and every rule sentence uses placeholders; a test fails if a digit is typed into the method texts. Sources are parsed from `data/SOURCES.md` at build time.

### The scenario runs in the browser
- `buildScenario()` and `evaluate()` run in a client component: eight steps, three seconds apart. The page makes no request while it plays (checked on the deployed site), so it can never write to the database and needs no reset. Fictional medicine, six fictional pharmacies (three in Tunis, two in Sfax, one in Sousse), a fictional foreign authority.
- The roles shown as alerted at each change are those `apply_signal_evaluation` alerts: pharmacies following the medicine, wholesalers, hospital pharmacies and coordination; nobody when an expired "levée" disappears (`cleared_expired`).

### Time machine (`/retour`)
- Static page reading `data/reference/episodes.csv` at build time: committing the file redeploys the page. A row with an invalid date or link is left out and the page says which line, instead of guessing.
- Lead = days from the foreign notice to the first Tunisian report. No foreign notice, or one on the same day or later, is a miss. The median is over the episodes with a lead above zero.
- The date cursor evaluates the foreign notice alone with `evaluate()` in the browser. The episodes file has no notice status, so the notice is treated as a shortage notice.
- `lib/content/csv.ts`: a 40-line RFC 4180 reader written here rather than a dependency, for the two team files.

### Importing foreign notices
- `npm run notices:import`, dry run by default. Names are matched exactly, never fuzzily: a wrong match would put a notice on the wrong medicine. Notices already loaded (same molecule, source, date and link) are skipped, so the script can be run again as the file grows. `published_at` is midnight UTC of the date.

### One shortage, four views (`/vues`)
- Each signed-in panel uses its own demo account, signed in on the server with `DEMO_ACCOUNT_PASSWORD`; the public panel uses the public key with no session. Sessions are kept in memory per server instance and reused until five minutes before they expire, because Supabase limits sign-ins per IP.
- The pharmacy and coordination panels call the functions their own screens call (`getMoleculeView`, `getAlerts`, `loadDashboard`), which now accept a client. The wholesaler's screens are track C's and do not exist yet: its panel uses the reads the database grants a wholesaler (`signals_view`, `governorate_counts`, `demand_by_governorate`, `my_alerts`).
- Each panel also tries the other roles' reads with its own client and lists what the database refused ("refusé") or answered with no rows ("aucune ligne renvoyée", row-level security on `reports`). The rules are measured on every page view, not described.
- The page shows anyone what the professional demo accounts see. The one-click demo already does; the page says so. For a real pilot, `/vues` and the one-click accounts go.

## 2026-11-22, shared foundations

### One patient map: Google Maps when a key works, Leaflet with OpenStreetMap otherwise
- `components/maps/PatientMap.tsx` loads the Google Maps JavaScript API itself (one script tag, `loading=async`, a callback), with no wrapper library. It falls back to OpenStreetMap when the browser key is absent, the script fails or takes more than 8 seconds, or Google refuses the key (`gm_authFailure`: wrong referrer, quota, billing).
- `leaflet` (npm, BSD-2-Clause): the fallback map. Small (about 40 KB gzipped), no API key, loaded with a dynamic import only when the fallback is used. `@types/leaflet` and `@types/google.maps` (dev only): types for the two map APIs, so the component stays under strict TypeScript.
- `onProvider` tells the page which map is showing, so a page can keep Google Places results off the fallback map (rule 13).
- Markers use Google's `AdvancedMarkerElement`, which needs a map ID. `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` holds ours; without it Google's documented `DEMO_MAP_ID` is used, which is fine for development but not for production.
- `/dev/carte` is a check page with two fictional test points, not linked from the interface.

### Message files split by track, keys prefixed by namespace
- `messages/fr/{core,public,directory,library,wholesaler}.json` and `messages/ar/{public,directory,library}.json`. Every key starts with its namespace (`core.home.tagline`, `public.pages.medicines.title`), so the type checker catches a key in the wrong file and two tracks never edit the same file. Existing keys moved to `core` unchanged.
- `t()` stays French. Public pages use `translator(locale)` with the locale from `getTranslator()` (`lib/i18n-server.ts`). A key missing in Arabic shows the French text and warns once in development.
- The Arabic strings of the public shell (header, footer, placeholders, page titles) were written by the developer, not a translator, and need review by an Arabic speaker before the jury sees them.

### Availability requests and answers (migration 0010)
- Requests are created only by `create_availability_request`, callable by the service role alone: our server hashes the visitor's device id first (HMAC-SHA256 with `DEVICE_HASH_SALT`, `lib/availability/device.ts`), so a caller with the public key cannot bypass the 24-hour limit by inventing hashes. A second request for the same molecule from the same device within 24 hours raises SQLSTATE `RW429`. An advisory lock makes two simultaneous identical requests wait for each other.
- `origin` defaults to `tester`: during the pilot a real visitor is a tester. Never `official_source`.
- A request is routed to the participating pharmacies of its governorate while it is open (3 hours). Pharmacies cannot read `availability_requests`; `requests_for_my_pharmacy()` returns their open, unanswered requests without the device hash. Answers are inserted directly under row-level security (own organisation, own origin, request routed to it); insert is granted on the five columns a pharmacy fills, so `answered_at` is always the database's time. One answer per pharmacy and request, final.
- `request_answers_public(request_id)` is open to anyone holding the request id (a random UUID known only to the visitor who made it). It returns the pharmacies that answered "available" and chose to show themselves, with name, position, public address, time and origin, and the numbers asked and answered as small counts. "Asked" counts the pharmacies of the governorate that existed while the request was open.
- `demand_by_governorate` counts requests, requests with at least one answer, and requests with none, per governorate; small counts as `<3` and 0 as 0, like `displayCount`. Coordinators, wholesalers and hospital pharmacies only.
- Demo pharmacies get fictional positions in `supabase/seed/demo-organisations.json`: near the centre of their governorate, 250 m to 2 km apart, each at least 150 m from any pharmacy listed in OpenStreetMap (checked with Overpass on 22 November), and the address "Adresse fictive de démonstration, <ville>".

### Two root layouts: `app/(site)` and `app/(public)`
`lang` and `dir` must be set on `<html>`, and a nested layout cannot do that. Existing routes moved to `app/(site)/` (French, unchanged URLs); `app/(public)/` has its own root layout reading the `rw-lang` cookie. Moving between the two reloads the page, which is what a language change of the whole document needs. Unknown addresses use `app/global-not-found.tsx`, which requires `experimental.globalNotFound` (Next 16 documents it as experimental; the alternative, a root layout reading the path from a request header, would keep the wrong `dir` after client-side navigation).
- IBM Plex Sans Arabic is loaded with the `arabic` subset only and not preloaded; Latin text in Arabic pages falls through to IBM Plex Sans. `<Ltr>` (`<bdi dir="ltr">`) keeps medicine names and codes readable inside right-to-left text.
- The language switch is a plain form posting to a server action (`setLocale`): it works before JavaScript loads, and only redirects to a path on this site.

## 2026-11-22, session 2

### Tester onboarding: accounts created by the server, no anonymous sign-in
- `/rejoindre/<code>` creates a Supabase user with the admin API (random `testeur-<uuid>@rupturewatch.example` address, random 32-byte password never stored, email confirmed) and signs in with it on the server. The session cookie is the only key. This needs no dashboard setting, unlike anonymous sign-ins, and anonymous sign-ins have their own lower rate limit (30 per hour per IP by default), which a test morning could exhaust from one counter.
- `create_tester_pharmacy()` (service role) creates the pharmacy and the profile in one transaction, numbered from a sequence: "Pharmacie testeuse n° N, <gouvernorat>". Only the governorate is asked.
- Testers get no "Changer de rôle": signing out would lose the account, and joining again would count the same person as a second pharmacy. Joining again from a browser that already holds a tester session goes straight to `/pharmacie`.
- `qrcode` (npm, MIT): draws the invite link as an SVG on the server for `/coordination/invitation`. No client JavaScript.

### Report flow
- Two taps from the space: a followed molecule's row opens its page, which carries the four "when was it ordered" buttons (tap two). The primary button "Signaler une commande non livrée" opens the picker for any other medicine (tap one: the medicine; tap two: when). "Il y a 3 jours", "4 à 7 jours", "Plus d'une semaine" set `ordered_at` to now minus 3, 5, 8 days; "Moins de 3 jours" sends nothing.
- A pharmacy that reports a molecule follows it automatically, so it receives that molecule's alerts.
- The result screen reads the level before and after from the recompute (passed in the URL, validated against the five levels; only the visitor's own screen uses them), the explanation from the current signal row, and the impact from `report_impact`.
- `report_impact` counts distinct pharmacies including the reporter. Below 3 it returns `<3` and withholds the number of governorates, because "<3 in 2 governorates" would reveal exactly 2. The screen then says "Avec votre signalement, moins de 3 pharmacies signalent ce médicament…".
- "Moins de 3" applies to pharmacy counts in every explanation sentence. Governorate counts are shown as they are: they do not single out a pharmacy.

### Live updates: Supabase Realtime, with polling as a fallback
`signals` and `alerts` are in the `supabase_realtime` publication (migration 0008). `LiveRefresh` subscribes with the visitor's session (row-level security applies to each event) and re-renders the page on a change. If the channel is not joined within 5 seconds, or drops, it polls instead: every 15 seconds for a pharmacy's alerts, every 4 seconds for the coordinator list (the brief asks for under 5 seconds).

### The signal service stores each evaluation atomically, with compare-and-set
- `lib/signals/recompute.ts` loads 120 days of reports and notices, calls `evaluate()`, and stores the result through `apply_signal_evaluation()`, a service-role SQL function. It writes the `signals` row only if level and `updated_at` are still what was read; the event row and the alerts are written in the same transaction. On a conflict nothing is written and the service reloads and evaluates again (up to 5 times). A crash can therefore never leave a level change without its event, and two simultaneous reports never produce a duplicate or skipped event (`tests/signal-service.test.ts`, `tests/db/pharmacy-flow.test.ts`).
- `updated_at` is set with `clock_timestamp()` and compared as stored (microseconds kept), so two writes in the same transaction-time never compare equal.
- No row is written for a molecule with no evidence and no row: `signals` holds only molecules that have had a signal.
- The fading of "levée" back to none after 7 days (`cleared_expired`) is logged in `signal_events` but alerts nobody: it is not news to anyone. Every other change, stand-downs included, alerts every pharmacy following the molecule and every wholesaler, hospital pharmacy and coordinator organisation.
- The daily cron (`/api/cron/recompute`, 04:30 UTC, `vercel.json`) checks `Authorization: Bearer <CRON_SECRET>`, which Vercel Cron sends when `CRON_SECRET` is set. Without the variable every call is refused.

## 2026-11-21, session 1

### WhatsApp: Graph API v27.0, senders identified by business-scoped id when present
- `lib/whatsapp/client.ts` pins `GRAPH_API_VERSION = 'v27.0'`, the version used on Meta's send-messages page read on 21 November 2026. Change it in that one constant.
- Since 2026, a user with a WhatsApp username may arrive without `messages[].from` (phone number) but with `messages[].from_user_id` (business-scoped user id, BSUID). The parser accepts either. The stored `sender_hash` is a salted SHA-256 of the BSUID when present, otherwise of the phone number, so the same person keeps the same hash if they hide their number. The raw number or id is never stored.
- The reply goes to `to` (phone) when the webhook gave one, otherwise to `recipient` (BSUID), as Meta documents.
- The webhook stores the message, answers Meta 200, then sends the acknowledgement with `after()`. A duplicate delivery (same `message_id`) inserts nothing and gets no second reply. If storage fails, it answers 500 so Meta retries.
- Signature: HMAC-SHA256 of the raw body with the app secret, compared in constant time, checked before parsing. Missing or wrong: 401.

### Governorate boundaries from geoBoundaries (ODbL), not Natural Earth
Natural Earth admin-1 (public domain) has only 23 Tunisian units: Ariana (TN-12) is missing. geoBoundaries gbOpen TUN ADM1 has all 24 with ISO codes, from OpenStreetMap, under ODbL 1.0. Attribution is shown under the map. `scripts/build-governorate-map.ts` projects and simplifies it to a 20 KB file (7 KB gzipped).

### The national catalogue: the current CNAM VEI list, commercial name kept word for word
- The brief names the version of 3 December 2025. CNAM's site now publishes only the update of 6 November 2026 (the 2025 file name returns 404), so we use that one and say so.
- The source gives brand, strength, form and pack size in one free-text field (`NOM_COMMERCIAL`). We store it word for word in a `label` column (added to the brief's `medicines` columns) and extract only a short `brand` (first word plus following capitalised words, rules in `scripts/lib/catalogue.ts`, tested). `dosage`, `form` and `presentation` stay empty: splitting free text with patterns would produce wrong values ("100/5 ML" reads as "5 ML"), and the brief says gaps are not filled.
- One molecule per normalised DCI: upper case, single spaces, combinations written "A + B" in the source's order. "A + B" and "B + A" would be two molecules; none was seen in this file.
- `code_pct` is kept as the text of the source number. If CNAM codes ever had leading zeros, Excel has already dropped them in the source.

### Fuzzy search
`search_medicines(q)` normalises with `unaccent` + lower case, matches by trigram word similarity (threshold 0.4, set on the function) or by prefix on brand and DCI, ranks by the best of those, returns 10. Tested on the full catalogue in `tests/db/search.test.ts`: brand, DCI, DCI with French accents, one-letter misspelling, half word.

### Access rules
- Reports: a pharmacy reads and inserts its own reports only. Inserts must be for its own organisation and governorate, channel `web`, origin `tester` or `simulated`, dated now (no backdating). No update or delete for anyone but the service role. WhatsApp, the simulator and the replay write through the service role.
- Other roles never select from `reports`. They get `governorate_counts(molecule_id)`, a `security definer` function returning counts by governorate with counts under 3 as `<3`, open to coordinators, wholesalers and hospital pharmacies, refused to pharmacies and anonymous visitors. Suppressed cells are ordered by code so the order does not reveal 1 versus 2.
- `governorate_counts` repeats in SQL the counting done by `countByGovernorate()` in `lib/signal`. This is the one place a rule exists outside `lib/signal`, because the access boundary has to be in the database. The thresholds are not decided in SQL: the server passes them from `lib/signal/params.ts`. `tests/db/access.test.ts` checks that both give the same counts on the same data, window and delay edges included.
- `signals.evidence` and `signal_events.evidence` reject any JSON with keys such as `pharmacyId`, `organisation_id` or `reports` (check constraint).
- `signal_events` is append only, enforced by a trigger, even for the service role. The scenario reset (session 4) can delete only inside a function that sets `rupturewatch.allow_event_reset = on` for its transaction.
- Grants are written explicitly in each migration, so access does not depend on the project's default exposure settings. Our project grants nothing by default: `system_meta` had been left to the defaults and `/api/health` failed on the first deployment, fixed in migration 000700. `tests/db/grants.test.ts` now runs the migrations both with and without default grants and checks the full privilege matrix for every table and public function.

### Governorates are a migration, not a seed
The 24 governorates (ISO 3166-2:TN, checked against the ISO list) are official reference data, not demo data, so they are inserted by a migration and exist in every environment. Seed files hold only `simulated` rows.

### Access rules are tested on every push, without a live database
`tests/db/` runs the real migrations in PGlite (Postgres compiled to WebAssembly, with `pg_trgm` and `unaccent`) behind a small shim for Supabase's roles and `auth.uid()` (`tests/db/supabase-shim.sql`). `tests/live/` repeats the key checks against the real project with the real demo accounts (`npm run test:live`).

### One-click demo roles
- "Changer de rôle" signs out with `scope: 'local'`. The default (global) would revoke every session of the shared demo account, signing out other visitors using the same role.
- Supabase limits sign-ins to 30 per 5 minutes per IP by default, and all demo sign-ins come from the server. The limit is raised in the dashboard (manual step), and a 429 shows a plain "try again in a minute" message.
- Interface text inline in JSX fails the lint (`react/jsx-no-literals`), enforcing that all text lives in `messages/fr.json`.

Five auth users, one per role button, created by `scripts/seed-demo.ts`, all sharing `DEMO_ACCOUNT_PASSWORD` from the server environment. The button sends only a role key from a fixed list. Emails use the reserved `.example` domain, so no mail can ever be sent. "Changer de rôle" signs out and returns to the role picker.

### Next.js 16 with Cache Components turned off
`create-next-app` 16.4 enables `cacheComponents`. With it, every cookie read must sit behind a Suspense boundary and instant-navigation checks flag every session route. Almost every page here reads the session; the request-time model is simpler and predictable with `@supabase/ssr`. `proxy.ts` (Next 16's name for middleware) refreshes the session cookie.

### Design tokens
`--level-watch` is `#9A7500` instead of `#B58A00`: the original gives 2.9:1 on `--surface-subtle`, below the 3:1 needed for a meaningful shape. Badge words are always in `--ink`. `--brand-strong` (`#0A5444`) added for hover only.

### Dependencies
- `@supabase/supabase-js`, `@supabase/ssr`: database, auth, session cookies in Next.js.
- `server-only`: makes a build fail if server code (service role key) is imported into a client component.
- `vitest`: unit tests, required by the plan.
- `tsx`: runs the TypeScript scripts in `scripts/`.
- `exceljs` (dev): reads the CNAM `.xlsx`. Chosen over the npm `xlsx` package, which is no longer updated on npm.
- `@electric-sql/pglite` (dev): runs the migrations and access tests in CI without Docker.
- `supabase` (dev, CLI 3.2.0): applies migrations (`npm run db:push`).
- `@types/node` 22: matches the Node version used here and in CI, and Vitest 5's peer range.
