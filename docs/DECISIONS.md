# Decisions

Newest first. Each entry: what was decided, and why.

## 2026-11-23, session 3

### Threshold explorer on the methods page
- Four sliders (pharmacies for confirmed 2 to 12, governorates 1 to 5, pharmacies for likely 1 to 5, wait 24 to 120 hours). Each change replays two simulated scenarios through `evaluate()` in the browser (`lib/scenario/explore.ts`): evaluation at every step and at the end of every day, carrying the previous level, as the signal service does. Nothing is written; no request is made.
- Second scenario `buildFalseAlarmScenario` in `lib/signal/scenario.ts`: in one governorate, one pharmacy reporting every day for 14 days plus three other pharmacies on days 4 to 6. With the defaults it stops at "probable" (one count per pharmacy, one governorate); with one governorate enough it confirms. Tested in `tests/explore.test.ts`.
- Every sentence under the timelines is computed from the replay ("Avec 4 pharmacies : confirmée au jour 5."). Each line changes that setting alone, so its effect reads on its own; the timelines show all settings together.
- Each threshold has its reason under its value, and the section opens with the case-definition reading (suspect, probable, confirmé). No digit is typed in these texts (tested).
- Seen while building it, not changed: once "levée", a molecule with a foreign notice still active goes back to "sous surveillance" at the next evaluation, because "levée" is held only when no evidence remains. In the real scenario that happens the evening of day 22. A question for the team (section "Questions" of the session 3 report), since changing it is a rule change.

### DPM list: names only, flag rebuilt by script
- `scripts/build-dpm-list.ts` (`npm run dpm:build`) rebuilds `dpm-dci.csv` and `dpm-dci.json` from the raw copy and the CNAM file. The name key (`lib/dpm/key.ts`) drops accents, articles ("DE"), salt and hydrate words (when another word remains, so "CALCIUM" stays calcium but "ROSUVASTATINE CALCIUM" is rosuvastatin), and a final E on long words, so English forms match French ones ("METFORMIN HYDROCHLORIDE" = METFORMINE). A name counts as in the CNAM VEI list when it is a CNAM molecule or a component of a combination. Result: 599 of 2,227 names flagged, 48 flags changed against the first pass (mostly English salt forms now matched; "CHLORURE DE CALCIUM" now "no", since CNAM lists calcium only as CALCIUM and in combinations).
- The "registered in Tunisia, not followed" answer (`lib/dpm/match.ts`) uses only names outside the CNAM list, and only when the catalogue search found nothing. It accepts a start of a name (5 letters or more) and one or two typos. Used by the WhatsApp search now; `/medicaments` belongs to track B and gets it when track B merges.
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
