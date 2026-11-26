# Pilot 3: say which product (session B, part 1)

Branch: `pilot-b`, from `main` after `pilot-a` is merged. Read `CLAUDE.md`, `docs/briefs/pilot-0-overview.md` (guardrails), `docs/reports/medicine-search-design.md`, then this.

## Why

Shortages hit products: EPITAM syrup can be missing while EPITAM 500 mg tablets are fine. Pharmacists, wholesalers and the Pharmacie centrale think and order by product (`code_pct`). Today a report says only the molecule.

## Scope: product on reports, level still per molecule

The level stays per molecule in `lib/signal/` (unchanged). The pharmacist says which product when they know it; professionals see which presentations are reported. The signal per presentation group (molecule + strength + form) is planned before 15 December, in a separate brief. Write this in `DECISIONS.md`.

**Already built, do not rebuild:** the patient request with the chosen product preselected and « toute marque » widening (`components/public/RequestForm.tsx`), the pharmacy seeing the product on a request (`components/pharmacy/RequestList.tsx`), `availability_requests.medicine_id`, the presentation helpers in `lib/public/presentation.ts`.

## 1. The pharmacist picks the product, still in two taps

- Step 2 of « Signaler » (`/pharmacie/signaler/[id]`), above the four delay buttons: « Quelle présentation ? » as a compact list of the molecule's CNAM presentations (form picture, brand, label), preselected with the last product this pharmacy reported for this molecule, with a first choice « Plusieurs ou je ne sais pas ». Choosing a delay sends the report, as today: still two taps after the medicine is found.
- `reports.medicine_id` is stored when a product is chosen; it stays nullable (WhatsApp, seeds and existing tests insert without it). The server action checks the product belongs to the molecule. Add the same check to the database insert policy only if `tests/db/pharmacy-flow.test.ts` and `tests/db/access.test.ts` stay green; otherwise leave it in the action and say so.
- « Livré à nouveau » stays per molecule (the level is per molecule; a delivered tablet must not lift a syrup shortage at product level later).
- Keep the e2e selectors of the report flow (`choix-suivis` and the others in `tests/e2e/core-flows.spec.ts`); add, do not rename.

## 2. Which presentations are reported

- Function `public.presentations_reported(p_molecule_id uuid)`, `security definer`, `search_path = ''`: for the last 14 days, per `medicine_id`, the label, brand and `app.shown_count(distinct pharmacies)`. Never an organisation. Callable by coordination, centrale and hospital roles. Grants test entry, database tests (no organisation returned, `<3` kept, `anon` and pharmacies refused).
- Shown under the level on the coordination panel and the centrale panel (rows with form picture, brand, label, count or `<3`), sorted by count.
- The pharmacy's own result screen: one line with the product it just reported, no counts of others (the session-5 decision keeps pharmacies out of counts).
- Public page, only when the level is « confirmée » on non-simulated data: « Présentations signalées » with product names only. A separate anonymous function gated on « confirmée », like `public_arrival`. In « Autres marques de la même molécule », a small « signalée » tag on those presentations.
- Seeds: add `medicine_id` to the simulated reports in `lib/demo/shortage.ts` and `lib/demo/national.ts` (choose real CNAM presentations of each molecule, spread over two or three), so the demo site shows the lists. Update `tests/db/demo-*` accordingly. The lead re-seeds with `demo:reset` on Friday.

## Not now

The form picker for patients (« Sous quelle forme ? ») and any change to `create_availability_request`; following products; product-level « livré à nouveau »; changing the signal key; WhatsApp product choice.

## Done checks

1. Démo A reports CARBAMAZEPINE with a chosen presentation in two taps; the row has `medicine_id`; « Plusieurs ou je ne sais pas » stores none.
2. After the lead applies the migration and re-seeds: the coordination and centrale panels for LEVETIRACETAM list presentations with counts or `<3`.
3. Database tests for the two functions; `npm run check` green; e2e selectors unchanged.
