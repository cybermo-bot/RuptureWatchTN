# RuptureWatch TN redesign

24 November 2026 · `codex/rupturewatch-redesign`, based on the reviewed Session 7 checkout at `16cb009`.

[Local preview](http://127.0.0.1:3083/)

## Design

- The home page follows a delivery from the pharmacy counter to national coordination. It opens with the scenario and medicine search, then offers separate routes for patients, pharmacies and wholesalers, plus links to the directory, documented shortages and method.
- The references informed the use of clinical photography, the alternating warm limestone and powder-blue sections, and the dated charts with reference lines and a stronger accent on the last nonzero day. The homepage pharmacy scene is an original generated illustration of a fictional pharmacy. [Aveline](https://aveline-visuvate.framer.website/) · [Nubo](https://nubo.framer.website/) · [Mira](https://mirabio.framer.website/)
- The scenario summary identifies simulated data. Professional charts retain hatched suppression and a text table. The contrast ratios are 11.8:1 for main text on limestone, 6.1:1 for muted text on limestone, 5.7:1 for muted text on powder blue, and 7.3:1 for the primary button. The homepage scroll transition respects the reduced-motion preference.
- The Product Design workflow covered reference review, an image concept, and desktop QA against the concept. Impeccable’s launcher could not load its engine on this machine, so its written guidance was applied directly. The revised tokens and layout are in `DESIGN.md`.

## Access

- Patients reach medicine search as anonymous visitors. The form receives focus when opened from the entry page.
- Existing pharmacy and wholesaler accounts have separate sign-ins. The server checks the account’s assigned organisation for the chosen entry. A passwordless demo account is available on each of those pages.
- `/connexion/institution` is a direct sign-in for team-provisioned organisations, including the Ministry of Health and the pharmacists’ order. The existing scenario separately exposes fictional institutional roles for the prototype. Self-service professional registration and institutional provisioning are outside this pass.
- The scenario evaluator, allocation calculator, public status rules and database schema are unchanged.

## Verification

| Check | Local result |
| --- | --- |
| `npm run check` | Lint, type checking and all 651 tests passed with two Vitest workers. The worker cap resolved a memory error on the first attempt. |
| Production preview | Passed with webpack and the installed Tailwind compiler, using the existing Windows preview workaround. The final home page returned HTTP 200. |
| Responsive home | Checked at 360 and 1280 px. The first mobile viewport contains both actions, the image loaded, and neither viewport overflowed horizontally. The desktop headline uses three lines and the story chapter starts within the first viewport. |
| Browser role entry | Anonymous search opened with focus at 360 px. Separate pharmacy and wholesaler forms opened, and both demo sign-ins reached their respective spaces. Signed-out institution access showed a credentials form without demo access. The patient sign-in URL returned the not-found page. |
| Scenario | Choosing Sfax in the fourth-report scenario displayed Confirmée with the Simulé origin and Sfax’s count suppressed as `<3`. The collapsed scenario role picker exposed the eight demo accounts when opened. |
| National demand chart | Local browser at 360 and approximately 1280 px showed the dates, reference lines and distinct hatched bars. The accompanying text table retained suppressed values. |
| Fresh tester and deployment | A new juror first visit and an approved deployment are pending. |
| Professional credentials | The role decision is covered by unit tests. Account provisioning and a real sign-in with each institution’s credentials still need a provisioned tester. |
