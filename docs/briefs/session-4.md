# Session 4: the coordination space and the showcase

Read `CLAUDE.md`, `docs/PLAN.md` and `docs/reports/session-2.md` first. Start after `docs/briefs/shared-foundations.md` is done.

This is what the jury will remember: the people who can act see the whole picture, and a stranger can watch the warning logic work, on real past shortages and on a simulated week, in two minutes.

## Data the team supplies

Two files arrive in `data/reference/` on Sunday. Build against their format now; until they exist, show an honest empty state ("Données en cours de constitution"), never sample rows.

`episodes.csv`, one row per documented past shortage in Tunisia:
`molecule_dci, episode_label, tn_first_report_date, tn_first_report_source, tn_first_report_url, tn_end_date, tn_end_url, foreign_regulator, foreign_first_notice_date, foreign_notice_url, notes`
(dates as YYYY-MM-DD; end and foreign fields may be empty: an empty foreign date is a miss, shown as such).

`foreign_notices.csv`, one row per regulator notice:
`molecule_dci, source, status, published_date, url` (status: `shortage`, `tension` or `resolved`).

Write `scripts/import-notices.ts` (dry run by default, `--apply` to write) that loads `foreign_notices.csv` into `foreign_notices` with `origin = official_source`, matching `molecule_dci` against `molecules.name` exactly and listing every row that does not match, then recomputes the affected molecules.

## Tasks

### 1. Coordination space (`/coordination`)

- The governorate map (`GovernorateMap`) for the selected molecule, from `governorate_counts`, counts under 3 as "<3", with a legend.
- The list of molecules with an active level, sorted confirmed, likely, watch, then cleared; each row opens its explanation (`LevelExplanation`), its active foreign notices with links, and its timeline of level changes from `signal_events`.
- Next to each signal, the demand from patients (`demand_by_governorate`): requests and unanswered requests in the last 7 days. Requests never change the level; say so in one line under the panel.
- The event log: every level change, newest first, with the rule that fired.
- Export: CSV and JSON of signals and counts by governorate, aggregates only, documented on a short page `/coordination/export` (columns, meaning, origin of each field).
- The hospital pharmacy space shows the same list and map without the export.

### 2. One shortage, four views (`/vues/[moleculeId]`)

Four panels side by side on a laptop, stacked on a phone: what the pharmacy, the wholesaler, the coordination unit and the public see for the same molecule. Each panel's data must come from the same server functions and access rules that role uses, run as that role's demo account, not from a shared query reshaped on screen. One line above: "Chaque panneau montre exactement ce que ce rôle reçoit, rien de plus." Linked from the home page.

### 3. The scenario (`/scenario`)

- A "Lancer le scénario" button that plays `buildScenario()` from `lib/signal` in the browser, one step every few seconds, through `evaluate()`: the level, the explanation, the map counts, and which roles would receive an alert at each change, ending at "Levée" with the stand-down.
- Runs entirely in memory: it writes nothing to the database, so it never pollutes real or tester data and needs no reset beyond "Recommencer". Every element carries the "Simulé" badge.
- Controls: play, pause, step, restart. Linked from the home page as the first thing a visitor can try.

### 4. The time machine (`/retour`)

- From `episodes.csv`: for each episode, a horizontal timeline with the foreign notice date, the first Tunisian report date and the end date, the lead in days between the first two, and the source link for every date. Misses (no earlier foreign notice) shown plainly as misses.
- At the top, the counts computed from the file: episodes, episodes with an earlier foreign notice, median lead in days. No number is typed by hand.
- A slider that moves a date cursor across one episode and shows the level `evaluate()` would have given on that date from the foreign notice alone (which can only be "sous surveillance", by gate one) and says so.

### 5. The methods page (`/methode`)

Public, in French. The levels and rules, with every threshold read from `lib/signal/params.ts` (never typed); the two gates; what counts as a report; the list of what the platform never does (from `CLAUDE.md` section 2, in plain French); what is real and what is simulated, with the origin badges; the data sources from `data/SOURCES.md` with licences. A link to it from every level explanation.

## Fixes first (from session 2's questions)

1. The demo pharmacies also follow ACIDE VALPROIQUE.
2. No API path gives a signed-in non-service caller an exact count under 3. Expose signals to the app through a function or view that returns counts under 3 as `<3`, and remove direct reads of exact counts. Access tests prove it.
3. The impact count keeps the reporting pharmacy, worded "Avec la vôtre, N pharmacies…" (N under 3 shown as "moins de 3").
4. Restart tester numbering at 1. Add to `npm run verify:clean` so it resets the counter too.

## Done checks (deployed site)

1. As Coordination, after two demo reports on a molecule, the map and the list update without reload, counts under 3 show "<3", and the demand panel shows.
2. `/vues/[moleculeId]` shows four panels; a test proves each panel's data came through that role's own access path; no pharmacy name appears in any panel but the pharmacy's own.
3. `/scenario` plays from start to "Levée" in under two minutes and restarts cleanly; the database has no new rows afterwards.
4. `/retour` and `/methode` render; with `episodes.csv` absent, `/retour` shows the empty state.
5. The four fixes are in, with tests. All earlier tests pass; `lib/signal` is unchanged.

Write `docs/reports/session-4.md` with screenshots at 360 px and 1280 px.
