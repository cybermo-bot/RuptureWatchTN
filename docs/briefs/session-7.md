# Session 7 (track A): make it obvious

Read `CLAUDE.md`, then `docs/reports/session-6.md`. Work on `main`, commit and push after each part, apply any migration before pushing the code that needs it. This runs with nobody to answer: never stop to ask; when something needs the lead, skip it, note it, go on. Every product rule in `CLAUDE.md` section 2 still holds.

## Why this session

The features are there; the experience is not. The lead built the platform and still finds it hard to use. A juror opens the link with no instructions and has about 30 seconds. Today the home page spends its first screen on a frozen map, the scenario starts at "Aucun signal", the strongest proof (four reports: Tunis alone gives "Probable", one moved to Sfax gives "Confirmée") is buried at the bottom of `/scenario`, and every screen is crowded with badges, rule ids and explanation paragraphs.

This session removes more than it adds. The test for every change: can a stranger say, after 30 seconds, what triggered the warning, who can act, and what to click next?

Rules for the whole session:
- One main action per screen, visibly the main one. Secondary things go behind a link or a "Pourquoi ?" tap.
- Cut text: no paragraph where a sentence does, no sentence where a label does. Rule ids (`confirmed_threshold`), long explanations and method notes move behind "Pourquoi ?".
- Keep visible where a result is shown: the "Simulé" badge, the level shape and word, "Ceci n'est pas une déclaration officielle de rupture.", `<3`.
- Keep the current palette (plum, lavender, violet, citron). Fewer bordered panels, stronger headings, more room around the main action, colour only for status and actions.

## 1. The first click does something (the scenario)

Rebuild the entry of `/scenario` around the decision point, from the existing "Comparer les cas" logic (`lib/scenario/`, `evaluate()`), browser only, deterministic, resettable:
- It opens with three simulated reports already in place for the fictional medicine, the map and the current level ("Probable"), and one button: « Ajouter le 4ᵉ signalement ». The juror chooses where it comes from: « Tunis » or « Sfax ».
- Tunis: the level stays « Probable », with one plain sentence: « Tous les signalements viennent du même gouvernorat : c'est peut-être un problème de distribution local. » Sfax: it becomes « Confirmée »: « Deux gouvernorats signalent la même commande non livrée : la rupture est confirmée. » The governorate lights up on the map; one short pulse; reduced motion respected.
- Then one button: « Comparer la répartition », which opens the allocation comparison for this fictional case (same calculator as the wholesaler page, simulated stock, the 11.0 against 17.3 days kind of result computed, never typed), with « Enregistrer la décision » shown but disabled in the simulation, explained in one line.
- « Recommencer » always visible. « Voir tout le scénario » opens the full replay (the current player) below or on its own anchor.
- Every element carries "Simulé". Tests: Tunis gives probable, Sfax gives confirmed, reset returns to three reports, nothing is written.

## 2. The home page: one line, one button, three doors

- Top: « Repérer les ruptures de médicaments en Tunisie, avant qu'elles n'atteignent le comptoir. » One primary button: « Essayer la démo » (to part 1). One sentence under it at most.
- Right below, three doors, each a direct link to a task, not to a role picker:
  - « Je cherche un médicament » → `/medicaments` (search field focused).
  - « Je suis pharmacien » → the Tunis demo pharmacy signed in, opening on « Signaler ».
  - « Je coordonne » → a small chooser of the four professional roles (Ministère, Pharmacie centrale, Ordre, Grossiste), each one line, then signed in.
- Remove the national dashboard and the role screenshot grid from the home page (the national picture stays in the ministry space; this also removes any level below "confirmée" from the public home). The QR code, "Comprendre", the archive, the method and the service status move to the footer or a "En savoir plus" section at the bottom.
- At 360 × 800, the line, the button and the three doors fit in the first screen.

## 3. Professional medicine screen: level, reason, next action in one block

On the coordination, hospital and wholesaler medicine panels, the top block reads in this order: level (shape, word, "Simulé"), one sentence of reason, « Ce qui manque », then « Prochaine action » for this role (a button: for the wholesaler « Comparer la répartition », for the ministry « Voir le journal » or « Note de situation », for the centrale « Annoncer un arrivage »). The levetiracetam playbook link sits in that block with its version and « Brouillon ».
- Fix the wording on the split page: the ordering cap is « Plafond de commande : à fixer avec les grossistes et la coordination (en attente de validation) », not "validation clinique". Make clear it is not the "besoin de la période" cap used by the calculator.
- Ministry space: « À examiner » first, above the map: the highest-priority medicine with its reason, next action and a link to the decision log. Keep one chart beside it. Label patient charts « Demandes reçues via RuptureWatch » with their date range.
- Add a small « Sources et actualités » list in the ministry space: the 9 documented past episodes and the foreign notices, each with its source link and date, newest first. Real, sourced data only.

## 4. The patient asks for the exact product

Today a patient selects "ANTIOMAL 500 mg, boîte de 60" and lands on a generic levetiracetam page; the request asks only about the molecule. Fix the promise:
- The search result keeps the selected presentation. The medicine page shows it first: name, strength, form, pack, then the molecule status.
- The request carries `medicine_id` (the column and the function argument already exist; the web action sends null today). The pharmacy sees the exact product in its request list and on WhatsApp. The patient's answers page names it.
- The request screen states its scope before sending: « Vous demandez : ANTIOMAL 500 mg, boîte de 60, aux pharmacies participantes de Tunis. » A secondary option asks for « toute marque de lévétiracétam », with the brand caution line.
- Answers: a timestamped list first (« Pharmacie démo A, Tunis · disponible · il y a 2 min »), the map second. The open-pharmacy directory stays out of these results.
- Test it end to end with two strengths of the same brand: each request reaches the pharmacy with its own product and comes back with its own answer.

## 5. A picture for every medicine (dosage form)

No real box photos (copyright, no open source). Instead, one clean illustration per dosage form, drawn in SVG in our style: comprimé, gélule, sirop or solution buvable, injectable, crème or pommade, gouttes, suppositoire, sachet, inhalateur, and a neutral one for unknown. Derive the form from the CNAM label with a tested parser (`Comp`, `Gél`, `Sirop`, `Sol Inj`, `Pdre`, `Gttes`, `Crème`…); unknown → the neutral icon, never a guess. Show it in search results, on the medicine page, in the pharmacy's lists and in the request. Alt text names the form. Report how many CNAM rows got a form and how many stayed unknown.

## 6. Remove distractions from the first visit

- The pharmacist demo opens on « Signaler », with « Mes médicaments » and « Demandes » one tap away.
- Hide from first view, behind secondary links: the French OTC library, the threshold explorer, the archive, the QR code, the service status, exports, `/vues`, the full role grid.
- Each space's sidebar keeps at most five items; the rest under « Plus ».
- Move every rule id and method note behind « Pourquoi ? ».
- No pharmacy pins anywhere except a pharmacy that chose to show itself to one patient. No per-report pulse on any map: only a governorate highlight when a level changes.

## 7. Optional, only after parts 1 to 6: import a pharmacy's orders (CSV)

A demonstration of what an inventory connection would do, clearly labelled. In the pharmacy space, « Importer mes commandes (démonstration) »: one documented CSV format (date, code PCT or name, quantity ordered, quantity delivered), a downloadable sample file of simulated orders, a preview of the lines still undelivered after 72 hours matched to the catalogue, and the pharmacist ticks which ones to report, then confirms. Nothing is sent without confirmation. Parser tests.

## Done checks

1. A teammate who has never seen the new version opens the deployed home page: in 5 seconds they point to « Essayer la démo »; in 30 seconds they have made the level change from « Probable » to « Confirmée » and can say why.
2. Tunis keeps « Probable », Sfax gives « Confirmée », reset works, nothing is written (tests).
3. The home page shows no level below "confirmée" and fits line, button and three doors in 360 × 800.
4. A request for one presentation reaches the pharmacy with that presentation and comes back with it, for two strengths of the same brand.
5. Every medicine shown has a form picture or the neutral one; the parser tests pass.
6. Lighthouse accessibility stays at 100 on the changed pages; `npm run check` passes.
7. Screenshots at 360 and 1280 px of the home, the scenario entry before and after the 4th report, the professional medicine block, the patient request, in `docs/reports/session-7/`.

Write `docs/reports/session-7.md`.
