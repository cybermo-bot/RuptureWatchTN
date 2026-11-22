# Track D: the wholesaler space, and end-to-end tests

Branch: `track-d-wholesaler`. Read `CLAUDE.md`, `docs/PLAN.md`, `docs/CONTRIBUTING.md`, `docs/reports/session-4.md` first.

Target: pull request ready Monday 23 November evening, fixes Tuesday before 18:00.

The wholesaler holds the stock. When a medicine runs short, the wholesaler decides who gets the few boxes left, today by whoever calls first. This space gives a fair split by governorate that the wholesaler can apply or overrule, with a reason that stays on record.

## What already exists

- `/grossiste` with the demo wholesaler role, `governorate_counts`, `demand_by_governorate`, `LevelExplanation`, `GovernorateMap`, the signals.

## Tasks, in order

### 1. What concerns this wholesaler

`/grossiste`: the molecules at "sous surveillance" or above, sorted by level, each with its explanation, the map counts by governorate (counts under 3 as "<3"), and the patient demand. The same data the coordination space reads; reuse its helpers rather than copy them.

### 2. The fair split (pure logic first)

`lib/allocation/` with unit tests before any screen. A pure function:

- Input: the stock available (boxes), for each governorate an estimated monthly use (boxes) and current days of cover, and a hospital reserve share.
- Rule (from our Phase 2.1 design): first the hospital reserve, then the rest split so that the governorates end with days of cover as equal as possible (fill the lowest first), never giving a governorate more than its need for the period.
- Output: boxes per governorate and days of cover before and after.
- The reserve share and the period are design parameters in one file, shown on screen as parameters, not findings.
- Tests: equal needs give equal shares; a governorate already well covered gets nothing until others catch up; stock above total need is capped; zero stock gives zero everywhere; totals always add up.

### 3. The fair split screen

On a molecule at "probable" or "confirmée", "Proposer une répartition":
- The wholesaler types the stock available. Monthly use and days of cover per governorate are **simulated** (nobody publishes them): load them from `supabase/seed/allocation-demo.json`, every value marked simulated, with the "Simulé" badge on the table. Say on screen that a real pilot would take these figures from the wholesaler's own sales.
- Show the split as a table and a before/after view of days of cover by governorate.
- Two actions: "Appliquer" or "Ne pas appliquer", and the second requires a reason (required field, at least a few words).
- The ordering cap and the playbook: "Plafond de commande : en attente de validation clinique."

### 4. The decision log

Migration (you write it, the team lead applies it): `allocation_decisions` with id, molecule_id, organisation_id (the wholesaler), stock, recommended (json, by governorate), applied boolean, deviation_reason, decided_at, origin. Row-level security: a wholesaler inserts and reads its own; coordinators read all. The coordination space's decision log already exists: tell the team lead the table name so it can show these decisions (track A adds that line). Access tests in `tests/db/`.

### 5. End-to-end tests

Playwright in `tests/e2e/`, run against a URL given in an environment variable (a preview or production), not in CI by default:
1. Home, one click on "Pharmacie (Tunis)", report a followed medicine in two taps, see the result screen.
2. One click on "Coordination", see that medicine in the list.
3. `/scenario` plays to "Levée".
4. Once track B is merged: a patient request from `/medicaments`, a pharmacy answer, the pharmacy on the map.
Each test cleans up what it created through `npm run verify:clean`, run by the team lead only, so write the tests to mark their rows as simulated and list what they leave.

## Out of scope

Real stock data, ordering through the platform, any pharmacy-level figure shown to the wholesaler.

## Done checks (on your Vercel preview)

1. `lib/allocation` tests pass, including the five listed.
2. As "Grossiste", a confirmed simulated shortage (ask the team lead to run `demo:shortage`) shows the split for a typed stock, with before/after days of cover and the "Simulé" badge.
3. "Ne pas appliquer" without a reason is refused; with a reason it is saved and appears in the coordinator's log once track A adds the line.
4. No pharmacy name appears anywhere in the wholesaler space.
5. The end-to-end tests 1 to 3 pass against your preview.

Write `docs/reports/track-d.md` with the checks and screenshots at 360 px and 1280 px.
