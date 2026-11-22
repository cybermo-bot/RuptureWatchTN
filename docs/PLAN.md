# RuptureWatch TN: Phase 3 plan (updated Sunday 22 November)

Deadline: Wednesday 25 November 2026, 23:59. Build freeze: Tuesday 24 November, 18:00. Submission target: Wednesday 20:00.

## What the jury scores

1. Functionality: does the core feature work as intended.
2. Documentation quality: is the prototype clearly explained (report, 6 pages max).
3. Demo video clarity: about 3 minutes, shows the prototype and its value.

User testing is optional and counts in our favour when reported honestly.

## What changed on 22 November

The product now has a public side, so that patients take part in the shared intelligence, not only professionals:

- Patients ask nearby pharmacies whether they have a medicine; pharmacies answer in one tap and choose whether to show themselves. Requests become an anonymous demand signal for the coordination unit.
- Verified status in plain words (rumour check), same-molecule brands from the CNAM list, "Préviens-moi" kept on the patient's phone, a map of pharmacies open near the patient from Google Maps (OpenStreetMap as fallback), the archive of past shortages, a prescriber quick check.
- A Library showing the French over-the-counter status, clearly labelled as French data and kept out of the patient request flow.
- Public pages in French and Arabic.
- Four people build in parallel, one track each.

## Tracks

Each track has its own brief in `docs/briefs/` and its own branch. A piece of work is closed only when its done checks pass on the deployed site.

| Track | Owner | What it delivers | Depends on | Target |
| --- | --- | --- | --- | --- |
| A. Core | Team lead | Session 1, foundations (done). Session 2, pharmacy flow (done or finishing). Session 3, WhatsApp bot: report by WhatsApp, alerts, availability requests sent to pharmacies on WhatsApp. Session 4, coordination and showcase: governorate map, signal list with explanations, event log, export, demand from patient requests, one shortage seen side by side by each role, scenario button with reset, replay of past shortages, methods page | Nothing | Session 3 Sun 22, session 4 Mon 23 |
| B. Public space | Teammate | Public medicine page with verified status, same-molecule brands, "Préviens-moi"; the availability request (patient side) and the one-tap answer (pharmacy side); map of pharmacies that said yes; archive of past shortages; prescriber quick check; French and Arabic | Session 2 for the pharmacy side | Sun 22 to Tue 24 |
| C. Directory and Library | Teammate | Pharmacies open near the patient from the Google Places API, live and never stored, on a Google map: "open now", day, night and weekend filters; the same Google map shows the pharmacies that answered a request "disponible" (shared with track B); OpenStreetMap fallback when Google is unavailable; the Library with the French over-the-counter status | Google Cloud key from the team lead | Sun 22 to Tue 24 |
| D. Wholesaler | Teammate | Wholesaler space: signals that concern it, fair split of scarce stock by governorate with days of cover (quantities simulated and labelled), apply the split or record a deviation with a reason; end-to-end tests of the main flows | Session 2 | Sun 22 to Tue 24 |

Rules for working in parallel: one branch per track, pull requests reviewed and merged by the team lead, migrations written in the branch but applied to the live database only by the team lead, each track keeps to its own route folders and message key prefix.

## Ship line

The product is submittable when these work on the deployed site: the pharmacy report flow, the coordination space, the scenario button, the replay with sources, and the patient availability request with the pharmacy's answer. Target: Monday 23 November at night.

## Work outside the code

| Item | Who | Target |
| --- | --- | --- |
| Google Cloud project: billing account, Maps JavaScript and Places API enabled, keys restricted to our domains, daily quota caps and a budget alert | Team lead | Sun 22 |
| Survey published and shared (field kit in Drive) | Whole team | Sun 22 |
| 3 to 5 pharmacists booked for 15-minute tests | Whole team | Sun 22 |
| Past shortage episodes for the replay and the public archive, a source link for every date | Research chat | Sun 22 |
| Foreign notices file for the watchlist molecules, with links | Research chat | Sun 22 |
| Patient texts in French and Arabic (request flow, brand caution, Library banner), methods page text | Research chat | Sun 22 |
| Tester sessions, notes with permission to quote | Whole team | Mon 23 to Tue 24 |
| Report draft (6 pages) | Research chat | Mon 23 |
| Video script and shot list | Research chat | Tue 24 |
| Record and edit the video, final report, submit | Team lead | Wed 25 |

## Cut line

If a track runs late, drop from the top, one item at a time:

1. The Library (French over-the-counter status).
2. The archive of past shortages on the public side (the replay in the coordination space stays).
3. Prescriber quick check.
4. "Préviens-moi".
5. Directory filters and map: keep a plain list of pharmacies open now (Google, or OpenStreetMap if Google fails).
6. Arabic on the public pages.
7. Wholesaler fair split (show it as a static screen in the report instead).
8. Outgoing WhatsApp alerts (keep incoming reports).
9. WhatsApp bot (keep a "report on WhatsApp" button that opens the web form).

Already out of scope for Phase 3: automatic import of foreign notices (a dated file is used), counter card, weekly bulletin, playbook editor, advertising (parked for the Phase 4 business discussion), therapeutic alternatives between different molecules.

**Never cut:** the tests on the warning logic, the pharmacy report flow, the coordination space, the scenario button, the replay with sources, the availability request and answer, the origin badges, the report, the video.

## The finished checklist (run before freeze)

- [ ] A new visitor opens the link, picks a role in one click, needs no password. A patient uses the public side with no account at all.
- [ ] A report made on a phone changes the coordination view within five seconds.
- [ ] Foreign notices alone never raise a medicine above "sous surveillance". Patient requests never change a level.
- [ ] No screen and no network response shows a pharmacy name to another party, except a pharmacy that chose to show itself to a patient in its answer.
- [ ] No request stores a name, a phone number or exact coordinates.
- [ ] No Google Maps content is stored except place IDs; Google results appear only on a Google map; quota caps are set.
- [ ] Every figure carries its origin badge. Every past episode has a source link. French data says it is French.
- [ ] The public side never shows a level below "confirmée", a risk score or stock quantities.
- [ ] The scenario runs from start to "levée" and resets to a clean state in one click.
- [ ] Nothing suggests an institution or a listed pharmacy (from Google or OpenStreetMap) has endorsed or joined the product.
- [ ] Public pages read correctly in French and in Arabic, right to left.
- [ ] The site works on a mid-range Android phone on mobile data.
