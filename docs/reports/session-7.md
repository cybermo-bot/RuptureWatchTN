# Session 7 · Make the first visit easier

Track A · 24 November 2026 · `codex/session-7`, based on local `main` at `5470a44`.

[Local preview](http://127.0.0.1:3080/)

## Changes

1. **Scenario.** The demo opens at three fictional reports from Tunis. The fourth keeps the level at Probable if it comes from Tunis and raises it to Confirmée if it comes from Sfax. The entry uses the existing scenario frames and the existing allocation calculators. The replay is linked below. The map suppresses small counts and pulses only when a governorate changes the level. Allocation decisions are disabled in the scenario.
2. **Home.** One demo launch and three task links. Medicine search opens with focus in the search field. The demo pharmacist lands on Signaler. The coordination chooser opens four direct sign-ins. The national dashboard lives in the ministry space. Resource links and the full text-only role picker sit under En savoir plus.
3. **Professional spaces.** Medicine panels lead with the level, reason and next action. The ministry's À examiner block uses the existing priority order and has a dated chart of requests received through RuptureWatch. Sources et actualités reads the nine documented episodes and four foreign notices already in the repository, with links and dates. The levetiracetam playbook shows its draft version. The split distinguishes the proposed ordering cap from the calculator's period need.
4. **Availability.** The selected CNAM presentation carries through the medicine page, the request sent to the pharmacy, WhatsApp and the patient's answer page. Patients can explicitly choose any brand of the same molecule. Answers show response times and availability before the map. The existing `medicine_id` column, RPC argument and pair validation cover this feature. The existing daily limit is still per device and molecule, so the two-strength checks use two anonymous contexts.
5. **Dosage forms.** The parser identified a form for **3,021 of 3,358** CNAM presentations. The remaining **337** use the neutral illustration. Molecule-only links also use the neutral illustration since there is no selected presentation. The form artwork has French and Arabic text alternatives.
6. **First-visit navigation.** Pharmacy mobile navigation puts Signaler, Mes médicaments and Demandes within one tap. Secondary tools and method details sit under Plus, En savoir plus or Pourquoi ?. Redundant simulation badges have been removed while simulated results remain identified. The directory keeps its area map and directions, while the request map shows pharmacies that consented to appear for that answer.

## Checks

| Check | Result |
| --- | --- |
| `npm run check` | Passed locally. Lint, type checking and 649 tests. A rerun exposed an existing date-sort assertion that depended on the hour and timezone. The test now checks the same order using numeric timestamps. |
| Production preview build | Passed locally with webpack and the installed Tailwind compiler. The default Turbopack build failed on this Windows machine because its CSS worker exited before connecting. The preview used the app stylesheet compiled with the installed Tailwind version. |
| Scenario in Chromium | Both branches, reset, disabled decision save and no write passed. The full replay reached Levée. |
| Layout captures | All ten requested screenshots captured at 360 × 800 and 1280 × 800. The request capture also checks that switching to any brand displays the caution, then restores the exact presentation. |
| Read-only browser checks | Passed at 360 and 1280 px. The home search gets focus. The pharmacy demo opens on Signaler with Mes médicaments and Demandes one tap away. The ministry chooser and À examiner block work. The public TAMOXIFENE page displays Aucune rupture confirmée à ce jour. |
| Lighthouse accessibility | 100 at both widths on home, scenario, public search, medicine presentation, patient request, wholesaler medicine panel and allocation, pharmacy reporting, ministry, centrale and hospital medicine panel. |
| Signal, privacy and two product strengths | Passed against the actual migrations in PGlite. Two separate requests retained their strength in the web and WhatsApp pharmacy queries and returned independent answers. Existing public-status and suppression tests passed. |
| WhatsApp content | Bot tests passed locally. Verified the two different labels in the request list and the selected question. Live delivery needs a linked test pharmacy. |
| Juror first-visit timing | Needs a fresh teammate on an approved deployment. |
| Browser request and answer round trip | Opt-in Playwright test is ready. It needs a database approved for test writes. |

## Local screenshots

The 360 and 1280 px captures use the styled production preview. The home capture checks that the three task links fit within the first 800 px.

| Flow | 360 × 800 | 1280 × 800 |
| --- | --- | --- |
| Home | [360](session-7/s7-home-360.png) | [1280](session-7/s7-home-1280.png) |
| Scenario entry | [360](session-7/s7-scenario-entry-360.png) | [1280](session-7/s7-scenario-entry-1280.png) |
| Scenario after Sfax | [360](session-7/s7-scenario-confirmed-360.png) | [1280](session-7/s7-scenario-confirmed-1280.png) |
| Wholesaler medicine block | [360](session-7/s7-professional-360.png) | [1280](session-7/s7-professional-1280.png) |
| Patient request | [360](session-7/s7-request-360.png) | [1280](session-7/s7-request-1280.png) |

The optional CSV import was deferred. Deployment and any test that creates a live request or answer remain pending review.
