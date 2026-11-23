# Session 5 report: design, national picture, track B, institutional spaces

Run on `main` (track A), brief `docs/briefs/session-5.md`, parts 1 to 5 in order. Each part is committed and pushed when finished. Deployed site: https://rupturewatch-tn.vercel.app.

All five parts are done and on the deployed site. Parts 1 to 3 were done first; the session then stopped at the usage limit and was continued for parts 4 and 5, the home page previews and the deployed checks. One check is still blocked, outside the code: patients' requests on the deployed site wait for `DEVICE_HASH_SALT` to be visible to Production (see the end).

## Part 1: the new design, on the deployed site

Deployed commit `50d825d` (checked with `/api/health`). Screenshots taken on the deployed site, with the part 2 national picture in place, at 360 and 1280 px, in `docs/reports/session-5/`:

| Page | Phone (360) | Desktop (1280) |
| --- | --- | --- |
| Home: live national picture, roles in three groups, scenario, "Comprendre" | [accueil-360](session-5/accueil-360.png) | [accueil-1280](session-5/accueil-1280.png) |
| Coordination: console, key figures with 14-day sparklines, level band over 30 days, map, demand, log | [coordination-360](session-5/coordination-360.png) | [coordination-1280](session-5/coordination-1280.png) |
| Wholesaler | [grossiste-360](session-5/grossiste-360.png) | [grossiste-1280](session-5/grossiste-1280.png) |
| Hospital pharmacy | [hopital-360](session-5/hopital-360.png) | [hopital-1280](session-5/hopital-1280.png) |
| Pharmacy home (phone app: header, bottom tabs, install hint) | [pharmacie-360](session-5/pharmacie-360.png) | [pharmacie-1280](session-5/pharmacie-1280.png) |
| Pharmacy alerts | [pharmacie-alertes-360](session-5/pharmacie-alertes-360.png) | [pharmacie-alertes-1280](session-5/pharmacie-alertes-1280.png) |
| Report, step 1 (large search, progress line) | [signaler-1-recherche-360](session-5/signaler-1-recherche-360.png) | [signaler-1-recherche-1280](session-5/signaler-1-recherche-1280.png) |
| Scenario | [scenario-360](session-5/scenario-360.png) | [scenario-1280](session-5/scenario-1280.png) |
| Public: pharmacies near me (app header, bottom tabs) | [pharmacies-360](session-5/pharmacies-360.png) | [pharmacies-1280](session-5/pharmacies-1280.png) |

What changed, in short:
- **Two families, one identity.** Professional spaces are a console: ink sidebar (`#0B1A16`) with the logo, the role, its organisation and its Simulé badge, the sections with Lucide icons, "Comprendre" and "Changer de rôle"; a top drawer on phones; `#F5F7F6` content with white panels. The pharmacy space and the public pages are a phone app: app header, bottom tab bar (pharmacy: Signaler, Mes médicaments, Alertes, Plus; public: Médicaments, Pharmacies, Ruptures passées), large search, full-width rows, the primary action fixed at the bottom of a flow.
- **Our mark**: an open ring broken at one point, with the dot that escapes it. Sidebar, favicon, app icons and share cards. It replaces the session 3 mark, which was the "probable" shape and could be read as a level.
- **Key figures and charts**, all computed from the event log: medicines at each level with a 14-day sparkline; a level band over 30 days per medicine; reports and demand per day; wholesaler decisions. Server-rendered SVG with `d3-scale`, each with its text equivalent.
- **Live feel**: when a level changes while a dashboard is open, its row and governorates pulse once and a toast says what changed. Reduced motion stops the pulse, never the toast.
- **Report flow**: two taps, a progress line, a confirmation with the level, what the report changed and the count of pharmacies counting up (only from 3, so no small count is ever shown).
- **Home page**: the live national picture first (map filled by the most serious level per governorate, the medicines with their level, each linking to its four views), then "Choisissez un rôle" in three groups with screenshots of each space (`npm run previews:build`), then the scenario, then "Comprendre".

The role previews on the home page were generated before the national picture existed; they are regenerated at the end of the session, when the new roles exist.

## Part 2: national picture

`npm run demo:national` (all `origin = simulated`), on the live project now:

| Medicine (CNAM) | Brands | Category | Level | Rule |
| --- | --- | --- | --- | --- |
| AMLODIPINE | 13 | E | Confirmée | `confirmed_threshold` (23 pharmacies, 13 governorates) |
| TAMOXIFENE | 4 | V | Probable | `single_governorate_cap`: five pharmacies, all in Sfax (gate two) |
| METFORMINE | 11 | E | Sous surveillance | `local_reports_below_threshold`: one pharmacy in Gabès |
| AZATHIOPRINE | 4 | V | Sous surveillance | `foreign_notice_only`: a notice from "Régulateur fictif (démonstration)" alone (gate one) |
| CIPROFLOXACINE | 12 | E | Levée | `delivered_again_cleared`: confirmed in Tunis and Sousse, then delivered again by two pharmacies |

Patient requests on amlodipine (8) and tamoxifen (6). Wholesaler decisions: amlodipine applied (1,200 boxes), tamoxifen not applied with its reason. History from 26 days ago. None of these molecules had any data of its own; the run refuses otherwise.

Fingerprint check on the live project: `db:fingerprint --out`, `demo:national`, `demo:clear`, `db:fingerprint --compare`: "Identical … every table, every row". Same check in `tests/db/demo-national.test.ts` on the real migrations. The picture was then built again for the jury.

Before it, the stray LEVETIRACETAM report (Pharmacie démo F, Sfax, 23 Nov 01:42 UTC) was removed with the sanctioned reset: `npm run verify:clean -- --since 2026-11-23T01:40:00Z --apply` (one report; its signal, one event and six alerts through `reset_molecule_signal`; no tester pharmacy existed).

## Part 3: track B, the public side, on main

**Needs you: `DEVICE_HASH_SALT` is not set on Vercel.** Everything below is deployed (commit `255af10`, schema 20), but the live site cannot take a patient's request yet: our server needs that salt to hash the phone's random id for the 24-hour limit. `/api/health` now says `"patientRequests": false`, and the request page says plainly "Les demandes aux pharmacies ne sont pas encore ouvertes sur ce site" instead of failing. To open it: Vercel → Settings → Environment Variables → `DEVICE_HASH_SALT`, the same value as in `.env.local`, for Production and Preview, then redeploy. `/api/health` should then say `"patientRequests": true`. I have no access to Vercel from here. The whole flow was checked end to end on a local server against the live database (screens below), and the one test request it made was deleted afterwards.

Migrations applied to the live project before the code that needs them: 0017 (`prescriber` organisation type and role), 0018 (`public_molecule_status`, `governorate_counts` by named roles), 0019 (the origins behind a public level), 0020 (`requests_for_pharmacy`, `answer_request_as` for WhatsApp). Each has its access test on the real migrations: `tests/db/public-status.test.ts`, `tests/db/whatsapp-requests.test.ts`, and the function grants in `tests/db/grants.test.ts`.

| Screen | Where | File |
| --- | --- | --- |
| Search: brand or molecule, half words; "ruxolitinib" gives the DPM line | deployed | [medicaments-360](session-5/medicaments-360.png) |
| Status page, the rumour check: "Rupture confirmée depuis le …", Simulé badge, disclaimer, request button, Préviens-moi, brands folded under the caution line | deployed | [medicament-statut-360](session-5/medicament-statut-360.png) |
| The same in Arabic, right to left | deployed | [medicament-statut-ar-360](session-5/medicament-statut-ar-360.png) |
| Request page (live: the honest "not open yet" line, until the salt is set) | deployed | [demande-360](session-5/demande-360.png) |
| Request page with "Près de moi" done on the phone (Tunis) | local, live database | [local-e2e-1-demande](session-5/local-e2e-1-demande.png) |
| Pharmacy answered "Disponible, me montrer au patient": what the patient now sees | local, live database | [local-e2e-5-repondu](session-5/local-e2e-5-repondu.png) |
| Patient page: counts, time left, the pharmacy on the map and in the list, "Appelez avant de vous déplacer.", "Présentez votre ordonnance." | local, live database | [local-e2e-6-reponse](session-5/local-e2e-6-reponse.png) |
| Second request from the same phone: refused kindly, with a link to the open one | local, live database | [local-e2e-7-limite](session-5/local-e2e-7-limite.png) |
| Pharmacy's request screen (empty state; count on "Plus" and a line on "Mes médicaments" when patients wait) | deployed | [pharmacie-demandes-360](session-5/pharmacie-demandes-360.png) |
| `/prescripteurs` signed out: explanation and one-click demo button | deployed | [prescripteurs-360](session-5/prescripteurs-360.png) |
| `/prescripteurs` signed in, tamoxifen: "Probable" with its rule, counts by governorate, no pharmacy, substitution note | deployed | [prescripteurs-verification-360](session-5/prescripteurs-verification-360.png) |
| `/ruptures-passees`: one row per episode, a source link for every date | deployed | [ruptures-passees-360](session-5/ruptures-passees-360.png) |

Track B done checks:

| Check | Result |
| --- | --- |
| Status page reads correctly in French and Arabic | Passed on the deployed site (screens above). |
| A request sends only the governorate code | Passed locally: the only POST body was `{"moleculeId":"…","governorate":"TN-11","deviceId":"<random uuid>"}`. "Près de moi" found Tunis on the phone; no coordinate left it. |
| A pharmacy's answer appears on the patient page within 10 s | Passed locally against the live database: 5.1 s from the tap at Pharmacie démo A to the name on the patient page. Not yet on the deployed site (salt). |
| An anonymous answer increments the count only | Covered by `tests/db/availability.test.ts` and `whatsapp-requests.test.ts`: `request_answers_public` lists only "disponible" answers that chose to show; anonymous ones count in "Réponses". |
| Second request within 24 hours refused | Passed locally (screen above); the database refusal (`RW429`) is tested. |
| Préviens-moi survives a reload and shows the banner | The list lives in `localStorage`; the banner compares the stored status with `/api/public/status` at each opening. Checked by hand locally; no automated browser test yet. |
| `/prescripteurs` shows levels without pharmacies | Passed on the deployed site: the page text contains no pharmacy name; counts read "<3" below three. |
| `npm run check` | Passed: lint, types, 529 tests. |
| Access tests for every new function | `public_molecule_status`, `governorate_counts` (prescriber), `requests_for_pharmacy`, `answer_request_as`, all in the grants matrix. |

**WhatsApp.** "Demandes" (word or button) lists the open requests, a row asks the question with three buttons ("Oui, me montrer", "Oui, anonyme", "Pas disponible": Meta caps button titles at 20 characters), one tap answers and offers the next. A new request sends linked pharmacies of the governorate a message with a "Répondre" button if they wrote to the bot in the last 24 hours. Tested in `tests/whatsapp-bot.test.ts` with Meta's payload shapes; inactive on the live site until the Meta values are set, as before.

**`demo:national`** now adds four simulated answers to its tamoxifen requests (none from the one-click pharmacies). Re-run on the live project: `demo:clear` then `demo:national`, levels as in part 2.

### Video demo path (once the salt is set)

1. Phone A (the patient), a private window: open https://rupturewatch-tn.vercel.app/medicaments, type "amlo", tap AMLODIPINE. The page says "Rupture confirmée depuis le …" with its Simulé badge.
2. Tap "Demander aux pharmacies proches", choose "Tunis" (or "Près de moi" if the phone is in Tunis), tap "Envoyer la demande". The answers page opens: pharmacies asked, "Réponses : moins de 3", time left, "En attente des pharmacies".
3. Phone B (the pharmacist): open https://rupturewatch-tn.vercel.app, "Pharmacie (Tunis)". The "Mes médicaments" screen says "1 patient attend votre réponse." Tap "Répondre".
4. On the AMLODIPINE request, tap "Disponible, me montrer au patient". The row says "Réponse envoyée : le patient voit votre pharmacie sur sa carte."
5. Back on phone A, without touching it: within 10 seconds, "Pharmacie démo A, Tunis" appears on the map and in the list, with "Appelez avant de vous déplacer." and "Présentez votre ordonnance."
6. Optional: on phone A, "Revenir à ce médicament", "Préviens-moi". Reload: "Vous suivez ce médicament" stays.

A phone can ask for amlodipine once a day: for a second take, use another private window (a new random id).

### Arabic texts to review

All new Arabic texts are in `messages/ar/public.json` under `public.medicines`, `public.medicine`, `public.request`, `public.watch`, `public.past`, `public.prescribers`, `public.origin` and `public.dpm.searchTitle`. The seven texts the brief gives word for word are used as given. The others are my drafts and need a native reader, in particular: "{n} من الأصناف في قائمة الكنام" (presentations), "حريف" (customer, Tunisian usage) in `request.waitingBody`, "استظهر بوصفتك الطبية" (present your prescription), the CNAM categories "حيوي / أساسي / وسيط", and the origin badges "مصدر رسمي / مُختبِر / محاكاة". The professional parts of `/prescripteurs` (level and explanation) stay in French, marked `lang="fr"`.

## Part 4: "levée" holds

Commit `957cb6a`, migration `20261123200000_signal_cleared_at.sql` applied to the live project before the push.

- **The rule.** A foreign notice published before a medicine became "levée" no longer raises it on its own. A notice published after the levée, or new Tunisian reports, still do. Gate one is unchanged: notices alone never go above "sous surveillance".
- **How.** `evaluate()` carries a `clearedAt` time (`PreviousState.clearedAt`, `Evaluation.clearedAt`). It is set when the level becomes "levée" and kept after "levée" expires to "aucun signal", so a 90-day notice from before the levée cannot come back 7 days later. The signal service stores it in `signals.cleared_at` (backfilled from the last "levée" event) and passes it to `apply_signal_evaluation()`, which takes it as a tenth argument (the nine-argument version is dropped in the next migration).
- **Tests first.** Seven new cases in `tests/signal.test.ts`: the levée time is recorded; a notice active before the levée does not raise it; without a stored time, a shown "levée" counts from its start; once "levée" has expired the old notice still does not count alone; a notice published after the levée raises it to "sous surveillance" and no further (gate one); a new notice from the same regulator counts; new Tunisian reports raise the level as before. The file now has 43 tests; CLAUDE.md §3 still says 31. Plus `tests/signal-service.test.ts` (the time survives the levée fading) and `tests/explore.test.ts` (the scenario's last day is "levée").
- **Scenario and methods page.** The scenario keeps "levée" to the end (done check 7, `tests/e2e` test 3 passed on the deployed site). The methods page sentence and `docs/DECISIONS.md` say the new rule.

## Part 5: the institutions' spaces

Commits `f668a41` to `10dc9e4`. Migrations `20261123200100_institution_types.sql` and `20261123200200_institutions.sql` applied to the live project before the code was pushed; `npm run seed:demo` added the two demo accounts. Deployed commit `702a168`, `/api/health` says schema 22.

**Ministère de la Santé, cellule nationale** (`/coordination`, route and tests kept):
- Key figures: medicines by level (with 14-day sparklines), vital medicines confirmed, governorates touched, patients' requests unanswered in 7 days. All computed.
- National map filterable by level ("Tous", "Confirmée", "Probable", "Sous surveillance", "Levée"), with the governorate list beside it.
- Medicines sorted by level, then CNAM category (vital first), then fewer other brands; each row says its category and other brands. Computed from the CNAM rows (`lib/institutions/catalogue.ts`, `tests/catalogue-facts.test.ts`).
- Per medicine: the existing panel, the 30-day level band, and two 30-day charts (pharmacies reporting per day, patients' requests per day) with their text tables. Counts below 3 read "<3"; a "<3" bar is hatched.
- "Note de situation" (`/coordination/note`): one A4 page of computed values and fixed sentences only (levels, confirmed medicines with their governorates and category, the week's wholesaler decisions, unanswered demand, origins, method). "Imprimer ou enregistrer en PDF" opens the browser's print.
- Export and decision log kept; arrivals announced by the centrale appear in the log.

**Pharmacie centrale** (`central_pharmacy`, `/centrale`, "Centrale d'achat démo, Tunis"):
- "Médicaments à risque": every medicine with a level, its CNAM category and other brands, in the ministry's order.
- "Avis étrangers" (`/centrale/amont`): every foreign notice with its regulator, link and date, and the medicine's level in Tunisia.
- "Annoncer un arrivage" on a "probable" or "confirmée" medicine: an expected date (today to a year ahead) and a band ("moins d'un mois", "un à trois mois", "plus de trois mois de besoins"). Saved through `announce_arrival()` only, with its origin. It never changes a level.
- Shown to pharmacies on the medicine's page and in its alerts; on the public status of a confirmed medicine as "Arrivage annoncé par la centrale d'achat pour le {date}." with its badge, through `public_arrival()`, which returns only the date and origin, and nothing below "confirmée".

**Ordre des pharmaciens** (`pharmacists_order`, `/ordre`, "Conseil régional démo, Sfax"):
- "Le réseau": member and active pharmacies by governorate (active: reported or signed in within 30 days), "<3" under three, and national reports per week (chart and table). No name, no id, no report row.
- "Message aux pharmaciens": the Ordre's own text (10 to 600 characters) to the governorates it ticks. Row-level security delivers it only to pharmacies in those governorates; they see it at the top of "Alertes" with the sender, date, badge and "Ceci n'est pas une déclaration officielle de rupture."
- "Inviter des pharmacies": the existing tester invitation, from this space.

**Everywhere.** Labels say "Espace conçu pour …". No institution's logo. Demo organisations are fictional and badged "Simulé". `/vues` now shows six panels (centrale and Ordre added), each loaded through its own demo account, with what the database refuses to each.

### Done checks

| Check | Result |
| --- | --- |
| 4. Each new role signs in with one click and reads nothing it should not | Passed. One-click sign-in for "Pharmacie centrale" and "Ordre des pharmaciens" on the deployed site (e2e tests 5 and 6). Access tests: `tests/db/institutions.test.ts` (12, on real rows: who can announce, read, write, which governorates receive a message, no name or report reaches the Ordre) and the grants matrix in `tests/db/grants.test.ts` for both tables and seven functions. |
| 5. An arrival appears on the pharmacy's page and the public status, with its badge, and the level does not change | Passed on the deployed site (e2e test 5): announced from `/centrale` for AMLODIPINE, seen on `/pharmacie/molecule/…` and on the public page, "Confirmée" before and after. Screenshots: [pharmacie-medicament-360](session-5/pharmacie-medicament-360.png), [medicament-statut-360](session-5/medicament-statut-360.png), [medicament-statut-ar-360](session-5/medicament-statut-ar-360.png). |
| 6. An Ordre message reaches only the chosen governorates | Passed on the deployed site (e2e test 6): sent to Sfax, seen by "Pharmacie (Sfax)", absent for "Pharmacie (Tunis)". Also proven in the database tests. [pharmacie-alertes-sfax-360](session-5/pharmacie-alertes-sfax-360.png). |
| 7. "Levée" stays visible to the end of the scenario | Passed on the deployed site (e2e test 3). |
| 8. The note prints on one A4 page with only computed values | Passed on the deployed site (e2e test 7: the printed PDF has one page). |
| 9. `npm run check`; Lighthouse accessibility 100 | `npm run check` passes (lint, types, 571 tests). Lighthouse accessibility, deployed site, phone and desktop: 100 on `/centrale`, `/centrale/amont`, `/ordre`, `/ordre/message`, `/ordre/invitation`, `/coordination`, `/coordination/note`, `/pharmacie/alertes`, `/vues/<amlodipine>`, `/medicaments/<amlodipine>` and `/`. |

The two rows these checks created (one arrival, one message) were removed afterwards with `npm run verify:clean`, which now covers both tables; the screenshots were taken before that. One fix came out of the checks: the message field's accessible name included its hint, so it now has the short label "Message" and the hint as its description.

Screenshots (deployed site, 360 and 1280 px):

| Page | Phone (360) | Desktop (1280) |
| --- | --- | --- |
| Home, with the new tiles | [accueil-360](session-5/accueil-360.png) | [accueil-1280](session-5/accueil-1280.png) |
| Ministère | [coordination-360](session-5/coordination-360.png) | [coordination-1280](session-5/coordination-1280.png) |
| Note de situation | [coordination-note-360](session-5/coordination-note-360.png) | [coordination-note-1280](session-5/coordination-note-1280.png) |
| Centrale, risk list | [centrale-360](session-5/centrale-360.png) | [centrale-1280](session-5/centrale-1280.png) |
| Centrale, foreign notices | [centrale-amont-360](session-5/centrale-amont-360.png) | [centrale-amont-1280](session-5/centrale-amont-1280.png) |
| Ordre, network | [ordre-360](session-5/ordre-360.png) | [ordre-1280](session-5/ordre-1280.png) |
| Ordre, message | [ordre-message-360](session-5/ordre-message-360.png) | [ordre-message-1280](session-5/ordre-message-1280.png) |
| Pharmacy alerts with an Ordre message | [pharmacie-alertes-sfax-360](session-5/pharmacie-alertes-sfax-360.png) | [pharmacie-alertes-sfax-1280](session-5/pharmacie-alertes-sfax-1280.png) |
| Pharmacy medicine page with an arrival | [pharmacie-medicament-360](session-5/pharmacie-medicament-360.png) | [pharmacie-medicament-1280](session-5/pharmacie-medicament-1280.png) |
| `/vues`, six panels | [vues-amlodipine-360](session-5/vues-amlodipine-360.png) | [vues-amlodipine-1280](session-5/vues-amlodipine-1280.png) |

## Home page and previews

- The "Médecin prescripteur" tile was already in the Public group (since `2e2f590`); it lacked a preview. It now has one, shown as a phone screen like the pharmacy's.
- `npm run previews:build` regenerated all nine previews (both pharmacies, hospital, wholesaler, ministry, centrale, Ordre, prescriber, public), committed in `1fbde5e`. The centrale and Ordre tiles sit in the "Pilotage" group.

## Patient request on the deployed site: still blocked by the salt

Not passed. After both deploys of this session (`1fbde5e` and `702a168`), `/api/health` still says `"patientRequests": false`, and the request page shows "Les demandes aux pharmacies ne sont pas encore ouvertes sur ce site" (e2e test 4, which now runs the full flow instead of being skipped, stops there). The production server does not see a usable `DEVICE_HASH_SALT`. It counts as set only if the variable is present at run time with at least 16 characters. Please check in Vercel → Settings → Environment Variables:

1. the name is exactly `DEVICE_HASH_SALT`;
2. it is ticked for **Production** (not only Preview or Development);
3. its value has at least 16 characters (the same value as in `.env.local`);
4. then redeploy: an existing deployment does not pick up a new variable.

When `/api/health` says `"patientRequests": true`, run `E2E_BASE_URL=https://rupturewatch-tn.vercel.app npx playwright test -g "4\. "` (in PowerShell: `$env:E2E_BASE_URL="https://rupturewatch-tn.vercel.app"; npx playwright test -g "4\. "`). It sends a request for AMLODIPINE in Tunis from a fresh browser, answers it as "Pharmacie (Tunis)" with the name shown, and waits for the pharmacy on the patient's page. Then `npm run verify:clean` does not remove that request (requests are anonymous demand); it is one simulated-pharmacy answer among the demo's, and it expires on its own.

## For the team lead

- **Salt**: above.
- **Arabic text to review**: `public.medicine.arrival` in `messages/ar/public.json`, "أعلنت مركزية الشراء عن وصول كمية من هذا الدواء يوم {date}." (my draft), in addition to the list in part 3.
- **CLAUDE.md §3** says 31 tests in `tests/signal.test.ts`; there are now 43. I did not edit CLAUDE.md.
- **e2e test 2** looked for the "Coordination" tile, renamed "Ministère de la Santé" in part 1; fixed, not rerun (test 1 adds a real report from a demo pharmacy).
- **Prettier** is not configured in the repository (`npx prettier --check` flags every file, old ones too) and CI does not run it; the project's ESLint is what applies.
