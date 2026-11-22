# Shared foundations for the parallel tracks

Read `CLAUDE.md` (rules 1, 3, 10, 12 and 13 especially) and `docs/PLAN.md` first.

Three teammates start tracks B (public space), C (directory and Library) and D (wholesaler) on Sunday 22 November, each on their own branch with their own Claude Code. This work lays the shared pieces they all need, on `main`, so they don't each invent them and collide. Build the plumbing and the contracts, not their features.

## 1. Message files split by track

- Move to `messages/fr/<namespace>.json` and `messages/ar/<namespace>.json`, with namespaces `core`, `public`, `directory`, `library`, `wholesaler`. `t()` keeps working with keys prefixed by namespace (`public.request.title`). Move existing keys to `core` without changing their text.
- Arabic: `ar` files exist for `public`, `directory` and `library` only (empty objects for now). A missing Arabic key falls back to French and logs a warning in development.
- The lint rule against inline text still applies.

## 2. Public layout with French and Arabic

- A route group `app/(public)/` with its own layout: no sign-in, a language switch (FR / عربي) stored in a cookie, `lang` and `dir="rtl"` set on the document for Arabic, IBM Plex Sans Arabic loaded for Arabic.
- Empty placeholder pages, each with an honest "en cours de construction" state, at the paths the tracks will own:
  - Track B: `/medicaments` (search), `/medicaments/[moleculeId]` (status, same-molecule brands, request), `/demandes/[requestId]` (answers map), `/ruptures-passees`, `/prescripteurs`
  - Track C: `/pharmacies` (open near me), `/bibliotheque`, `/bibliotheque/[moleculeId]`
- A public header link from the home page: "Je cherche un médicament".
- Check the layout in Arabic at 360 px: text right to left, numbers and medicine names still readable.

## 3. Availability requests and answers (schema only)

One migration. Row-level security on every table, as in `CLAUDE.md`.

| Table | Columns | Access |
| --- | --- | --- |
| `availability_requests` | id, molecule_id, medicine_id null, governorate_code, delegation null, created_at, expires_at (created_at + 3 hours), device_hash (salted hash of a random id kept on the device, for rate limiting only), origin | Insert only through a server function. No direct select for anyone but the service role. |
| `availability_answers` | id, request_id, organisation_id, answer (`available`, `unavailable`), show_identity boolean, answered_at, origin | A pharmacy inserts its own answer to a request routed to it and reads its own answers. |

And on `organisations`: `latitude`, `longitude`, `public_address` (all nullable). For the 12 demo pharmacies, set fictional coordinates near the centre of their governorate, spread a few hundred metres apart, marked simulated by the organisation's origin. Never place a demo pharmacy on a real pharmacy's address.

Functions, each `security definer`, access tested in `tests/db/`:

- `create_availability_request(molecule_id, medicine_id, governorate_code, delegation, device_hash)`: refuses a second request for the same molecule from the same device_hash within 24 hours; returns the request id.
- `requests_for_my_pharmacy()`: for a pharmacy, open requests in its governorate it has not answered yet (molecule, medicine, created_at, expires_at). Never any device_hash.
- `request_answers_public(request_id)`: for anyone, answers with `answer = 'available'` and `show_identity = true` only: pharmacy display name, latitude, longitude, public_address, answered_at, origin. Nothing about pharmacies that said no or chose to stay hidden. A count of how many pharmacies were asked and how many answered, with counts under 3 as `<3`.
- `demand_by_governorate(molecule_id, window_days)`: for coordinators, wholesalers and hospital pharmacies: requests, answered, unanswered per governorate in the window, counts under 3 as `<3`. Refused to pharmacies and anonymous visitors.

Seed nothing. Tracks B and D build the screens.

## 4. One patient map component

`components/maps/PatientMap.tsx`, client side, used by tracks B and C:

- With `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` set: Google Maps JavaScript API, markers passed in as props, Google attribution as Google requires.
- Without it, or when the Google script fails to load: Leaflet with OpenStreetMap tiles and the OpenStreetMap attribution, same props. A small "carte de secours" note.
- The patient's position: asked with the browser's geolocation only when the patient taps "Près de moi", used on the device, never sent to our server. Our server only ever receives a governorate or delegation.
- Server route `app/api/places/nearby/route.ts` stub for track C: reads `GOOGLE_PLACES_API_KEY` server-side, returns 503 with a clear message when the key is absent. Track C fills it in. Responses are never stored or logged (rule 13).
- Add both keys to `.env.example` with a comment on how each must be restricted (browser key by HTTP referrer, server key by API).

## 5. Branch and pull request setup

- `docs/CONTRIBUTING.md`: one branch per track (`track-b-public`, `track-c-directory`, `track-d-wholesaler`), pull request into `main`, CI must be green, migrations written in the branch but applied to the live database only by the team lead, each track keeps to its route folders and message namespace, never commit `.env.local`.
- A pull request template with the done checks list and "screenshots at 360 px".
- Vercel builds a preview for every pull request: say so in `CONTRIBUTING.md` so teammates test there.

## Done checks

1. `t()` works across the split files; all existing pages still show the same French text; lint and tests pass.
2. `/medicaments` placeholder renders in French and in Arabic, right to left, at 360 px.
3. The new migration applies on the live project. Access tests prove: a pharmacy cannot see device_hash; the public answers function never returns a pharmacy that said no or chose to stay hidden; demand counts under 3 come back as `<3`; a second request from the same device within 24 hours is refused.
4. `PatientMap` shows the OpenStreetMap fallback with two test markers when no Google key is set.
5. `docs/CONTRIBUTING.md` and the pull request template are on `main`.

Write `docs/reports/shared-foundations.md`.
