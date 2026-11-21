# RuptureWatch TN

Read this file, then `docs/PLAN.md`, then the brief for the current session in `docs/briefs/`. Finish every session by writing its report in `docs/reports/`.

## 1. What we are building

RuptureWatch TN is an early warning and coordination platform for medicine shortages in Tunisia.

The core loop, which everything else serves:

1. A pharmacist reports "ordered, not delivered" for a medicine, on a mobile web page or by WhatsApp.
2. The warning logic turns several such reports, plus notices from foreign regulators, into a level for that medicine: sous surveillance, probable, confirmée, levée.
3. The people who can act (pharmacies that sell it, wholesalers, hospital pharmacies, coordinators) receive the warning with the guidance to apply.
4. Every level change and every decision is logged with the rule that fired.

It is a competition prototype (AOTN challenge, TSYP 14, Phase 3, due Wednesday 25 November 2026 at 23:59) built to the standard of a product a ministry could pilot. A jury will open the link, click around without instructions, and judge three things: does the core feature work, is it clearly explained, does the demo video show its value. Depth and correctness beat breadth. A small thing that works perfectly beats a large thing that mostly works.

## 2. Product rules that are never broken

If a task seems to require breaking one, stop and ask.

1. **No pharmacy is ever named to another party.** Coordinator, wholesaler, prescriber and public screens receive counts by governorate only, with counts below 3 shown as "<3". Enforced in database access rules and server code, not only in the interface.
2. **No pharmacy sees another pharmacy's reports, orders or stock.**
3. **No patient data, ever.** No names, no prescriptions, no patient counts.
4. **Every observation row carries an `origin`**: `official_source`, `tester` or `simulated`. The interface shows it as a badge. Simulated data is never displayed without its badge.
5. **No invented figures.** Never hardcode a statistic, count, date or quote to fill a screen. Missing data gets an honest empty state. Seed data lives in named seed files and is marked `simulated`.
6. **Gate one:** foreign notices alone never raise a medicine above "sous surveillance".
7. **Gate two:** "confirmée" needs at least four pharmacies in at least two governorates.
8. **Every alert carries the line** "Ceci n'est pas une déclaration officielle de rupture."
9. **No institutional endorsement is implied.** No logos of the Pharmacie Centrale, CNAM, the Ministry of Health, the medicines agency (ANMPS) or the Order of Pharmacists. Their spaces are labelled "conçu pour", never "utilisé par". Demo organisations have obviously fictional names ("Pharmacie démo A, Sfax").
10. **The public never sees a risk score or where stock is.** Public pages show confirmed status and guidance only.
11. **You do not write clinical text.** Switch advice, patient guidance and dosing never come from you. Where such text would go, show "En attente de validation clinique" unless the team supplies a reviewed file.

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
- **French interface.** All text lives in `messages/fr.json`, never inline in components, so Arabic can be added later. Layout must survive right-to-left.
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
| Map | SVG from an open governorate boundary file. No tile provider. |

Use current stable versions. Check official documentation for anything that may have changed, especially Meta's and Supabase's APIs. Do not add a dependency without one line in `docs/DECISIONS.md` saying why.

## 6. Repository layout

```
app/                  Next.js routes
components/           UI components
lib/signal/           warning logic (do not duplicate)
lib/db/               database access helpers
lib/whatsapp/         Cloud API client and message parsing
messages/fr.json      all interface text
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
- Do not describe work as done if its check did not pass on the deployed site.

## 8. Working on this machine

- Windows. The repository is `C:\Users\fatna\AOTN`, outside OneDrive. Never move it into a OneDrive folder.
- Shell is PowerShell, or Git Bash if installed. Write npm scripts that work on Windows (no `rm -rf`; use cross-platform tools).
- The empty `starter/` folder left from setup can be deleted.

## 9. Design direction

The interface should look designed by a person for a clinical setting: calm, typographic, exact. It must not look like a template or like AI-generated slides.

Do:

- White and cool light grey surfaces, deep green-black text.
- One brand colour, used sparingly. The only saturated colours are the four levels.
- Lists and tables separated by hairlines, not stacks of cards.
- IBM Plex Sans for text, IBM Plex Mono for codes. Load with `next/font`.
- One consistent text style per sentence. Emphasis by weight only, and rarely.
- Generous spacing, tap targets of 48 px minimum, clear hierarchy.
- The governorate map is the one strong visual.

Do not:

- Cream or beige backgrounds, orange-and-blue pairings, gradients, glass effects, shadows everywhere.
- A box around every element. Giant numbers sitting on rules as decoration.
- Italic or coloured words inside a heading. Emoji as icons. Stock illustrations.

Tokens (adjust only for contrast):

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#10201B` | text |
| `--ink-muted` | `#55635E` | secondary text |
| `--surface` | `#FFFFFF` | page |
| `--surface-subtle` | `#F3F6F5` | bands, table headers |
| `--line` | `#DCE3E0` | hairlines |
| `--brand` | `#0E6B57` | primary action, links |
| `--level-watch` | `#B58A00` | sous surveillance |
| `--level-likely` | `#C95A14` | probable |
| `--level-confirmed` | `#B42318` | confirmée |
| `--level-cleared` | `#2F7D4F` | levée |

Each level is always a shape plus a word, never colour alone: watch an open circle, likely a half-filled circle, confirmed a filled circle, cleared a check mark.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
