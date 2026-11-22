# Session 2: the pharmacy flow and the live signal

Read `CLAUDE.md`, `docs/PLAN.md` and `docs/reports/session-1.md` first. Start only when session 1's done checks pass on the deployed site.

Target: done by Sunday 22 November. This session makes the core loop real: a pharmacist reports, the level changes, the people concerned are alerted, and the pharmacist sees what the report changed.

## Answers to session 1's questions

1. `governorate_counts` repeating the counting rule in SQL is accepted, with the parity test kept.
2. Pharmacies do not get the governorate map. They get their own impact through a new function, `report_impact(molecule_id)` (task 3).

## Content supplied by the team

- `docs/content/guidance.fr.json`: guidance per level, the disclaimer line, the stand-down message, the "too early" message. Use it word for word. Show its review status where the guidance appears.
- `docs/content/rules.fr.json`: one sentence per rule of `lib/signal`, explaining a level. Merge both files into `messages/fr.json` (keep the source files; add a test that every `RuleId` has a sentence).

## Tasks, in order

### 1. The signal service

`lib/signals/recompute.ts`, server only, called with the service role:

- `recomputeSignal(moleculeId, now)`: load the molecule's reports and foreign notices of the last 120 days, the current row of `signals`, call `evaluate()` from `lib/signal`, then:
  - upsert `signals` with level, since, rule and the evidence as **counts only** (pharmacies14d, governorates14d, pharmacies7d, deliveredAgainPharmacies, ignoredTooEarly, lastNotDeliveredAt, and for each active notice: source, status, publishedAt, url);
  - if the level changed, append a `signal_events` row and create `alerts` rows: every pharmacy that follows the molecule, plus every wholesaler, hospital pharmacy and coordinator organisation. Stand-downs are alerted the same way.
- Concurrency: two reports on the same molecule at the same moment must not produce a duplicate or skipped event. Use optimistic concurrency on `signals` (update only if the level and `updated_at` are still what was read, otherwise reload and retry), or an equivalent. Test it.
- Inject the data access so the function is unit tested without a network, and also run it once against PGlite in `tests/db/`.
- Every report insert (web now, WhatsApp in session 3) calls it.
- A daily cron route `/api/cron/recompute` re-evaluates every molecule that has a signal row, so time-based rules (quiet period, stale, cleared expiry) apply without new reports. Protect it with a `CRON_SECRET` header. Add it to `vercel.json`.

### 2. Followed medicines

- `/pharmacie` shows "Mes médicaments suivis": one hairline row per molecule with its `LevelBadge`, the since date, and a tap that opens the molecule page.
- Add and remove through the fuzzy search from session 1. Searching shows medicines; following stores the molecule.
- Seed follows for the two demo pharmacies (in `supabase/seed/`): levetiracetam, carbamazepine, valproate de sodium, lamotrigine, levothyroxine and the insulins found in the catalogue. Check the exact DCI spellings in the imported catalogue; never guess them.
- Empty state for a pharmacy that follows nothing yet, with the search right there.

### 3. Report in two taps

- A primary button on `/pharmacie`: "Signaler une commande non livrée".
- Tap 1: pick the medicine (followed molecules first as large rows, search below).
- Tap 2: when was it ordered: "Il y a 3 jours", "4 à 7 jours", "Plus d'une semaine", "Moins de 3 jours". The first three insert the report immediately with `ordered_at` set to now minus 3, 5 or 8 days. "Moins de 3 jours" inserts nothing and shows the "too early" message.
- The report is inserted with the user's session (row-level security applies), then `recomputeSignal` runs on the server.
- On the molecule page, when the level is likely or confirmed and this pharmacy has reported it before, a second action: "Livré à nouveau" (one tap, kind `delivered_again`).
- After any report, the result screen:
  - the level before and after, with `LevelBadge`;
  - the explanation sentence for the rule that fired;
  - the impact: "Votre signalement s'ajoute à N pharmacies dans M gouvernorats sur les 14 derniers jours", from `report_impact`;
  - the guidance for the level, the disclaimer line, and the review status.
- `report_impact(molecule_id)`: a `security definer` SQL function callable by pharmacies only, returning the national number of distinct reporting pharmacies (as `<3` under 3) and the number of governorates, never ids or names. Same window and delay as `governorate_counts`, passed from `lib/signal/params.ts`. Access tested.
- Tighten the reports insert policy: `origin` must equal the reporting organisation's own `origin`.

### 4. Molecule page and explanations

- `/pharmacie/molecule/[id]`: level badge, since, the explanation sentence, the active foreign notices with their links and `OriginBadge`, this pharmacy's own reports for it (date, kind, channel), follow or unfollow, the report actions.
- A reusable `LevelExplanation` component built from the evaluation's rule and counts. Coordinators and wholesalers will reuse it in session 4.

### 5. Alerts

- An "Alertes" tab on `/pharmacie` with an unread count. Each alert: molecule, from and to level, when, the explanation, the guidance, the disclaimer line. Stand-downs look distinct but calm.
- Marking read updates `read_at`.
- Live updates: subscribe to the organisation's `alerts` with Supabase Realtime (row-level security applies), or poll every 15 seconds if Realtime is not reliable on the free plan. Note which in `docs/DECISIONS.md`.

### 6. Tester onboarding

Real pharmacists will test on Monday and Tuesday. Their reports must be marked `tester`, not `simulated`.

- `/rejoindre/[code]`: valid only with `TESTER_INVITE_CODE` from the server environment. The tester picks a governorate. Nothing else is asked: no name, no pharmacy name, no phone number.
- It creates an organisation of type pharmacy, `origin = tester`, display name "Pharmacie testeuse n° N, <gouvernorat>", and a user linked to it (Supabase anonymous sign-in is fine; enable it in the dashboard as a manual step). The tester lands on `/pharmacie` with an empty follow list.
- A QR code for the invite link on a page only the coordinator role can open (`/coordination/invitation`), to show on a phone during a test.

### 7. Coordinator preview (small)

Session 4 builds the full dashboard. For now, `/coordination` lists molecules with a signal row (level, since, explanation) and refreshes within 5 seconds of a report, so the core loop can be shown end to end.

## Out of scope

WhatsApp beyond what session 1 built (session 3), the map and the dashboard design (session 4), wholesaler allocation and the public page (session 5), foreign notice import (the team supplies a file on Sunday).

## Done checks (on the deployed site, on a phone)

1. As "Pharmacie (Tunis)", report levetiracetam in two taps from the home of the space. The result screen shows the level, the explanation and the impact.
2. "Moins de 3 jours" sends nothing and shows the "too early" message.
3. With reports from four pharmacies in two governorates (two demo accounts plus two tester accounts made through `/rejoindre`), the molecule reaches "Confirmée". `signal_events` holds the steps none, watch, likely, confirmed. Both demo pharmacies see the alert with the disclaimer line.
4. "Livré à nouveau" from two pharmacies, then the cron route run with a `now` 15 days later in a test, gives "Levée" and a stand-down alert.
5. A tester's reports carry the "Testeur" badge; a demo pharmacy's carry "Simulé".
6. No response sent to a pharmacy contains another organisation's id or name (test on the server functions and on `report_impact`).
7. The concurrency test passes. All earlier tests still pass. `lib/signal` is unchanged.

## Session report

Write `docs/reports/session-2.md` with: each done check and how it was verified, what was built, decisions, open questions, manual steps for the team lead (anonymous sign-ins, `TESTER_INVITE_CODE`, `CRON_SECRET`). Include three phone screenshots: the report flow, the result screen, an alert.
