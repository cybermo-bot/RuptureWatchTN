# RuptureWatch TN

Read this file, then `docs/PLAN.md`, then the brief for your session or track in `docs/briefs/`. Finish every session by writing its report in `docs/reports/`.

## 1. What we are building

RuptureWatch TN is an early warning and coordination platform for medicine shortages in Tunisia.

The core loop, which everything else serves:

1. A pharmacist reports "ordered, not delivered" for a medicine, on a mobile web page or by WhatsApp.
2. The warning logic turns several such reports, plus notices from foreign regulators, into a level for that medicine: sous surveillance, probable, confirmée, levée.
3. The people who can act (pharmacies that sell it, wholesalers, hospital pharmacies, coordinators) receive the warning with the guidance to apply.
4. Every level change and every decision is logged with the rule that fired.

The public side, which makes it shared intelligence and not only a professional tool:

5. A patient asks the pharmacies near them whether they have a medicine. No account, no name, no phone number. Participating pharmacies answer in one tap, "disponible" or "pas disponible", and each time choose whether to show their name and address to that patient. The patient sees a map of the pharmacies that said yes.
6. Every request is stored anonymously (molecule, rough area, time) and becomes a demand signal the coordination unit sees by governorate, including how many requests went unanswered. Requests never change a level.
7. Around this: the verified status of a medicine in plain words (the rumour check), other brands of the same molecule from the CNAM list, "Préviens-moi" kept on the patient's phone only, a map of the pharmacies open around the patient from the Google Places API (OpenStreetMap as fallback), the archive of past shortages, a quick status check for prescribers, and a Library showing the French over-the-counter status as a clearly labelled demonstration.

It is a competition prototype (AOTN challenge, TSYP 14, Phase 3, due Wednesday 25 November 2026 at 23:59) built to the standard of a product a ministry could pilot. A jury will open the link, click around without instructions, and judge three things: does the core feature work, is it clearly explained, does the demo video show its value. Depth and correctness beat breadth. A small thing that works perfectly beats a large thing that mostly works.

## 2. Product rules that are never broken

If a task seems to require breaking one, stop and ask.

1. **No pharmacy is ever named to another party, with one exception.** Coordinator, wholesaler and prescriber screens receive counts by governorate only, with counts below 3 shown as "<3". The exception: when a participating pharmacy answers a patient's availability request, it may choose, for that answer only, to show its name and address to that patient. Enforced in database access rules and server code, not only in the interface.
2. **No pharmacy sees another pharmacy's reports, orders or stock.**
3. **No patient data, ever.** No names, no prescriptions, no patient counts. Public visitors are anonymous: no account, no name, no phone number. An availability request stores only the molecule, a rough area (governorate or delegation, never exact coordinates) and the time. The patient's position is used on the device and for the map search only, and is never stored by us. "Préviens-moi" is stored on the visitor's device only.
4. **Every observation row carries an `origin`**: `official_source`, `tester` or `simulated`. The interface shows it as a badge. Simulated data is never displayed without its badge.
5. **No invented figures.** Never hardcode a statistic, count, date or quote to fill a screen. Missing data gets an honest empty state. Seed data lives in named seed files and is marked `simulated`.
6. **Gate one:** foreign notices alone never raise a medicine above "sous surveillance".
7. **Gate two:** "confirmée" needs at least four pharmacies, or 2 % of the active member pharmacies when the network is larger (`confirmMemberShare`), in at least two governorates. Patient requests never change a level: they are shown as demand, next to the signal.
8. **Every alert carries the line** "Ceci n'est pas une déclaration officielle de rupture."
9. **No institutional endorsement is implied.** No logos of the Pharmacie Centrale, CNAM, the Ministry of Health, the medicines agency (ANMPS) or the Order of Pharmacists. Their spaces are labelled "conçu pour", never "utilisé par". Demo organisations have obviously fictional names ("Pharmacie démo A, Sfax"). Real pharmacies shown in the directory (from Google Maps, or OpenStreetMap as fallback) are labelled as listed from public map data and not participating, unless they joined.
10. **The public never sees a risk score, a level below "confirmée", or stock quantities.** Public pages show: confirmed status and guidance, availability answers that pharmacies chose to give, the pharmacy directory, same-molecule brands, the archive of past shortages, and the Library. Below "confirmée" a medicine reads "Aucune rupture confirmée à ce jour".
11. **You do not write clinical text.** Switch advice, patient guidance and dosing never come from you. Where such text would go, show "En attente de validation clinique" unless the team supplies a reviewed file. Never suggest a different molecule as an alternative. Other brands of the same molecule come only from the CNAM list and always carry "Ne changez pas de marque sans l'avis de votre pharmacien ou de votre médecin."
12. **Data from abroad says where it comes from.** Foreign notices name their regulator. The Library's over-the-counter status comes from the French public medicines database and always carries "Statut en France, pas en Tunisie. Ne l'utilisez pas pour décider d'un traitement." It never appears inside the patient request flow and never as a suggestion.
13. **Google Maps content follows Google's terms.** Pharmacy listings, hours and places come from the official Google Places API, fetched live each time. Never store, cache or copy them, except Google's place IDs. Show them only on a Google Map, with Google's attribution. Never use them to build our own lists or statistics, and never put them on a non-Google map. Never scrape Google Maps. Every Google API call goes through our server or a key restricted to our domains, with daily quota caps set in the Google Cloud console.

## 3. The warning logic is already written

`lib/signal/` holds the warning logic as pure TypeScript functions, with 31 passing tests in `tests/signal.test.ts`. It was written and reviewed outside this repository.

- Use it. Do not reimplement any rule elsewhere: the web app, the WhatsApp bot, the simulator and the replay all call `evaluate()`.
- Do not change a rule or a threshold without changing its test and writing the reason in `docs/DECISIONS.md`.
- Thresholds are in `lib/signal/params.ts`. They are design parameters, shown on the methods page.

## 4. Product principles

- **Two taps or it does not ship.** The pharmacist is at a counter with a queue. Reporting takes two taps after the medicine is found.
- **Type it the way you say it.** Search accepts brand names, molecule names, half words and misspellings. Fuzzy matching (`pg_trgm`) against the national catalogue.
- **The reporter always gets something back.** After a report, the pharmacist sees what it changed.
- **Explain every level.** Wherever a level is shown, one tap reveals why: which rule fired, how many pharmacies, how many governorates, which foreign notice.
- **A stranger understands it in two minutes.** One-click demo roles, no password, a "run the scenario" button, plain French.
- **Works on a modest Android phone on mobile data.** Design at 360 px first. Keep pages light.
- **French interface, public pages in French and Arabic.** All text lives in `messages/fr/<namespace>.json` and `messages/ar/<namespace>.json`, keys prefixed by namespace (`public.request.title`), never inline in components. Public pages switch to Arabic with correct right-to-left layout; the professional spaces stay in French.
- **Honest by default.** Limits, unknowns and simulated data are stated in the interface, in plain words.

## 5. Stack

| Layer | Choice |
| --- | --- |
| Web app | Next.js (App Router), TypeScript strict, hosted on Vercel |
| Styling | Tailwind CSS with the design tokens below as CSS variables |
| Database, auth, access rules | Supabase (PostgreSQL, row-level security, `pg_trgm`) |
| Warning logic | `lib/signal/`, pure functions, already written |
| Tests | Vitest (unit), Playwright (core flow, later session) |
| Data scripts | Node/TypeScript scripts in `scripts/`. Python only if a source truly needs it. |
| WhatsApp | Meta WhatsApp Cloud API called directly, webhook as a Next.js route |
| Map | SVG from an open governorate boundary file for the coordination view. Patient maps (pharmacies open nearby, pharmacies that answered a request) use the Google Maps JavaScript API with the Places API, under rule 13. Fallback when Google is unavailable or over quota: a light map library with OpenStreetMap tiles and an OpenStreetMap pharmacy list, attribution shown. |
| Data sources | CNAM reimbursed medicines list (catalogue). Google Places API for pharmacy listings, live, under rule 13. OpenStreetMap pharmacies via an Overpass export (ODbL, attribution required) as fallback only. French public medicines database for the Library (Licence Ouverte, source and date required). |

Use current stable versions. Check official documentation for anything that may have changed, especially Meta's and Supabase's APIs. Do not add a dependency without one line in `docs/DECISIONS.md` saying why.

## 6. Repository layout

```
app/                  Next.js routes
components/           UI components
lib/signal/           warning logic (do not duplicate)
lib/db/               database access helpers
lib/whatsapp/         Cloud API client and message parsing
messages/fr/<ns>.json all interface text, French, one file per namespace (core, public, directory, library, wholesaler)
messages/ar/<ns>.json Arabic, public namespaces only (public, directory, library)
supabase/migrations/  SQL migrations, numbered
supabase/seed/        seed files, all rows marked simulated
scripts/              data import scripts
data/raw/             downloaded source files, never edited by hand
data/reference/       cleaned files produced by scripts
data/SOURCES.md       every source: URL, date fetched, licence
docs/PLAN.md          the plan
docs/briefs/          one brief per session
docs/reports/         one report per session
docs/DECISIONS.md     decisions and reasons, newest first
tests/                unit and end-to-end tests
```

## 7. Engineering rules

- Small commits with plain messages, one concern each.
- No secret in the repository, logs or client code. `.env.local` is git-ignored; `.env.example` lists names only.
- The Supabase service role key is used only in server code and scripts, never in a client component.
- Every database change is a migration file. No manual changes in the dashboard.
- Every table has row-level security enabled in the migration that creates it.
- CI runs lint, type check and tests on every push. A red CI is fixed before anything else.
- Accessibility: semantic HTML, visible focus, labelled inputs, WCAG AA contrast, never colour alone to carry meaning.
- When blocked or unsure, stop and write the question in the session report. Do not guess, do not stub with fake values, do not widen the task.
- Several people build in parallel, each on one track. Work on your track's branch, never on `main`; open a pull request when your checks pass. Write migrations in your branch but do not apply them to the live database: the team lead applies them. Keep to your track's route folders. Add interface texts under your track's own key prefix in the message files, to avoid merge conflicts.
- Do not describe work as done if its check did not pass on the deployed site.

## 8. Working on this machine

- Windows. The repository is `C:\Users\fatna\AOTN`, outside OneDrive. Never move it into a OneDrive folder.
- Shell is PowerShell, or Git Bash if installed. Write npm scripts that work on Windows (no `rm -rf`; use cross-platform tools).
- The empty `starter/` folder left from setup can be deleted.

## 9. Design direction

The interface should look designed by a person for a clinical setting: calm, exact, alive. Two kinds of surface share one identity (session 6, `docs/DECISIONS.md`).

**The presentation surfaces, `/` and `/scenario`, tell the story of one decision on a plum stage.**

- Home: a 5/7 split on plum. Left: "Démonstration · données simulées", the heading "Du premier signal à la décision", one sentence, the citron "Voir le scénario" button and the "Choisir un rôle" link. Right: one frozen moment of the scenario computed from `scenarioFrames()` (the governorates that reported on the Tunisia map, the state line, the source of the picture). On phones the heading and the button come first; at 360 × 800 the button is in the first screen. Below: "Ce que voit la cellule nationale" (simulated signals only, rule 10), then the roles in three groups, then "Comprendre".
- Scenario: two editorial regions. On plum, the controls (play, previous, next, restart, the step as text, the keyboard shortcuts), the state timeline annotated at the level changes, and the event that just happened. Beside it, "Pourquoi ce niveau ?" and "Qui peut agir ?". Manual playback by default; one short pulse on a level change; nothing moves under `prefers-reduced-motion`.
- Citron (`--citron`) appears only on plum, and only for the current scenario position or the primary launch button.

**Professional spaces look like an operations console, and stay sober.**

- A fixed left rail in plum (`--sidebar`): the logo, the role's name and organisation with its origin badge, the space's sections as navigation items with icons, and "Changer de rôle" at the bottom. On phones it becomes a bottom tab bar (pharmacy) or a top drawer (other roles).
- Lavender paper (`--page`) with white panels; violet (`--brand`) marks the action, the current selection or a meaningful state, nothing else.
- A compact strip of key figures at the top of each dashboard: a label, the value, a 14-day sparkline, all computed. No decorative giant numbers, no animated counters.
- Panels group related content: white, 1 px `--line` border, 8 px radius, no shadow. Lists and tables inside a panel stay separated by hairlines.
- Live feel: when a level changes, the governorate on the map and the row in the list pulse once and a small toast says what changed. Transitions of 150 to 250 ms. `prefers-reduced-motion` turns motion off, never the information.
- Charts only where they carry information, drawn as server-rendered SVG with `d3-scale` or plain HTML: a level timeline per medicine, reports per day, patient demand per day, the two splits side by side for wholesalers. Every chart has a text equivalent.

**The pharmacy space and the public pages feel like a mobile app.**

- At 360 px: an app header, a bottom tab bar (pharmacy: Signaler, Mes médicaments, Alertes, Plus), a large search field, rows you tap across the whole width, a clear primary action fixed at the bottom of a flow.
- The report flow keeps its two taps, states the 72-hour rule in plain words at the timing choice, and ends on "Signalement reçu", "Ce que votre signalement a changé", "Prochaine action".
- The pharmacy space is installable (web app manifest); the install help lives under "Plus", not above the work.
- A simulated status or arrival carries "Simulation" in its heading block, on the public medicine page and the wholesaler split page.

**Identity.**

- Our own logo mark, drawn in SVG (`components/brand/Logo.tsx`): an open ring broken at one point, with the dot that escapes it, the moment a shortage is caught before it reaches the counter. No cross, no pill, no institution's symbol. Used in the rail, the favicon and the share cards.
- One icon set, Lucide (`lucide-react`), used everywhere. Icons sit next to words, never instead of them.
- IBM Plex Sans for text (with its Arabic variant), IBM Plex Mono for codes, timestamps and aligned numbers. Loaded with `next/font`. Home heading 32–36 px on phones, 48–56 px on desktop; workspace headings 24–28 px; body 16 px. One text style per sentence; emphasis by weight only, and rarely.
- Tap targets of 48 px minimum, visible focus (citron on plum), WCAG AA contrast, on plum too.

**Never:** cream or beige backgrounds, orange-and-blue pairings, gradients as decoration, glass effects, shadows everywhere, emoji as icons, stock illustrations, animated counters, italic or coloured words inside a heading, giant numbers as decoration, citron on a light surface.

Tokens (adjust only for contrast; ratios in `app/globals.css`):

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#241834` | text |
| `--ink-muted` | `#665775` | secondary text |
| `--surface` | `#FFFFFF` | panels, public pages |
| `--page` | `#F7F4FC` | lavender paper, console content area |
| `--surface-subtle` | `#ECE6F7` | bands, table headers, selected rows |
| `--line` | `#DDD4EA` | hairlines, panel borders |
| `--stage` / `--sidebar` | `#261638` | plum stage (home, scenario), console rail |
| `--stage-raised` | `#35204C` | raised surface on plum |
| `--on-stage` / `--on-stage-muted` | `#F9F4FF` / `#D5C7E4` | text on plum |
| `--brand` / `--brand-strong` | `#4D36C8` / `#38249C` | action, pressed |
| `--citron` | `#DFF576` | one accent on plum only |
| `--level-watch` | `#8B5900` | sous surveillance |
| `--level-likely` | `#A94412` | probable |
| `--level-confirmed` | `#AE233A` | confirmée |
| `--level-cleared` | `#216D54` | levée |

On plum the levels use lighter tints (`--level-*-on-stage`, 7:1 or more). Each level is always a shape plus a word, never colour alone: watch an open circle, likely a half-filled circle, confirmed a filled circle, cleared a check mark.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
