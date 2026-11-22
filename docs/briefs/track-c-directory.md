# Track C: pharmacies open near me, and the Library

Branch: `track-c-directory`. Read `CLAUDE.md` (rules 3, 9, 12 and 13 above all), `docs/PLAN.md`, `docs/CONTRIBUTING.md` and `docs/reports/shared-foundations.md` first.

Target: pull request ready Monday 23 November evening, fixes Tuesday before 18:00.

Two public pages: a map of the pharmacies around the patient with their opening hours, and a Library page that shows what the platform could do with an official over-the-counter list.

## What already exists

- Public layout, language switch, `getTranslator()`, `<Ltr>`, placeholders at `/pharmacies`, `/bibliotheque`, `/bibliotheque/[moleculeId]`.
- `components/maps/PatientMap.tsx` (Google, or OpenStreetMap fallback) with "Près de moi" that keeps the position on the device.
- A server route stub `app/api/places/nearby/route.ts`. See the change below.

## One change to the plan: search Google from the phone, not from our server

Rule 3 says the patient's position never reaches our server. So call the Places API **from the browser**, through the Maps JavaScript API's Places library (`Place.searchNearby`), with the browser key restricted to our domains. The position goes only to Google, as part of the search. Leave `app/api/places/nearby/route.ts` answering 503, or delete it and say so in the pull request.

## Tasks, in order

### 1. Pharmacies open near me (`/pharmacies`)

- "Près de moi" (or a governorate chosen from a list, centred on its middle) then a nearby search for `includedTypes: ["pharmacy"]`, radius about 3 km, up to 20 results.
- Ask Google only for the fields shown: display name, formatted address, location, regular opening hours, current opening hours (open now), national phone number, Google Maps link. Fewer fields cost less.
- Filters computed on the phone from the opening hours: "Ouvert maintenant", "Ouvert ce soir après 22 h", "Ouvert le week-end". A pharmacy with no hours on Google shows "Horaires non renseignés" and stays visible only when no filter is on.
- Each pharmacy: name, address, open or closed now, today's hours, a "Appeler" link (`tel:`), an "Itinéraire" link to Google Maps.
- A line at the top: "Liste issue de Google Maps. Ces pharmacies ne participent pas forcément à RuptureWatch." For the garde: "Pharmacies de garde : nous n'avons pas encore de source officielle. Renseignez-vous auprès de votre pharmacie ou du Conseil de l'Ordre." No garde data from any unofficial site.
- Rule 13, strictly: nothing Google returns is stored, cached, logged or sent to our server. It is shown on the Google map only. When the map falls back to OpenStreetMap, use the fallback list below instead.

### 2. OpenStreetMap fallback

- `scripts/export-osm-pharmacies.ts`: one Overpass query for `amenity=pharmacy` in Tunisia, saved as `data/reference/osm-pharmacies.json` (name, latitude, longitude, raw `opening_hours`, OSM id), with the date and the ODbL attribution recorded in `data/SOURCES.md`.
- When `PatientMap` reports the OpenStreetMap provider, `/pharmacies` loads that file and sorts by distance **on the phone**. Opening hours parsed with a small, maintained library (one line in `docs/DECISIONS.md`), "Horaires non renseignés" when missing.
- Attribution "© OpenStreetMap" under the list.

### 3. The Library (`/bibliotheque`)

Data: the French public medicines database (base de données publique des médicaments), downloadable files under the Licence Ouverte. Use `CIS_bdpm.txt` (products), `CIS_COMPO_bdpm.txt` (substances), `CIS_CPD_bdpm.txt` (conditions of prescription and dispensing).

- `scripts/import-library.ts` builds `data/reference/library-fr.json`: for each substance name, the French products containing it and, for each, whether it is on a prescription list (liste I, liste II, stupéfiant, or another prescription condition in CPD) or not. Record the download date, URL and licence in `data/SOURCES.md`.
- Check the rule you used on 10 known products and list them in the report. If the CPD file can't tell "sans ordonnance" reliably, say so and show only "Sur ordonnance en France" and "Statut non déterminé". Never guess.
- Match CNAM molecules to French substance names by normalised name (upper case, no accents, salts kept). Show unmatched molecules as "Pas de correspondance dans la base française", never a guess.
- `/bibliotheque`: search a molecule (same fuzzy search as the rest of the app). `/bibliotheque/[moleculeId]`: the French status per product, the source and its date.
- On every Library page, at the top, in the strongest style the design allows without shouting: "Statut en France, pas en Tunisie. Ne l'utilisez pas pour décider d'un traitement." No link from the Library to the request flow and no link from the request flow to the Library (rule 12). No "alternatives", no suggestion of anything.

### 4. Arabic

All texts in `messages/fr/directory.json`, `messages/fr/library.json` and their Arabic files. List every Arabic text in the pull request for checking. The banner in Arabic (draft): "الوضع في فرنسا وليس في تونس. لا تعتمد عليه لاتخاذ قرار علاجي."

## Manual steps you need from the team lead

The Google browser key and map ID in Vercel (Production and Preview) and in your `.env.local`. Until then you build and test with the OpenStreetMap fallback, which must work on its own.

## Out of scope

Storing anything from Google, a garde rotation from unofficial sources, the availability request (track B), any medicine advice.

## Done checks (on your Vercel preview, at 360 px)

1. With the Google key: `/pharmacies` with "Près de moi" shows nearby pharmacies with open-now status and hours; the "Ouvert maintenant" filter works; the network panel shows no request to our server carrying coordinates or Google data.
2. Without the key: the OpenStreetMap list appears, sorted by distance, with the attribution.
3. `/bibliotheque/[id]` for levetiracetam and for paracetamol shows the French status with its source and date, under the banner, in French and in Arabic.
4. The report lists the 10 products used to check the prescription rule, and how many CNAM molecules matched.
5. `npm run check` passes.

Write `docs/reports/track-c.md` with the checks, screenshots, data sources and the list of Arabic texts.
