# Figures

Numbers the report and the video can cite. Each one is computed from the repository by `npm run figures` (`scripts/figures.ts`), which prints this file; nothing here is typed by hand. Regenerate it after any data change: `npm run -s figures > docs/reports/figures.md`.

## National catalogue (CNAM list of reimbursed medicines, classified VEI)

Command: `npm run figures` (reads data/reference/cnam-vei-2026-11-06.csv)

- Medicines (rows, one per CNAM code): **3358**
- Molecules (distinct): **548**
- Medicines in category E: **2853**
- Medicines in category I: **348**
- Medicines in category V: **157**

## DPM list of substances registered in Tunisia (names only)

Command: `npm run figures` (reads data/reference/dpm-dci.json, built by npm run dpm:build)

- Names in the list (deduplicated): **2227**
- Names matching a CNAM VEI molecule (followed by RuptureWatch): **599**
- Names outside the CNAM VEI list (answered "registered, not followed"): **1628**

## Past shortages in Tunisia (data/reference/episodes.csv)

Command: `npm run figures` (same computation as the /retour page)

- Episodes documented: **9**
- Episodes with a foreign notice before the first Tunisian report: **2**
- Episodes missed (no foreign notice before): **7**
- Distinct foreign notices behind the earlier episodes: **1**
- Median lead of the foreign notice, for those episodes (days): **31**
- Rows set aside by the parser: **0**

## Foreign notices (data/reference/foreign_notices.csv)

Command: `npm run figures`

- Notices: **4**
- Regulators: **ANSM**

## Warning thresholds (lib/signal/params.ts, design parameters)

Command: `npm run figures`

- `minUndeliveredHours`: **72**
- `confirmWindowDays`: **14**
- `likelyWindowDays`: **7**
- `likelyMinPharmacies`: **2**
- `confirmMinPharmacies`: **4**
- `confirmMemberShare`: **0.02**
- `confirmMinGovernorates`: **2**
- `noticeActiveDays`: **90**
- `quietDays`: **14**
- `clearMinDeliveredPharmacies`: **2**
- `staleDays`: **30**
- `clearedDisplayDays`: **7**

## Automated tests (unit and database, Vitest)

Command: `npm test` (counted by npm run figures, which runs the suite once)

- Tests: **485**
- Passing: **485**
- Test files: **39**
- Tests of the warning logic (tests/signal.test.ts): **36**
- Database tests on the real migrations (tests/db/): **225**

## Pages and roles

Command: `npm run figures` (page.tsx files under app/, development pages excluded)

- Pages (routes): **29**
- Public pages (no sign-in): **16**
- Signed-in pages (professional spaces): **13**
- Demo roles, one click, no password: **5**
- Database migrations: **16**
- Schema version: **16**

