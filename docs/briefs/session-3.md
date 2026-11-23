# Session 3 (track A): network share, WhatsApp, demo data and integration

Read `CLAUDE.md`, `docs/PLAN.md`, `docs/reports/session-4.md` first. Work on `main`. Apply each migration before pushing the code that needs it.

## 1. Thresholds: keep them, make the bar scale (first, everything below depends on it)

The thresholds in `lib/signal/params.ts` stay as they are: 72 hours, likely with 2 pharmacies in 7 days, confirmed with 4 pharmacies in 2 governorates within 14 days, 2 delivered_again to clear. They are the bar for the top level only; watch and likely show earlier. They stay design values, to be calibrated in a pilot, and the methods page says so.

Scaling with the network. Add `confirmMemberShare: 0.02` to `SignalParams`. `evaluate()` takes an optional `activeMemberPharmacies` (member pharmacies with at least one report or login in the last 90 days, simulated accounts excluded). Pharmacies needed for confirmed = max(`confirmMinPharmacies`, ceil(`confirmMemberShare` x `activeMemberPharmacies`)). When the count is missing, the floor applies. With today's network the floor (4) always wins; with 1,500 active members the bar would be 30. The store passes the count; `evaluate()` stays pure.

- Tests in `tests/signal.test.ts`: add tests for the share (floor wins at 100 members, share wins at 1,500, missing count means floor). Where you touch existing tests, read the numbers from `DEFAULT_PARAMS` instead of literals.
- Add a `docs/DECISIONS.md` entry for the network share.
- Update the texts that describe the confirmed rule (`CLAUDE.md`, `AGENTS.md`, the methods page, `docs/content/*.json`) to mention the share: "au moins 4 pharmacies, ou 2 % des pharmacies membres actives si le réseau est plus grand, dans au moins 2 gouvernorats". Pages read the values from `DEFAULT_PARAMS` wherever they can.

## 2. Demo shortage scripts (the other tracks need them)

- `npm run demo:shortage`: on one molecule that testers are not using (pick one from the CNAM list with several brands, write its name in the report), insert simulated not_delivered reports from at least 12 simulated pharmacies in at least 4 governorates, spread over several days, so it reaches "confirmée" and keeps spreading (a fuller map for the video). If the demo seed has fewer pharmacies, create simulated pharmacies (`origin = simulated`, plausible names like "Pharmacie démo 07, Sousse", no real pharmacy names). Recompute, and add a few simulated patient requests. Every row `origin = simulated`.
- `npm run demo:clear`: removes exactly what `demo:shortage` created (reports, requests and the pharmacies it created), nothing else, and resets that molecule's signal.
- One line on `/vues`: "Démonstration : comptes et données de démonstration."

## 3. WhatsApp bot

Only with the Meta values in `.env.local` and Vercel. Without them, build and test with the recorded fixtures and list the manual steps.

- Linking: a pharmacy links its WhatsApp number from its space (it types the number, receives a 6-digit code on WhatsApp, types it back). Store the number only as the salted hash already used for `wa_inbound`, plus what is needed to reply. Unlinked numbers get a short message with the link to the web app.
- Report: "Signaler" opens a WhatsApp list of the pharmacy's followed medicines (the list message type, up to 10 rows), then buttons "Il y a 3 jours", "4 à 7 jours", "Plus d'une semaine", "Moins de 3 jours". Same rules and same `recomputeSignal` as the web, `channel = whatsapp`. Reply with the level and the explanation, as on the web result screen.
- Search: typing a medicine name answers with the closest matches from `search_medicines` as a list to pick from.
- Alerts: when a followed molecule changes level, send the alert to linked pharmacies. Outside the 24-hour window this needs an approved **utility template**: create it in Meta's WhatsApp Manager on day one (approval can take hours), text in French, with the disclaimer line. Until approved, alerts go only to pharmacies that wrote in the last 24 hours, and the report says so.
- Availability requests (after track B merges): a linked pharmacy receives the patient request with three buttons, the same three answers as on the web.
- Never put anything about a patient in a WhatsApp message. Tests with Meta's payload shapes for lists and buttons.

## 4. Integration of tracks B, C and D

As their pull requests arrive:
- Review against their brief's done checks and `CLAUDE.md`. Merge small and often.
- Apply their migrations to the live database after merging, in order, before their code is deployed.
- Track D's `allocation_decisions`: show them in the coordination decision log.
- Track B's prescriber role: check the change to `lib/demo/roles.ts`.
- After each merge, run `npm run check` on `main` and the live tests, and check the deployed site.

## 5. Data files

Done by the lead: `episodes.csv` and `foreign_notices.csv` committed, `foreign_notices.csv` imported (4 ANSM notices, all molecules stayed at none). If a file changes: dry run, report unmatched names, then `--apply` (on Windows PowerShell call `npx tsx --conditions=react-server scripts/import-notices.ts --apply`, because PowerShell swallows `--`).

New: the DPM list of DCIs registered in Tunisia, from https://dpm.tn/index.php/medicaments-a-usage-humain/liste-des-dci.
- `data/reference/dpm-dci.raw.txt` is the list as copied (2,348 lines). `data/reference/dpm-dci.csv` is deduplicated (2,227 names) with a first-pass `in_cnam_vei` flag (salt words like CHLORHYDRATE or FUMARATE removed before matching). The flag is approximate: check it, fix the matching in a script (`scripts/build-dpm-list.ts`), never by hand. The list also holds excipients, homeopathic stocks and old registrations; keep them, they are part of the source.
- Names only: no brands, forms, prices or dates. Do not add these names to `molecules` and do not let anyone report or follow them.
- Use, after track B merges: on `/medicaments`, when a search finds nothing in the catalogue but matches a DPM name, show "Ce médicament est enregistré en Tunisie (liste DPM). Il n'est pas encore suivi par RuptureWatch, qui suit les médicaments vitaux, essentiels et intermédiaires de la liste CNAM." Same answer in Arabic, flagged for review. Same in the WhatsApp search.
- On the data sources page: one line naming the DPM list and its link, as the reference for this search answer. No counts, no dates.

## 6. Threshold explorer and the reason for each number (last)

On the methods page, under the parameters table:

- Explorer: sliders for pharmacies needed for confirmed (2 to 12), governorates needed (1 to 5), likely pharmacies (1 to 5), and the 72-hour wait (24 to 120 hours). Each change replays `lib/signal/scenario.ts` in the browser through `evaluate()` and shows a timeline: the day each level is reached and the day it clears, next to the same timeline with the default values. Under it, one line per setting in plain French, for example "Avec 4 pharmacies : confirmée au jour 6. Avec 8 : jour 10." (computed, never typed) Label the whole block "Données simulées". Nothing is written to the database. Defaults button.
- Add a second simulated scenario to `scenario.ts`: one angry or confused pharmacy that reports the same molecule every day, plus a regional problem in one governorate. The explorer shows that with the defaults neither reaches confirmed, and with low settings they do (false alarms). That is the point of the thresholds.
- The reason for each number, as short French text next to each parameter:
  - 72 h: a late order counts only after a normal delivery delay, so a slow delivery is not a shortage.
  - 4 pharmacies, one count each: independent reports; one pharmacy cannot raise a level, even by reporting every day.
  - 2 governorates: a problem in one region is often one wholesaler's distribution, not a national shortage; one governorate stops at "probable".
  - Network share: the bar rises with the network, so 4 is the floor for a pilot, not the national rule.
  - 14 and 30 days: a level has to keep its evidence; it clears after deliveries return and is lowered when reports stop.
  - Present it as a case definition (suspected, probable, confirmed), the way epidemiologists define a case.

## Done checks

1. The share tests pass; with no member count or a small network, every existing test result is unchanged.
2. `demo:shortage` reaches "confirmée" with at least 12 pharmacies in at least 4 governorates; `demo:shortage` then `demo:clear` leaves the database exactly as before (test it).
3. With the Meta values: a linked demo pharmacy reports by WhatsApp in four taps, the level changes on the coordination page, and the reply shows the explanation.
4. The explorer moves the timeline when a slider moves, shows the false-alarm scenario, and writes nothing.
5. A search for "ruxolitinib" on `/medicaments` shows the DPM line, not an empty result.
6. Every merged track's checks pass on https://rupturewatch-tn.vercel.app.

Write `docs/reports/session-3.md`.
