# Session 3 report: network share, demo shortage, WhatsApp, DPM list, threshold explorer, polish

Overnight run on `main` (track A), brief `docs/briefs/session-3.md`, sections 1 to 7 in order. Every item was committed and pushed when finished; migrations were applied before the code that needs them (schema 14, 15, 16). Deployed site: https://rupturewatch-tn.vercel.app, at the last commit of this session, schema version 16.

## 1. Done checks

| # | Check | Result |
| --- | --- | --- |
| 1 | Share tests pass; with no member count or a small network, every existing result is unchanged | **Pass.** `tests/signal.test.ts` (36 tests) adds the share cases; every earlier test passes unchanged. `tests/db/active-members.test.ts` covers the count of active members. |
| 2 | `demo:shortage` reaches "confirmée" with at least 12 pharmacies in at least 4 governorates; shortage then clear leaves the database exactly as before | **Pass.** 23 pharmacies in 13 governorates. Tested in `tests/db/demo-shortage.test.ts` (snapshot of every table), and four times on the live database with `npm run db:fingerprint -- --compare`: "Identical … every table, every row". The last run included a real report through the web flow for the screenshots (removed before `demo:clear`). |
| 3 | With the Meta values: a linked demo pharmacy reports by WhatsApp in four taps, the level changes on coordination, the reply shows the explanation | **Not run: the Meta values are not set** (section 5). What was checked: the bot's tests on Meta's payload shapes (`tests/whatsapp-bot.test.ts`, `tests/whatsapp-link.test.ts`), the webhook answers 401 to an unsigned post on the deployed site, and `/pharmacie/whatsapp` renders with its "pas encore activé" note. |
| 4 | The explorer moves the timeline when a slider moves, shows the false alarms, writes nothing | **Pass, on the deployed site.** With "un seul gouvernorat", the false alarms read "jamais confirmée avec les valeurs par défaut ; confirmée au jour 6 avec vos réglages". 0 requests other than GET while moving sliders; "Valeurs par défaut" restores the initial view. |
| 5 | "ruxolitinib" on `/medicaments` shows the DPM line | **Not possible yet: `/medicaments` is still track B's placeholder** (track B has not pushed a branch). Everything on our side is ready: `matchesDpm()` (`lib/dpm/match.ts`, tested with "ruxolitinib", "ruxoli", "ruxolitinb") and the sentence `public.dpm.notFollowed` in French and Arabic. The WhatsApp search already answers with it. |
| 6 | Every merged track's checks pass on the deployed site | **Pass for tracks C and D** (merged): `npm run test:live` on the deployed commit, 10 passed, 1 skipped (as before); Library and pharmacy directory pages checked in section 4. Track B is not merged. |

`npm run check` (lint, type check, 485 tests): green at every commit.

## 2. What was built

**§1 Network share for "confirmée".** `confirmMemberShare` = 2 %: "confirmée" needs max(4, 2 % of active member pharmacies) in at least two governorates. Active member = a participating pharmacy that reported in the last 90 days (`active_member_pharmacies()`, service role only, migration schema 14). The methods page, the guidance texts, CLAUDE.md and AGENTS.md say it the same way.

**§2 `demo:shortage` and `demo:clear`.** A simulated amlodipine shortage: 23 pharmacies (10 seed pharmacies and 13 "Pharmacie démo 13…" created for it) in 13 governorates, reporting day after day, 8 patient requests, replayed through `recomputeSignal` at each report time, so the event log shows watch → likely → confirmed with their real rules. It refuses to run if anyone else has reported amlodipine. `demo:clear` resets the signal, deletes its fixed ids and recomputes. `npm run db:fingerprint -- --out/--compare` proves the database is back.

**§3 WhatsApp bot** (built, waiting for the Meta values). A pharmacy links a number from `/pharmacie/whatsapp` with a code sent by template (10 minutes, 5 attempts, 3 numbers per pharmacy). Numbers are stored only as salted hashes; the reply address is kept to answer. Linked pharmacies get a list of their followed medicines with levels, report "commandé, non livré" in four taps (Signaler → medicine → delay → done), get the level and its explanation in the reply, and can search (brand, molecule, typos). Level changes are sent to followers within the 24-hour window, or by the alert template outside it. The webhook checks Meta's signature and limits each sender to 20 messages per 10 minutes. Migration schema 15 (`wa_links`, `wa_link_codes`, service role only).

**§4 Integration.** Tracks C and D merged (directory, Library, wholesaler allocation, end-to-end tests); their migration is schema 16, applied. The coordination log now shows wholesalers' allocation decisions next to level changes, as "Un grossiste …", never by name. `db:fingerprint` covers the new tables. Track B had no branch: nothing to merge, and its `roles.ts` check was not possible.

**§5 DPM list.** `npm run dpm:build` rebuilds `dpm-dci.csv` and `dpm-dci.json` from the raw copy with a name key that ignores accents, articles, salts, hydrates and English/French endings: 2,227 names, 599 matched to a CNAM VEI molecule (48 flags corrected against the first pass, mostly English salt forms). Names only; nothing is added to `molecules`. The WhatsApp search answers "enregistré en Tunisie, pas encore suivi" for registered names outside the CNAM list. `data/SOURCES.md` and the methods page list the DPM list, `episodes.csv` and `foreign_notices.csv` (compiled by the team, with their links, no dates).

**§6 Threshold explorer** on `/methode`, under the thresholds table. It has four sliders, two simulated scenarios replayed through `evaluate()` in the browser, and timelines for "Par défaut" and "Vos réglages". The sentences under them are computed ("Avec 4 pharmacies : confirmée au jour 5."), the block is labelled "Données simulées", there is a "Valeurs par défaut" button, and nothing is written. The second scenario (`buildFalseAlarmScenario`) has one pharmacy reporting every day plus three pharmacies of the same governorate. With the defaults it stops at "probable"; with one governorate enough, it confirms on day 6. Each threshold has its reason under its value, and the section opens with the case-definition reading (suspect, probable, confirmé).

**§7.1 `/retour`.** All 9 episodes render with their sources; the summary now also counts the 7 missed episodes and says when the lead rests on a single foreign notice (here, one ANSM notice behind both earlier episodes). Dates read "1er septembre".

**§7.2 Icons and sharing.** Favicon (the `/favicon.ico` 404 is gone), SVG icon, Apple icon, web manifest and app icons, all from one mark: the "probable" shape in white on the brand green. Open Graph cards (1200 × 630, IBM Plex Sans, the four levels as shape plus word) for the home page, `/scenario`, `/methode` and `/retour`, each with its own og:title and description.

**§7.3 Quality pass** on every track A page, at 360 and 1280 px. Lighthouse results are in section 3. Keyboard: tabbing through nine pages (home, methode, scenario, retour, vues, status, pharmacie, coordination, hopital) reached 30 to 39 elements each, every one with a visible focus. No English left in the 693 French texts. Added a loading state for the signed-in spaces, and fixed a silent error: a failed "Livré à nouveau" now says so.

**§7.4 Security pass.**
- `tests/db/grants.test.ts` gains one behavioural test per table (18): what a visitor, a pharmacy, another pharmacy, a coordinator and a wholesaler can read or write, on real rows.
- Rate limits: at most 30 web reports per pharmacy in 10 minutes. At most 20 new tester pharmacies per hour for the whole site, so a leaked invitation link cannot flood the network; no address is stored. Both have a plain French message. The webhook limit was already done.
- `npm run check:bundle` reads what the browser receives and found no secret: on the deployed site (31 files, 14 server-only values and the key patterns) and on a local build (all 34 static files).

**§7.5 Material.** Screenshots at 1280 and 360 px in `docs/reports/session-3/`, taken with the demo shortage running; the database was then verified identical to before. `docs/reports/figures.md` lists the numbers the report and video can cite, all computed by `npm run figures`.

New npm scripts: `demo:shortage`, `demo:clear`, `db:fingerprint`, `dpm:build`, `icons:build`, `check:bundle`, `figures`.

## 3. Lighthouse, deployed site

Scores: performance / accessibility / best practices / SEO.

| Page | Mobile | Desktop |
| --- | --- | --- |
| `/` | 98 / 100 / 100 / 60 | 100 / 100 / 100 / 60 |
| `/methode` | 96 / 100 / 100 / 60 | 100 / 100 / 100 / 60 |
| `/scenario` | 98 / 100 / 100 / 60 | 100 / 100 / 100 / 60 |
| `/retour` | 100 / 100 / 100 / 60 | 100 / 100 / 100 / 60 |
| `/vues` | 96 / 100 / 100 / 60 | 100 / 100 / 100 / 60 |
| `/status` | 97 / 100 / 100 / 60 | 100 / 100 / 100 / 60 |
| `/rejoindre/<code>` | 98 / 100 / 100 / 60 | 100 / 100 / 100 / 60 |
| `/pharmacie` (signed in) | 92 / 100 / 100 / 60 | 100 / 100 / 100 / 60 |
| `/coordination` (signed in) | 91 / 100 / 100 / 60 | 100 / 100 / 100 / 60 |
| `/hopital` (signed in) | 99 / 100 / 100 / 60 | 100 / 100 / 100 / 60 |

SEO is 60 on every page for one reason only: the site is deliberately `noindex` (a prototype with demo data). See question 3.

## 4. Skipped, and why

- **WhatsApp live test (done check 3).** It needs the Meta values, which only the lead can create. The bot is built and tested on Meta's payload shapes; the steps to switch it on are in section 6.
- **DPM line on `/medicaments` (done check 5).** The page belongs to track B, which has not pushed a branch. It is a placeholder, and the brief forbids editing it. When track B merges, it needs one call to `matchesDpm(query)` when the catalogue search finds nothing, showing `public.dpm.notFollowed`.
- **Track B merge and its `roles.ts` check.** There is no branch to merge.
- **`check:bundle` in CI.** CI does not build the app, and a build needs the project's public variables. It is a command to run after a build.

## 5. Open questions for the team

1. **"Levée" while a foreign notice is still active.** In the main scenario, the molecule becomes "levée" on day 22, then reads "sous surveillance" again the same evening: the ANSM notice is still active (90 days), and "levée" is only held when no evidence remains. That follows the rules as written, and the explorer shows it. Should "levée" be held for its display days even with an active foreign notice? Changing it is a rule change, so it needs a test and a DECISIONS entry; I did not change it.
2. **LEVETIRACETAM is "sous surveillance" on the live site.** The Sfax demo account made one web report (origin `simulated`) at 01:42 UTC tonight, before my demo run and not from this session: perhaps a teammate or a test. I left it. To remove it, reset that molecule's signal the way `demo:clear` does, since the event log is append-only.
3. **Indexing.** The site is `noindex`, which costs 40 SEO points in Lighthouse. Keep it for the competition, or open the public pages (home, `/methode`, `/scenario`, `/retour`) to search engines?
4. **Rate-limit values.** 30 reports per pharmacy in 10 minutes and 20 tester sign-ups per hour are my guesses at "far above normal use". Adjust them in `lib/limits.ts` if the pilot says otherwise.

## 6. Manual steps for the team lead

1. **Meta (WhatsApp).** In Vercel (Production) and `.env.local`, set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_APP_SECRET` (`WHATSAPP_VERIFY_TOKEN` and `WHATSAPP_HASH_SALT` are in `.env.local`; check they are in Vercel too). In the Meta app, set the webhook URL to `https://rupturewatch-tn.vercel.app/api/whatsapp/webhook` with the verify token, and subscribe to `messages`.
2. **Two WhatsApp templates** to submit for approval, then set their names:
   - `WHATSAPP_LINK_TEMPLATE`: an authentication template carrying the link code.
   - `WHATSAPP_ALERT_TEMPLATE`: a utility template whose body is {{1}} medicine, {{2}} level, {{3}} link, and which ends with "Ceci n'est pas une déclaration officielle de rupture."
   Then run done check 3: link the Tunis demo pharmacy's number from `/pharmacie/whatsapp`, report by WhatsApp in four taps, and watch `/coordination`.
3. **Google key** (track C's directory). Give the browser key access to "Places API (New)", and remove `GOOGLE_PLACES_API_KEY` from Vercel, which is no longer used.
4. **Arabic review** by an Arabic speaker: the public shell, track C's pages, and the new `public.dpm.notFollowed` sentence (`messages/ar/public.json`).
5. **After the jury period:** delete the demo `wa_links` rows, if any were linked.
6. **When track B merges:** wire the DPM line (section 4), then run done check 5 on the deployed site. Run the end-to-end tests (`npm run test:e2e`) against a preview.
7. **Before a release:** run `npm run build && npm run check:bundle`, and `npm run check:bundle -- --url https://rupturewatch-tn.vercel.app`.

## 7. Screenshots

`docs/reports/session-3/`, each at 1280 and 360 px unless noted. Taken with `demo:shortage` running; the database was verified identical afterwards.

- Home: `accueil-*`
- Report flow, Tunis demo pharmacy, step by step:
  - `signaler-1-recherche-*`
  - `signaler-2-resultats-*`
  - `signaler-3-delai-*`
  - `signaler-4-resultat-*`: before and after, why, what the report changed, guidance, and the disclaimer
- Pharmacy alerts: `pharmacie-alertes-*`
- Pharmacy WhatsApp page: `pharmacie-whatsapp-360`
- Coordination:
  - `coordination-*`
  - `coordination-molecule-*`: map with "<3", patient demand, history
  - `coordination-journal-1280`: a wholesaler decision in the log
- Hospital: `hopital-*`
- Wholesaler: `grossiste-repartition-1280`
- One shortage, four views: `vues-*`
- Scenario: `scenario-confirmee-*` and `scenario-levee-*`
- Past shortages: `retour-*`
- Methods page: `methode-*`
- Explorer with low settings: `methode-explorer-*`
- Share card: `og-methode.png`

Figures for the report and the video: `docs/reports/figures.md` (`npm run figures`).
