# Track B: the public space

Branch: `track-b-public`. Read `CLAUDE.md` (rules 1, 3, 10, 11, 12, 13 above all), `docs/PLAN.md`, `docs/CONTRIBUTING.md` and `docs/reports/shared-foundations.md` first.

Target: pull request ready Monday 23 November evening, fixes Tuesday before 18:00.

This is the part of the product for patients: the people who live the shortage. It's what turns RuptureWatch into shared intelligence instead of a tool for professionals. Everything here is anonymous, in French and Arabic, and built for a phone.

## What already exists (use it, don't rebuild it)

- Public layout `app/(public)/` with the language switch, `getTranslator()` / `translator(locale)`, `<Ltr>`, placeholder pages at your routes.
- `components/maps/PatientMap.tsx`: Google map with OpenStreetMap fallback, "Près de moi" that keeps the position on the device.
- Database functions: `create_availability_request` (service role, after `lib/availability/device.ts` hashes the device id), `requests_for_my_pharmacy`, `request_answers_public`. Tables `availability_requests`, `availability_answers`.
- `search_medicines(q)` (fuzzy search, molecule first), the CNAM catalogue, `LevelBadge`, `OriginBadge`.

## Tasks, in order

### 1. Public status of a medicine (the rumour check)

New migration (you write it, the team lead applies it): `public_molecule_status(molecule_id)`, `security definer`, callable by anyone. Returns the level **only** if it is `confirmed` or `cleared`, with its `since`; for any other level, or no signal, returns `none`. Never a count, never a rule, never `watch` or `likely` (rule 10). Access tested in `tests/db/`.

`/medicaments`: search box (same fuzzy search), results show the molecule first then its brands.

`/medicaments/[moleculeId]`:
- The answer to "Est-ce vrai ?" in plain words: "Rupture confirmée depuis le …", "Rupture levée le …", or "Aucune rupture confirmée à ce jour. Si vous ne trouvez pas votre médicament, demandez aux pharmacies proches." The disclaimer under it.
- Other brands of the same molecule from the CNAM list (label as written in the source, VEI category), with the caution line right above the list. Never another molecule.
- The button "Demander aux pharmacies proches".
- "Préviens-moi" (task 4).

### 2. The availability request (patient side)

- Tap "Demander aux pharmacies proches", then choose the area: a governorate list, or "Près de moi". With "Près de moi", find the governorate **on the device** by testing the position against `data/reference/governorates-map.json` (point in polygon), and send only the governorate code. The position itself never leaves the phone.
- A random device id is created once and kept in `localStorage`. The server action hashes it with `lib/availability/device.ts` and calls `create_availability_request`. If the function refuses (same molecule within 24 hours), say so kindly and link to the existing request if it is still open on this device.
- No name, no phone number, no free text field anywhere in this flow.
- Then go to `/demandes/[requestId]`.

### 3. The answers page

`/demandes/[requestId]`, refreshed every 10 seconds while open:
- How many pharmacies were asked and how many answered (from `request_answers_public`, counts under 3 as "moins de 3"), and the time left before the request expires.
- `PatientMap` with a marker for each pharmacy that answered "disponible" and chose to show itself: name, address, time of the answer. Under the map, the same list as text for screen readers.
- "Appelez avant de vous déplacer." If the medicine is confirmed short: "Présentez votre ordonnance."
- When nobody has answered yet: an honest waiting state, and the reminder that pharmacies answer when they can.
- When it expires: "Demande expirée", with a button to ask again tomorrow.

### 4. "Préviens-moi"

- A patient can follow medicines from their page. The list lives in `localStorage` only (rule 3): nothing is sent to our server except the molecule ids when the page checks their status.
- When the patient opens RuptureWatch, the public header checks the followed medicines with `public_molecule_status` and shows a calm banner if one of them changed (confirmed, or cleared). Say plainly: "Nous vérifions à chaque fois que vous ouvrez RuptureWatch. Rien n'est enregistré chez nous."
- No push notifications in this phase.

### 5. The pharmacy's answer (pharmacy side)

`app/(site)/(espace)/pharmacie/demandes/` (agreed in `CONTRIBUTING.md`; say in the pull request that you touched the pharmacy space, and add only a link to it in the pharmacy navigation):
- The open requests from `requests_for_my_pharmacy`: medicine, governorate, time left. Never anything about the patient.
- Three one-tap buttons per request: "Disponible, me montrer au patient", "Disponible, rester anonyme", "Pas disponible". Inserts the answer through the pharmacy's own session (row-level security applies), with the organisation's origin.
- A count of open requests next to the link in the pharmacy navigation.
- Pharmacies that chose "rester anonyme" still count as answers for the patient, but appear nowhere.

### 6. Past shortages for the public

`/ruptures-passees`: a public, plain-French version of the replay. Read `data/reference/episodes.csv` (format in `docs/briefs/session-4.md`). One row per episode: medicine, when it started, when it ended, source links. Until the file is there: "Données en cours de constitution". Link to `/retour` for the detailed timeline.

### 7. Prescriber check

`/prescripteurs`:
- Prescribers are professionals, so they may see earlier levels than the public. Add a demo role "Médecin prescripteur" (new organisation type `prescriber` in a migration, one demo organisation and account in the seed). `lib/demo/roles.ts` belongs to track A: change only what is needed to add this role, and say so in the pull request.
- Signed in as prescriber: search a molecule, see its level (all levels) with the explanation, the map counts by governorate (`governorate_counts`, extend its allowed roles to `prescriber`), and "Note de substitution : en attente de validation clinique". Nothing about any pharmacy.
- Not signed in: a short explanation and the one-click demo button.

## Texts

Write the French texts in `messages/fr/public.json`. Use these word for word where they apply:

| Key idea | French | Arabic (draft, to be checked by an Arabic speaker) |
| --- | --- | --- |
| Disclaimer | Ceci n'est pas une déclaration officielle de rupture. | هذا ليس إعلانًا رسميًا عن انقطاع الدواء. |
| No confirmed shortage | Aucune rupture confirmée à ce jour. | لا يوجد انقطاع مؤكَّد حتى الآن. |
| Brand caution | Ne changez pas de marque sans l'avis de votre pharmacien ou de votre médecin. | لا تغيّر العلامة التجارية دون استشارة الصيدلي أو الطبيب. |
| Request intro | Demandez aux pharmacies proches si elles ont ce médicament. Nous ne demandons ni votre nom ni votre numéro. | اسأل الصيدليات القريبة منك إن كان هذا الدواء متوفرًا لديها. لا نطلب اسمك ولا رقم هاتفك. |
| Call first | Appelez avant de vous déplacer. | اتصل قبل أن تتنقّل. |
| Préviens-moi | Préviens-moi | أعلِمني |
| Stored on phone | Cette liste reste sur votre téléphone. Rien n'est enregistré chez nous. | تبقى هذه القائمة على هاتفك فقط، ولا نحتفظ بها لدينا. |

Write the other Arabic texts in `messages/ar/public.json` and list every one of them in the pull request, so an Arabic speaker can check them before the jury sees them.

## Out of scope

Push notifications, WhatsApp to patients, any stock figure, any suggestion of another molecule, the directory of open pharmacies (track C), the Library (track C).

## Done checks (on your Vercel preview, at 360 px)

1. `/medicaments/[id]` of a molecule with no signal says "Aucune rupture confirmée à ce jour", in French and in Arabic. With a simulated confirmed signal (ask the team lead to run `demo:shortage`), it says confirmed. A test proves `public_molecule_status` never returns `watch` or `likely`.
2. A request made with "Près de moi" sends only a governorate code: show the network request in the pull request.
3. Signed in as "Pharmacie (Tunis)", the request appears; "Disponible, me montrer au patient" makes the pharmacy appear on the patient's map within 10 seconds. "Disponible, rester anonyme" increases the answer count and shows no pharmacy.
4. A second request for the same medicine from the same phone within 24 hours is refused with a clear message.
5. "Préviens-moi" survives a page reload, and the banner appears when a followed medicine changes.
6. `/prescripteurs` shows levels to the prescriber demo role and nothing about pharmacies.
7. `npm run check` passes; access tests cover every new function.

Write `docs/reports/track-b.md` with the checks, screenshots in French and Arabic at 360 px, the migrations added, and the list of Arabic texts.
