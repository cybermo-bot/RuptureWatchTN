---
name: rw-screen-review
description: Look at what you built before committing UI work in RuptureWatch TN — take screenshots at 360 and 1280 px (French, Arabic, reduced motion), compare them with the rest of the product, run ux-audit, fix hard failures. Use at the end of every UI step and before saying UI work is done.
---

# Review your own screens before you commit

Code that compiles is not a screen that works. After every UI step, look at the result like a juror who has never seen the product and like a pharmacist at a counter with a queue.

## 1. See it

1. Start the dev server in the background: `npm run dev` (port 3000).
2. Take screenshots of the screens you changed, plus one unchanged neighbour for comparison:
   `npm run screenshots -- --base http://localhost:3000 --out docs/reports/pilot-b/<step> --only <names> --widths 360,1280`
   The shot names are in `scripts/screenshots.ts`. If a changed screen has no shot, add one there (public pages: also add an Arabic variant with `locale: 'ar'`). The script signs in with the one-click demo roles and never sends a report or a request; do not add shots that submit anything.
3. Open every PNG with the Read tool and look at it. Do not mark anything as fine from the code alone.

## 2. Judge it (write the answers in the session report)

For each screenshot:

- **Three seconds:** what is this screen for, and what is the one action? If you need more than three seconds, cut text or move things behind « Pourquoi ? ».
- **Coherence:** put it next to the home page and the neighbour screenshot. Same header logic, same title size, same row style, same spacing, same buttons, same background? Name every difference and remove it unless the brief asks for it.
- **Hierarchy:** one title, one main element (usually the status or the list), one primary button. Nothing else competes.
- **Text:** count sentences of explanation above the fold. More than one: cut.
- **Boxes:** more than one panel? Turn the others into sections on the page background.
- **Honesty signals:** one origin badge per status, the not-official line once. No stacked « Simulé / Démonstration / pas officiel ».
- **Pictures:** every product and molecule row has its form picture.
- **360 px:** no horizontal scroll, bottom bar not covering content, 48 px targets, nothing overlapping.
- **Arabic (public pages):** right-to-left correct, nothing left in French that should be translated, numbers and level shapes readable.
- **Reduced motion:** with `prefers-reduced-motion: reduce` (Playwright `reducedMotion: 'reduce'` if you add a check), nothing moves except opacity.
- **Banned list:** nothing from `.ux-profile.md` crept in.

## 3. Audit it

Run the `ux-audit` skill on the working set (it reads `.ux-profile.md` and the installed skills). Fix every hard-rule failure in the same step, then take the screenshots again and look again.

## 4. Keep the guarantees

- `npm run check` green; test count not lower.
- e2e selectors and texts in `tests/e2e/core-flows.spec.ts` unchanged, or updated in the same commit and listed in the report.
- Lighthouse accessibility still 100 where it was (if you cannot run Lighthouse, say so in the report; do not claim it).

## 5. Report

In the session report, per step: the screenshots (links), the answers above in one or two lines each, what you fixed after looking, what you could not fix and why.
