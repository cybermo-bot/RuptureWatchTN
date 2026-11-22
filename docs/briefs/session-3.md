# Session 3 (track A): WhatsApp, demo data and integration

Read `CLAUDE.md`, `docs/PLAN.md`, `docs/reports/session-4.md` first. Work on `main`. Apply each migration before pushing the code that needs it.

## 1. Demo shortage scripts (first, the other tracks need them)

- `npm run demo:shortage`: on one molecule that testers are not using (pick one from the CNAM list with several brands, write its name in the report), insert simulated reports from demo pharmacies in at least two governorates so it reaches "confirmée", recompute, and add a few simulated patient requests. Every row `origin = simulated`.
- `npm run demo:clear`: removes exactly what `demo:shortage` created, nothing else, and resets that molecule's signal.
- One line on `/vues`: "Démonstration : comptes et données de démonstration."

## 2. WhatsApp bot

Only with the Meta values in `.env.local` and Vercel. Without them, build and test with the recorded fixtures and list the manual steps.

- Linking: a pharmacy links its WhatsApp number from its space (it types the number, receives a 6-digit code on WhatsApp, types it back). Store the number only as the salted hash already used for `wa_inbound`, plus what is needed to reply. Unlinked numbers get a short message with the link to the web app.
- Report: "Signaler" opens a WhatsApp list of the pharmacy's followed medicines (the list message type, up to 10 rows), then buttons "Il y a 3 jours", "4 à 7 jours", "Plus d'une semaine", "Moins de 3 jours". Same rules and same `recomputeSignal` as the web, `channel = whatsapp`. Reply with the level and the explanation, as on the web result screen.
- Search: typing a medicine name answers with the closest matches from `search_medicines` as a list to pick from.
- Alerts: when a followed molecule changes level, send the alert to linked pharmacies. Outside the 24-hour window this needs an approved **utility template**: create it in Meta's WhatsApp Manager on day one (approval can take hours), text in French, with the disclaimer line. Until approved, alerts go only to pharmacies that wrote in the last 24 hours, and the report says so.
- Availability requests (after track B merges): a linked pharmacy receives the patient request with three buttons, the same three answers as on the web.
- Never put anything about a patient in a WhatsApp message. Tests with Meta's payload shapes for lists and buttons.

## 3. Integration of tracks B, C and D

As their pull requests arrive:
- Review against their brief's done checks and `CLAUDE.md`. Merge small and often.
- Apply their migrations to the live database after merging, in order, before their code is deployed.
- Track D's `allocation_decisions`: show them in the coordination decision log.
- Track B's prescriber role: check the change to `lib/demo/roles.ts`.
- After each merge, run `npm run check` on `main` and the live tests, and check the deployed site.

## 4. Data files

When `data/reference/episodes.csv` and `data/reference/foreign_notices.csv` arrive: commit them, run `npm run notices:import` (dry run), report unmatched names, then `--apply`.

## Done checks

1. `demo:shortage` then `demo:clear` leaves the database exactly as before (test it).
2. With the Meta values: a linked demo pharmacy reports by WhatsApp in four taps, the level changes on the coordination page, and the reply shows the explanation.
3. Every merged track's checks pass on https://rupturewatch-tn.vercel.app.

Write `docs/reports/session-3.md`.
