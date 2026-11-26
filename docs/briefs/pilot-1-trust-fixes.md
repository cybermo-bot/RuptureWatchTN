# Pilot 1: trust fixes and small bugs (session A, part 1)

Branch: `pilot-a`, from `main`. Read `CLAUDE.md`, `docs/briefs/pilot-0-overview.md` (guardrails), then this. Small, safe changes; one commit per item.

## 1. A simulated status must not read as a real shortage

The public page of LEVETIRACETAM (a real antiepileptic) says « Rupture confirmée » from simulated data, and it can be shared to WhatsApp. Shared, that is the rumour the product exists to stop.

When the status shown on a public page is simulated (reuse `isSimulatedStatus()` from `lib/public/share.ts`):

- Above the status, a full-width banner in the strongest style the design allows: « Démonstration : ce niveau vient de données simulées. Il ne dit rien de la situation réelle de ce médicament. » (French and Arabic, `public.*` keys). Keep the status sentence below it, smaller: `tests/e2e/core-flows.spec.ts` and the video path still read « Rupture confirmée ».
- Keep the share feature (session 6 decision), but the banner sentence becomes the **first line** of the shared text and the headline of the Open Graph card (`lib/og/card.tsx`) for a simulated status. Add a test in `tests/share.test.ts`.
- On `/vues`, add the banner to the public panel only (`FourViewsPanels`); the page already carries its demo line.
- The unused keys `public.medicine.simulation` and `simulationNote` can go.
- `DECISIONS.md`: one line on the banner and the shared text.

Check: the LEVETIRACETAM page anonymously at 360 px; the shared text and `/medicaments/<id>/opengraph-image` start with « Démonstration ».

## 2. The tester invite code is shown in a one-click demo

The one-click Ministry demo shows the real `TESTER_INVITE_CODE` at `/coordination/invitation` (and `/ordre/invitation`), so anyone can create tester pharmacies.

- Pass the signed-in organisation's origin from both invitation pages into `components/institutions/TesterInvitation.tsx`. When the origin is `simulated`: « Lien d'invitation masqué dans la démonstration. » and no QR code, no URL anywhere in the HTML.
- Pull request note for the lead: rotate `TESTER_INVITE_CODE` on Vercel. Until the pilot is live, the lead gives invitation links by hand.

## 3. Jurors must not break the showcase, and the lead must be able to reset it

One juror reporting TAMOXIFENE from « Pharmacie démo A, Tunis » turns the "concentrated in Sfax, stays probable" demo into « confirmée » for everyone.

- Export one list of showcase molecules from the demo code (the `NATIONAL_MOLECULES` values plus `DEMO_SHORTAGE_MOLECULE`), and reuse it everywhere below and in `scripts/clean-verification.ts`. No second hand-typed list.
- For the two one-click demo pharmacies: showcase molecules appear in « Signaler » and « Mes médicaments » with a small « démonstration » tag and are not tappable for reporting (the medicine page still opens). The server actions for « non livré » and « livré à nouveau » refuse them too, and the WhatsApp path. The database insert policy is not changed in this brief (say so in the report).
- The hint strip's text points to a non-showcase molecule with no signal (for example CARBAMAZEPINE); keep its link (`tests/hints.test.ts`).
- Point jurors who want to see gate two to `/scenario`, which already shows it without writing anything.
- New npm script `demo:reset -- --since <ISO time>`: runs `verify:clean -- --since <time> --requests --apply`, then `demo:clear`, then `demo:shortage`, then `demo:national` (this order: `demo:national` needs the shortage seed). Never weaken the scripts' refusal checks. Document it in `scripts/` and in the report. Claude Code does not run it.
- `DECISIONS.md`: this reverses "the one-click pharmacies stay free for a live report during the demo" for showcase molecules only.

## 4. Doors: the demo first

`app/(site)/connexion/[audience]/page.tsx` shows email and password first and the demo as a `quiet` button.

- `pharmacie`: two primary buttons first, « Pharmacie démo, Tunis » and « Pharmacie démo, Sfax » (role `pharmacie-sfax` exists), with one line: « Deux pharmacies de gouvernorats différents : essayez-les l'une après l'autre. » `grossiste`: its demo button first, primary.
- `institution`: the four demo buttons first, labels unchanged (e2e).
- The email and password form below, inside `<details><summary>J'ai un compte</summary>`. In pilot mode (`pilot-2`) the form is shown open and the demo buttons are not rendered.

## 5. Developer pages out of the jury's way

- Remove « État du service » from `components/SiteChrome.tsx` (the only footer link). `/status` stays reachable by URL.
- `app/(public)/dev/carte` and `app/(site)/dev/search`: `notFound()` when `process.env.VERCEL_ENV === 'production'`. Do not delete them.
- `/status`: remove the sentence « Contour des gouvernorats, utilisé plus tard par la carte des signaux ». Keep the map's licence attribution if the map stays.

## 6. No raw rule code on any screen

The labels already exist (`core.method.rules.<code>.name`, and the team sentences in `core.rules.<code>`). The leak is `components/LevelExplanation.tsx` line 16, which renders `<code>{rule}</code>`, plus any journal that prints the code. Show the label name instead. Do not edit `core.rules.*`. Extend the existing coverage in `tests/content.test.ts` if a journal path is not covered.

## 7. Small bugs

- Pharmacy bottom bar at 375 px: labels overlap. Shorten the pharmacy tab label for requests to « Demandes » with a pharmacy-tab-specific key (do not change `core.nav.items.*`, shared with the sidebar). `pilot-4` rebuilds the bar.
- Coordination: the « Gouvernorats touchés » tile has a note keyed `core.ministry.governoratesNote` that reads « Pharmacies signalant sur {days} jours ». Fix the note to describe governorates. Do not invent a pharmacy figure.
- Patient answers page `/demandes/[id]`: when answers come back as `<3`, show « 1 ou 2 réponses » (the patient sees the named pharmacies right below). No migration; keep the suppressed « pharmacies interrogées » as is. Update `tests/db/availability.test.ts` only if it reads the page text (it should not).
- Pharmacy report result: the team sentence `core.rules.local_reports_below_threshold` appears three times. Show it once. Above it, one plain line from the result page's own keys: « Votre signalement est enregistré. Il faut le signalement d'une deuxième pharmacie pour passer à « Probable ». » (read the threshold from `params.ts`, singular/plural handled).
- Arabic plurals: « حُدّث قبل 8 ساعة » should be « 8 ساعات ». Add a small plural helper in `lib/i18n` with `Intl.PluralRules` and plural keys in both French and Arabic files (`tests/i18n.test.ts` requires the same keys). Use it for hours, days and pharmacies on public pages.
- `/scenario`: one line linking the fictional medicine to the showcase, inserting `DEMO_SHORTAGE_MOLECULE` (not typed): « Les mêmes règles s'appliquent à {molecule} dans les espaces de démonstration. »

## Done checks (local `npm run dev` at 360 and 1280 px, then the preview)

1. LEVETIRACETAM public page: banner; shared text and OG card start with « Démonstration ».
2. Ministry demo invitation page: no code in the HTML.
3. Démo A sees showcase molecules tagged, cannot report them (server refuses); CARBAMAZEPINE reports fine.
4. `/connexion/pharmacie`: Tunis and Sfax demo buttons first, form folded.
5. No footer link to `/status`; `/dev/*` 404 in production.
6. No raw rule code anywhere.
7. Each bug above checked.
8. `npm run check` green, test count not lower than before.
