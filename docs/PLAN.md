# RuptureWatch TN: Phase 3 plan (recut on Saturday 21 November)

Deadline: Wednesday 25 November 2026, 23:59. Build freeze: Tuesday 24 November, 18:00. Submission target: Wednesday 20:00.

## What the jury scores

1. Functionality: does the core feature work as intended.
2. Documentation quality: is the prototype clearly explained (report, 6 pages max).
3. Demo video clarity: about 3 minutes, shows the prototype and its value.

User testing is optional and counts in our favour when reported honestly.

## Sessions

Each session is one Claude Code run with its own brief in `docs/briefs/`. A session is closed only when its done checks pass on the deployed site.

| # | Session | Main outcome | Target |
| --- | --- | --- | --- |
| 1 | Foundations and data spine | Deployed app, design system, full core schema with access rules, catalogue imported, fuzzy search, demo roles, WhatsApp webhook answering | Sat 21 |
| 2 | Pharmacy flow | Follow medicines, report in two taps, levels recomputed with `lib/signal`, alerts, "what my report changed" | Sun 22 |
| 3 | WhatsApp bot | Report by WhatsApp with search and buttons, alerts to registered phones | Sun 22 |
| 4 | Coordinator and showcase | Governorate map, signal list with explanations, event log, export, "one event, four views", scenario button with reset, time machine on real past episodes, methods page | Mon 23 |
| | **Ship line** | **After session 4 the product is submittable as it stands.** | |
| 5 | Wholesaler, public page, polish | Fair split by governorate with deviation log, public page with confirmed notices and rumour check, fixes from testers, end-to-end test of the core flow | Tue 24, 18:00 |

## Work done outside Claude Code, in parallel

| Item | Who | Target |
| --- | --- | --- |
| Supabase project, Vercel project, Meta developer app with WhatsApp test number, domain | Team lead | Sat 21 |
| Publish the pharmacist survey (field kit in Drive) | Team | Sat 21 |
| Book 3 to 5 pharmacists for 15-minute tests on Monday evening or Tuesday morning | Team | Sat 21 |
| Past shortage episodes for the time machine, with a source link for every date | Research chat | Sat 21 |
| Foreign notices file for the watchlist molecules, with links | Research chat | Sun 22 |
| Methods page text, alert guidance text, tester script | Research chat | Sun 22 |
| Report draft (6 pages) | Research chat | Mon 23 |
| Video script and shot list | Research chat | Tue 24 |
| Tester sessions, notes with permission to quote | Team | Mon 23 to Tue 24 |
| Record and edit the video, final report, submit | Team lead | Wed 25 |

## Cut line

If a session runs late, drop from the top, one item at a time:

1. Rumour check on the public page.
2. Public page.
3. Wholesaler fair split (show it as a static screen in the report instead).
4. Outgoing WhatsApp alerts (keep incoming reports).
5. WhatsApp bot (keep a "report on WhatsApp" button that opens the web form).

Already cut for Phase 3: Arabic interface, automatic import of foreign notices (a dated file is used), counter card, weekly bulletin, prescriber view (the coordinator view has a hospital filter instead), playbook editor.

**Never cut:** the tests on the warning logic, the pharmacy report flow, the coordinator dashboard, the scenario button, the time machine with sources, the origin badges, the report, the video.

## The finished checklist (run before freeze)

- [ ] A new visitor opens the link, picks a role in one click, needs no password.
- [ ] A report made on a phone changes the coordinator view within five seconds.
- [ ] Foreign notices alone never raise a medicine above "sous surveillance".
- [ ] No screen and no network response shows a pharmacy name to another party.
- [ ] Every figure carries its origin badge. Every past episode has a source link.
- [ ] The scenario runs from start to "levée" and resets to a clean state in one click.
- [ ] Nothing suggests an institution has endorsed the product.
- [ ] The site works on a mid-range Android phone on mobile data.
