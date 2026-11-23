# Session 6 (track A): the decision layer, and a visual pass

Read `CLAUDE.md`, `docs/reports/session-5.md`, then `docs/RUPTUREWATCH-CLAUDE-CODE-HANDOFF.md` in full: it is the detailed spec for parts 2, 3 and 6 below. Where this brief and the handoff differ, this brief wins. Every product rule in `CLAUDE.md` section 2 still holds.

This runs overnight with nobody to answer. Never stop to ask: when something needs the lead (a key, an approval, a decision that cannot be undone), skip it, note it in the report, go on. Commit and push after each finished part. Code freeze is Tuesday 24 November, 18:00 Tunis time.

## Why this session

Phase 2.1 said: "The warning is not the product; it triggers rules agreed before the crisis." We built the detection engine and the roles, but lost that governance layer: the playbook per molecule, the policy a decision follows, and a way to see what a different allocation would do. This session brings back its smallest working part, makes the antiepileptic start of Phase 2 visible, then gives the presentation surfaces a stronger look.

## Where to work

- Parts 1 to 5 on `main`, as before (no migration expected; if one becomes necessary, apply it before pushing the code that needs it).
- Part 6 (visual pass) on a new branch `ui-refresh`, created from `main` after part 5 is pushed. Push the branch so Vercel builds a preview. Do not merge it: the lead reviews the preview in the morning and merges if he likes it.

## 1. Clean the live demo first

- Run `npm run verify:clean` for the rows left by Monday evening's end-to-end runs (the patient request and its answer from test 4, any arrival or Ordre message left), so the demo starts clean. Report what was removed.

## 2. An antiepileptic showcase (do before part 3)

Everything we submitted says "we start with antiepileptics", but the national showcase confirms amlodipine. Change `demo:national` so the "confirmée" medicine is an antiepileptic from the CNAM list with several brands, preferably CARBAMAZEPINE or LEVETIRACETAM (both named in Phase 2.2). Pick one that has no data of its own on the live project (the script already refuses otherwise; LEVETIRACETAM had a stray report that was reset). Keep the other four showcase medicines as they are. Run `demo:clear`, then the new `demo:national`, with the fingerprint check. Update the video demo path in the report if the medicine changed, and regenerate the role previews (`npm run previews:build`).

## 3. Feature A: allocation comparison (handoff, section A)

On `/grossiste/repartition/[moleculeId]`: the stock input, and two results side by side, "Répartition proportionnelle à l'usage" (labelled "modèle de référence") and "Répartition selon les jours de couverture" (`fairSplit()`), with the same hospital reserve, need cap and unallocated-stock rules. Minimum days of cover first, a before/after range plot with a text equivalent, the reserve, the boxes allocated, the table sorted by least initial cover (weakest five shown, "Voir les 24 gouvernorats"). The existing decision action stays linked to the proposed split. Everything labelled "Simulation".

- The proportional helper is a new pure function in `lib/allocation/`, with deterministic rounding and stable ties, and its tests: conservation of boxes, zero stock, cap saturation, all-zero demand, small stock with rounding, the 2,500-box fixture.
- The handoff gives expected values at 2,500 boxes (250 reserved, 2,250 allocated, about 11.0 against 17.3 minimum days). Treat them as figures to verify: the screen and the tests compute them from the fixture and the functions. If the code gives different numbers, the code wins; write the difference in the report.
- Optional if quick: "Stock nécessaire pour viser 14 jours", computed, clearly marked as a simulated target.

## 4. Feature B: a draft playbook for the showcase antiepileptic (handoff, section B)

A versioned, typed draft in `lib/playbooks/` (or `docs/content/`), keyed by the exact catalogue molecule chosen in part 2. One source of truth: the thresholds and the split come from `lib/signal/params.ts` and `lib/allocation/params.ts` by reference, never copied.

- Shows: version, status "Brouillon", scope (molecule, and that it covers all its CNAM presentations for now), when it triggers, the geographic gate, the hospital reserve and the split rule, who can act at each level.
- An approval section with three clauses, each with the role proposed to review it and its state "En attente de validation": "Priorité de continuité" (hospital pharmacy and a clinical reviewer), "Plafond de commande" (wholesaler and supply coordinator), "Clause de substitution" (qualified clinical reviewers). No clause content is written by you: rule 11 holds. No guessed signatory, no real name.
- Where it appears: a page or section reachable from `/methode`; a "Voir le protocole appliqué" link on the coordination medicine panel, the wholesaler split and the pharmacy's alert for that molecule. Where an event has no recorded version, label the panel "Paramètres actuels".
- A second draft for the other antiepileptic of part 2 is optional, same structure.

## 5. "Ce qui manque" beside a level

On the coordination, hospital and prescriber medicine panels: one line saying which condition is still missing for the next level ("Il manque un deuxième gouvernorat", "Il manque des signalements de pharmacies"). On real data, respect the `<3` rule: name the missing condition, never an exact small count. In the scenario, exact counts are fine. Computed from the evaluator's evidence, never from a second copy of the rules. Tests.

## 6. Visual pass, on the branch `ui-refresh` (handoff, "Visual direction")

Apply the handoff's palette, typography and screen instructions, with these limits:

- The strong plum stage and the citron accent are for the presentation surfaces: home `/` and `/scenario`. The working consoles (pharmacy, wholesaler, coordination, centrale, Ordre, hospital) take the lavender paper, white panels and violet action, and stay sober: colour marks an action, the selection or a state. The four level colours keep their shapes and words, adjusted to the handoff's values and rechecked for contrast.
- Home: the 5/7 plum stage, "Démonstration · données simulées", the heading "Du premier signal à la décision", one sentence, a citron "Voir le scénario" button and a "Choisir un rôle" link, the scenario graphic from `scenarioFrames`. The national map and the grouped roles follow below. At 360 × 800 the primary button sits in the first screen.
- `/scenario`: the two editorial regions, the timeline with annotated events, "Pourquoi ce niveau ?" and "Qui peut agir ?", grouped controls, manual playback by default, reduced motion respected.
- Pharmacist: install help moves under "Plus"; the result screen reads "Signalement reçu", "Ce que votre signalement a changé", "Prochaine action"; the 72-hour rule in plain words at the timing choice; the two taps stay two taps.
- Wholesaler split and public medicine pages as the handoff says, "Simulation" next to any simulated status.
- Rewrite section 9 of `CLAUDE.md` and `AGENTS.md` on the branch to match, and record it in `docs/DECISIONS.md`. Interface texts stay in `messages/fr` and `messages/ar`; check right to left on the public pages.
- Regenerate the role previews on the branch.

Never, as before: cream or beige, orange-and-blue pairings, decorative gradients, glass, shadows everywhere, emoji as icons, stock images, animated counters, mixed styles inside a heading.

## 7. Optional, only if everything above is done: feature C (handoff, section C)

"Comparer les cas" next to the scenario: "Signal réparti" against "Signal concentré", browser only, deterministic, linked to the explorer on `/methode`.

## Done checks

1. `verify:clean` removed Monday's test rows; the live demo shows only the national picture.
2. The showcase "confirmée" medicine is an antiepileptic; `demo:clear` then `demo:national` leaves the fingerprint identical.
3. On the deployed site, changing the stock on the split page updates both results; the minimum days of cover come from the code; the allocation tests pass.
4. The playbook draft opens from `/methode` and from the three "Voir le protocole appliqué" links; its parameters match `params.ts` (a test proves it); every clause awaiting validation says so and names only a role.
5. "Ce qui manque" shows on the three panels and never reveals a count under 3 on real data.
6. The `ui-refresh` preview builds; screenshots at 360 and 1280 px of home, scenario, pharmacy, split page, public medicine page in French and Arabic; Lighthouse accessibility stays at 100 on those pages.
7. `npm run check` passes on `main` and on the branch.

Write `docs/reports/session-6.md`, with the preview link of `ui-refresh` at the top and the screenshots, so the lead can decide the merge in the morning.

## 8. Small additions, after part 6 (each one small; skip any that grows)

On `main` unless it is purely visual (then on `ui-refresh`). Same rules as everywhere: no pharmacy name, no level below "confirmée" on public pages, "Simulé" on simulated data, texts in the message files.

1. **Fix first: the home page shows levels below "confirmée" to the public** (probable, sous surveillance), which rule 10 forbids. Keep the national picture, but frame it as what the national unit sees: title "Ce que voit la cellule nationale", the "Démonstration · données simulées" line next to it, and only simulated signals in it. A signal from tester or official data below "confirmée" never appears on a public page. Test it.
2. **A hint strip per role.** A one-line, dismissible strip at the top of each professional space for a demo account: what to try first ("Essayez : signaler un médicament", "Essayez : changer le stock et comparer les deux répartitions", "Essayez : annoncer un arrivage"). A jury clicks around without instructions; this is their instruction. Dismissal kept in the browser only.
3. **"Ouvrir sur votre téléphone".** On the home page (desktop only), a QR code to the public medicine search, so a judge on a laptop tries the patient side on their phone in five seconds. In the Ordre and coordination invitation screens, the same QR for the tester invitation link. One small QR library, recorded in `DECISIONS.md`.
4. **Share a verified status.** On the public medicine page: "Partager ce statut" (Web Share API, with a WhatsApp link and copy-link as fallback). The shared text is the status sentence, the "Simulé" mention when simulated, and "Ceci n'est pas une déclaration officielle de rupture." Give each medicine page its own Open Graph card (medicine name, status, badge) with the existing share-card setup. This is the rumour check travelling into the WhatsApp groups where rumours start.
5. **Freshness.** On the public status and the professional panels: "Mis à jour il y a 4 min", computed from the signal's last evaluation.
6. **Status history strip on the public page.** A thin 90-day strip under the status, showing only the periods that were "confirmée" and "levée" (nothing below confirmed), like a service status page. Text equivalent. Reuse `LevelBand`.
7. **Latest changes feed.** In the coordination space and in the home page's national picture (framed as in item 1): the last five level changes, "il y a 2 h · AMLODIPINE · Probable → Confirmée · 13 gouvernorats", from the event log. No pharmacy, `<3` rule kept.
8. **Skeleton loading** instead of spinners or blank panels on the consoles and the patient answers page.
9. **Keyboard in the scenario**: left and right arrows step, space plays or pauses, shown in a small "Raccourcis" line.
10. **Optional, only if everything else is done**: a Ctrl+K quick search in the professional consoles to jump to any medicine (reuses `search_medicines`).

Add each one to the done checks in the report with its result.
