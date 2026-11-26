# Pilot 2: a pilot site real pharmacists can use alone (session A, part 2)

Branch: `pilot-a`, after `pilot-1`'s commits. Read `CLAUDE.md`, `docs/briefs/pilot-0-overview.md` (guardrails), then this.

## Why

Real and simulated data share one database and one level per molecule. A real pharmacist reporting LEVETIRACETAM would be counted with 24 simulated pharmacies. Real testers need a site with the real catalogue and zero simulated rows, and a first visit they understand alone.

## 1. One codebase, two sites: `NEXT_PUBLIC_APP_MODE`

- `NEXT_PUBLIC_APP_MODE` = `demo` | `pilot`, default `demo`, read in `lib/env.ts`, added to `.env.example`. The demo site does not change.
- In `pilot` mode:
  - `signInAsDemoRole` refuses on the server; no demo buttons on `/connexion` (form open), on `/scenario`'s role picker, on `/prescripteurs`.
  - `/vues` and `/scenario` return 404 (`/vues` needs `DEMO_ACCOUNT_PASSWORD`, unset on the pilot).
  - The home page leads with two doors: « Je suis pharmacien·ne » (sign-up by invitation, or sign-in) and « Je cherche un médicament ». `/retour` and `/methode` stay (real sourced data).
  - A thin line at the top of every page: « Pilote RuptureWatch : signalements réels de pharmacies testeuses. »
- Demo scripts guard: in `scripts/lib/script-env.ts` `serviceClient()`, accept only the demo project's URL (an allowlist from `DEMO_SUPABASE_URL`), so `seed:demo`, `demo:*` and `verify:clean` refuse on any other database. `verify:clean` deletes every tester pharmacy: it must never run on the pilot.
- Keep using `TESTER_INVITE_CODE` on the pilot (a new value, never shown in a demo space). Single-use invites wait until December.

### Pilot site checklist for the lead (put it in the pull request; Claude Code does not do it)

1. Supabase: new project, EU region. Auth → URL configuration: site URL = the pilot address.
2. `SUPABASE_DB_URL` of the pilot in a separate local env file, then `npm run db:push` against it (migrations from scratch), then `npm run catalogue:import -- --apply` and `npm run notices:import -- --apply`. No `seed:demo`, no `demo:*`.
3. Vercel: new project, same repository, branch `main`. Env vars: the pilot's Supabase URL, anon key, service role key and `SUPABASE_DB_URL`; `NEXT_PUBLIC_APP_MODE=pilot`; `NEXT_PUBLIC_SITE_URL` = the pilot address; new `DEVICE_HASH_SALT`, `CRON_SECRET`, `TESTER_INVITE_CODE`; the Google browser key and map ID. Leave `DEMO_ACCOUNT_PASSWORD`, `DEMO_SUPABASE_URL` and `WHATSAPP_*` unset.
4. Google key: add the pilot domain to its referrers.
5. `.github/workflows/keepalive.yml`: add the pilot's health URL, so the free database does not pause.
6. Check `/api/health` on the pilot, then join from a phone with the invitation link.

## 2. First visit, for a pharmacist alone

- After sign-up, three short screens, skippable, shown once (remembered in the browser), reopened from « Plus » → « Comment ça marche ». One sentence and one Lucide icon each:
  1. « Une commande n'arrive pas depuis plus de 3 jours ? Signalez-la en deux gestes. »
  2. « Quand plusieurs pharmacies signalent le même médicament, un niveau apparaît et tout le monde est prévenu. »
  3. « Des patients près de chez vous cherchent un médicament : répondez en un geste, et choisissez si votre pharmacie s'affiche. »
- Then the pharmacy lands on `/pharmacie` (pilot mode only; the demo keeps landing on `/pharmacie/signaler` for the video and e2e).
- Texts under `core.onboarding.*`.
- One line, once, after joining: « Gardez ce navigateur : votre accès est lié à ce téléphone et à ce navigateur. » For tester accounts, do not show the iPhone "add to home screen" hint (a home-screen app on iPhone has separate storage, so the tester would be signed out). Keep install help under « Plus » for other accounts.

## 3. « Un problème ? Une idée ? »

- A link in the pharmacy « Plus » menu and in the public footer. Opens a short page: one textarea (max 1,000 characters), three optional choices « Facile » / « Pas clair » / « Ne marche pas ». Under the textarea: « N'écrivez ni nom ni numéro de patient. » Public texts under `public.*` (French and Arabic), pharmacy texts under `core.*`.
- Migration: table `feedback` (`id`, `created_at`, `path` (route pattern only, ids and query removed), `organisation_id` nullable, `rating` nullable, `message`, `origin`). Insert through a `security definer` function in the `public` schema with `search_path = ''`; rate-limited without storing any visitor identifier: 5 per hour per organisation when signed in, and a global cap of 200 per hour for anonymous visitors. No device hash (it would link feedback to patient requests). No select for `anon` or `authenticated`; the lead reads it in the Supabase dashboard. Add it to `tests/db/grants.test.ts` and test the rules in `tests/db/`.

## 4. A patient where no pharmacy participates yet

On the pilot almost every request will reach no pharmacy. Today `/demandes/[id]` shows « 0 » pharmacies and « Gardez cette page ouverte » for three hours.

- When pharmacies asked = 0: replace the waiting state with « Aucune pharmacie participante dans ce gouvernorat pour l'instant. », a link « Voir les pharmacies ouvertes près de vous » (`/pharmacies`) and a link back to the medicine's status. French and Arabic.
- On the request form, under the governorate choice, one line: « RuptureWatch est en test : peu de pharmacies participent pour l'instant. » (pilot mode only).

## 5. Search for a product outside the list

When the search finds nothing, add: « Ce médicament n'est peut-être pas dans la liste CNAM des médicaments remboursés. » and a link to the feedback page. French and Arabic.

## Done checks

1. Locally with `NEXT_PUBLIC_APP_MODE=pilot`: no demo door, no demo role anywhere, `/vues` and `/scenario` 404, pilot line on every page, demo sign-in refused by the server.
2. With `demo`: the demo site unchanged apart from `pilot-1`.
3. Demo scripts refuse with a non-demo database URL (unit test on the guard).
4. Guide shown once after a tester joins, reopened from « Plus »; no iPhone install hint for testers.
5. Feedback saved through the function; `anon` cannot read the table (database tests).
6. Zero-recipient request page and no-result search text, in French and Arabic at 360 px.
7. `npm run check` green.
