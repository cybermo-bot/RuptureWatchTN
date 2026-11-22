# Contributing

Four people build RuptureWatch TN at the same time, one track each. These rules keep the four tracks from colliding. Read `CLAUDE.md` first: its product rules (section 2) apply to every line of every track.

## Branches

| Track | Branch | Owner |
| --- | --- | --- |
| A. Core (pharmacy flow, WhatsApp, coordination, showcase) | `main` | Team lead |
| B. Public space | `track-b-public` | Teammate |
| C. Directory and Library | `track-c-directory` | Teammate |
| D. Wholesaler | `track-d-wholesaler` | Teammate |

- Create your branch from the latest `main`: `git fetch origin` then `git switch -c track-b-public origin/main`.
- Never commit on `main` yourself. Open a pull request from your branch into `main`; the team lead reviews and merges it.
- Bring `main` into your branch often (`git fetch origin` then `git merge origin/main`), at least every morning and before opening a pull request. The team lead keeps pushing shared pieces to `main` while you work.
- Small commits, one concern each, plain messages ("Availability answer: one tap from the pharmacy's list").

## Where each track works

Keep to your own folders and your own message namespace. If you need to change something outside them, ask the team lead first, or say so plainly in the pull request.

| Track | Route folders | Message namespaces |
| --- | --- | --- |
| B | `app/(public)/medicaments/`, `app/(public)/demandes/`, `app/(public)/ruptures-passees/`, `app/(public)/prescripteurs/`, the pharmacy's answer screen under `app/(site)/(espace)/pharmacie/demandes/` | `public` (French and Arabic) |
| C | `app/(public)/pharmacies/`, `app/(public)/bibliotheque/`, `app/api/places/` | `directory`, `library` (French and Arabic) |
| D | `app/(site)/(espace)/grossiste/`, end-to-end tests in `tests/e2e/` | `wholesaler` (French only) |

Put components used only by your track under `components/<your-area>/` (`components/request/`, `components/directory/`, `components/wholesaler/`), and helpers under `lib/<your-area>/`.

Shared pieces, owned by the team lead. Use them; do not fork or edit them in your branch:

- `lib/signal/`: the warning logic. Nobody changes it (`CLAUDE.md` section 3).
- `components/maps/PatientMap.tsx`: the one patient map, for tracks B and C. Its texts are under `public.map.*`. If it lacks something you need, ask.
- `app/(public)/layout.tsx`, `components/public/` (header, footer, language switch, `Ltr`, `UnderConstruction`), `lib/i18n.ts`, `lib/i18n-server.ts`.
- `messages/fr/core.json`.
- The availability functions in `supabase/migrations/20261122001000_availability.sql`: `create_availability_request`, `requests_for_my_pharmacy`, `request_answers_public`, `demand_by_governorate`. Server code hashes the device id with `lib/availability/device.ts` before calling `create_availability_request`.

## Interface text

- Every word on screen comes from `messages/fr/<namespace>.json` (and `messages/ar/<namespace>.json` for public pages). The lint fails on text written inside JSX.
- Keys are used with their namespace: `t('public.request.title')`. In the file `messages/fr/public.json` the key is written without the prefix: `{ "request": { "title": "…" } }`.
- Public pages get the visitor's language with `getTranslator()` (server) and pass `locale` to client components, which call `translator(locale)`. A key missing in Arabic shows the French text and warns in development.
- Medicine names, codes and numbers inside Arabic text go in `<Ltr>`.
- Patient guidance, switch advice and anything clinical: never write it yourself. Show "En attente de validation clinique" until the team supplies a reviewed text (`CLAUDE.md` rule 11).

## Database

- Every database change is a new migration file in `supabase/migrations/`, written in your branch. Name it with the time you create it and your track: `20261123093000_track_b_request_page.sql`. Never edit a migration that is already on `main`.
- Row-level security on every table you create, in the same migration, and explicit grants (see the existing migrations).
- **You never apply a migration to the live database.** The team lead applies migrations after merging. Your pull request says which migrations it adds and what they do.
- Test access rules in `tests/db/` with the PGlite harness (`tests/db/harness.ts`), like `tests/db/availability.test.ts`.
- Seed rows go in `supabase/seed/` and are marked `simulated`.

## Secrets

- Never commit `.env.local`, a key, a token or a password. `.env.example` lists the names only. Ask the team lead for the values.
- The Supabase service role key and `GOOGLE_PLACES_API_KEY` are used in server code only, never in a client component.

## Before you open a pull request

1. `npm run check` passes on your machine (lint, type check, tests). CI runs the same on every push; a red CI is fixed before anything else.
2. Merge the latest `main` into your branch and run the checks again.
3. Fill in the pull request template: what it does, the done checks from your brief and how you checked them, migrations added, screenshots at 360 px.

## Vercel previews

Vercel builds a preview deployment for every pull request and posts its link on the pull request. Test your work there, on a phone or at 360 px, before asking for a review: it is the same build the jury will get once merged.

- Previews use the same live database as production. Use the demo roles, mark anything you create as simulated, and tell the team lead what to clean up.
- The Google browser key works only on the domains it is restricted to. If the map on a preview shows "Carte de secours", the preview domain is not in the key's list yet: tell the team lead.
- Merged work counts as done only when its checks pass on https://rupturewatch-tn.vercel.app.
