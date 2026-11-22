# Decisions

Newest first. Each entry: what was decided, and why.

## 2026-11-22, shared foundations

### Message files split by track, keys prefixed by namespace
- `messages/fr/{core,public,directory,library,wholesaler}.json` and `messages/ar/{public,directory,library}.json`. Every key starts with its namespace (`core.home.tagline`, `public.pages.medicines.title`), so the type checker catches a key in the wrong file and two tracks never edit the same file. Existing keys moved to `core` unchanged.
- `t()` stays French. Public pages use `translator(locale)` with the locale from `getTranslator()` (`lib/i18n-server.ts`). A key missing in Arabic shows the French text and warns once in development.
- The Arabic strings of the public shell (header, footer, placeholders, page titles) were written by the developer, not a translator, and need review by an Arabic speaker before the jury sees them.

### Two root layouts: `app/(site)` and `app/(public)`
`lang` and `dir` must be set on `<html>`, and a nested layout cannot do that. Existing routes moved to `app/(site)/` (French, unchanged URLs); `app/(public)/` has its own root layout reading the `rw-lang` cookie. Moving between the two reloads the page, which is what a language change of the whole document needs. Unknown addresses use `app/global-not-found.tsx`, which requires `experimental.globalNotFound` (Next 16 documents it as experimental; the alternative, a root layout reading the path from a request header, would keep the wrong `dir` after client-side navigation).
- IBM Plex Sans Arabic is loaded with the `arabic` subset only and not preloaded; Latin text in Arabic pages falls through to IBM Plex Sans. `<Ltr>` (`<bdi dir="ltr">`) keeps medicine names and codes readable inside right-to-left text.
- The language switch is a plain form posting to a server action (`setLocale`): it works before JavaScript loads, and only redirects to a path on this site.

## 2026-11-22, session 2

### Tester onboarding: accounts created by the server, no anonymous sign-in
- `/rejoindre/<code>` creates a Supabase user with the admin API (random `testeur-<uuid>@rupturewatch.example` address, random 32-byte password never stored, email confirmed) and signs in with it on the server. The session cookie is the only key. This needs no dashboard setting, unlike anonymous sign-ins, and anonymous sign-ins have their own lower rate limit (30 per hour per IP by default), which a test morning could exhaust from one counter.
- `create_tester_pharmacy()` (service role) creates the pharmacy and the profile in one transaction, numbered from a sequence: "Pharmacie testeuse n° N, <gouvernorat>". Only the governorate is asked.
- Testers get no "Changer de rôle": signing out would lose the account, and joining again would count the same person as a second pharmacy. Joining again from a browser that already holds a tester session goes straight to `/pharmacie`.
- `qrcode` (npm, MIT): draws the invite link as an SVG on the server for `/coordination/invitation`. No client JavaScript.

### Report flow
- Two taps from the space: a followed molecule's row opens its page, which carries the four "when was it ordered" buttons (tap two). The primary button "Signaler une commande non livrée" opens the picker for any other medicine (tap one: the medicine; tap two: when). "Il y a 3 jours", "4 à 7 jours", "Plus d'une semaine" set `ordered_at` to now minus 3, 5, 8 days; "Moins de 3 jours" sends nothing.
- A pharmacy that reports a molecule follows it automatically, so it receives that molecule's alerts.
- The result screen reads the level before and after from the recompute (passed in the URL, validated against the five levels; only the visitor's own screen uses them), the explanation from the current signal row, and the impact from `report_impact`.
- `report_impact` counts distinct pharmacies including the reporter. Below 3 it returns `<3` and withholds the number of governorates, because "<3 in 2 governorates" would reveal exactly 2. The screen then says "Avec votre signalement, moins de 3 pharmacies signalent ce médicament…".
- "Moins de 3" applies to pharmacy counts in every explanation sentence. Governorate counts are shown as they are: they do not single out a pharmacy.

### Live updates: Supabase Realtime, with polling as a fallback
`signals` and `alerts` are in the `supabase_realtime` publication (migration 0008). `LiveRefresh` subscribes with the visitor's session (row-level security applies to each event) and re-renders the page on a change. If the channel is not joined within 5 seconds, or drops, it polls instead: every 15 seconds for a pharmacy's alerts, every 4 seconds for the coordinator list (the brief asks for under 5 seconds).

### The signal service stores each evaluation atomically, with compare-and-set
- `lib/signals/recompute.ts` loads 120 days of reports and notices, calls `evaluate()`, and stores the result through `apply_signal_evaluation()`, a service-role SQL function. It writes the `signals` row only if level and `updated_at` are still what was read; the event row and the alerts are written in the same transaction. On a conflict nothing is written and the service reloads and evaluates again (up to 5 times). A crash can therefore never leave a level change without its event, and two simultaneous reports never produce a duplicate or skipped event (`tests/signal-service.test.ts`, `tests/db/pharmacy-flow.test.ts`).
- `updated_at` is set with `clock_timestamp()` and compared as stored (microseconds kept), so two writes in the same transaction-time never compare equal.
- No row is written for a molecule with no evidence and no row: `signals` holds only molecules that have had a signal.
- The fading of "levée" back to none after 7 days (`cleared_expired`) is logged in `signal_events` but alerts nobody: it is not news to anyone. Every other change, stand-downs included, alerts every pharmacy following the molecule and every wholesaler, hospital pharmacy and coordinator organisation.
- The daily cron (`/api/cron/recompute`, 04:30 UTC, `vercel.json`) checks `Authorization: Bearer <CRON_SECRET>`, which Vercel Cron sends when `CRON_SECRET` is set. Without the variable every call is refused.

## 2026-11-21, session 1

### WhatsApp: Graph API v27.0, senders identified by business-scoped id when present
- `lib/whatsapp/client.ts` pins `GRAPH_API_VERSION = 'v27.0'`, the version used on Meta's send-messages page read on 21 November 2026. Change it in that one constant.
- Since 2026, a user with a WhatsApp username may arrive without `messages[].from` (phone number) but with `messages[].from_user_id` (business-scoped user id, BSUID). The parser accepts either. The stored `sender_hash` is a salted SHA-256 of the BSUID when present, otherwise of the phone number, so the same person keeps the same hash if they hide their number. The raw number or id is never stored.
- The reply goes to `to` (phone) when the webhook gave one, otherwise to `recipient` (BSUID), as Meta documents.
- The webhook stores the message, answers Meta 200, then sends the acknowledgement with `after()`. A duplicate delivery (same `message_id`) inserts nothing and gets no second reply. If storage fails, it answers 500 so Meta retries.
- Signature: HMAC-SHA256 of the raw body with the app secret, compared in constant time, checked before parsing. Missing or wrong: 401.

### Governorate boundaries from geoBoundaries (ODbL), not Natural Earth
Natural Earth admin-1 (public domain) has only 23 Tunisian units: Ariana (TN-12) is missing. geoBoundaries gbOpen TUN ADM1 has all 24 with ISO codes, from OpenStreetMap, under ODbL 1.0. Attribution is shown under the map. `scripts/build-governorate-map.ts` projects and simplifies it to a 20 KB file (7 KB gzipped).

### The national catalogue: the current CNAM VEI list, commercial name kept word for word
- The brief names the version of 3 December 2025. CNAM's site now publishes only the update of 6 November 2026 (the 2025 file name returns 404), so we use that one and say so.
- The source gives brand, strength, form and pack size in one free-text field (`NOM_COMMERCIAL`). We store it word for word in a `label` column (added to the brief's `medicines` columns) and extract only a short `brand` (first word plus following capitalised words, rules in `scripts/lib/catalogue.ts`, tested). `dosage`, `form` and `presentation` stay empty: splitting free text with patterns would produce wrong values ("100/5 ML" reads as "5 ML"), and the brief says gaps are not filled.
- One molecule per normalised DCI: upper case, single spaces, combinations written "A + B" in the source's order. "A + B" and "B + A" would be two molecules; none was seen in this file.
- `code_pct` is kept as the text of the source number. If CNAM codes ever had leading zeros, Excel has already dropped them in the source.

### Fuzzy search
`search_medicines(q)` normalises with `unaccent` + lower case, matches by trigram word similarity (threshold 0.4, set on the function) or by prefix on brand and DCI, ranks by the best of those, returns 10. Tested on the full catalogue in `tests/db/search.test.ts`: brand, DCI, DCI with French accents, one-letter misspelling, half word.

### Access rules
- Reports: a pharmacy reads and inserts its own reports only. Inserts must be for its own organisation and governorate, channel `web`, origin `tester` or `simulated`, dated now (no backdating). No update or delete for anyone but the service role. WhatsApp, the simulator and the replay write through the service role.
- Other roles never select from `reports`. They get `governorate_counts(molecule_id)`, a `security definer` function returning counts by governorate with counts under 3 as `<3`, open to coordinators, wholesalers and hospital pharmacies, refused to pharmacies and anonymous visitors. Suppressed cells are ordered by code so the order does not reveal 1 versus 2.
- `governorate_counts` repeats in SQL the counting done by `countByGovernorate()` in `lib/signal`. This is the one place a rule exists outside `lib/signal`, because the access boundary has to be in the database. The thresholds are not decided in SQL: the server passes them from `lib/signal/params.ts`. `tests/db/access.test.ts` checks that both give the same counts on the same data, window and delay edges included.
- `signals.evidence` and `signal_events.evidence` reject any JSON with keys such as `pharmacyId`, `organisation_id` or `reports` (check constraint).
- `signal_events` is append only, enforced by a trigger, even for the service role. The scenario reset (session 4) can delete only inside a function that sets `rupturewatch.allow_event_reset = on` for its transaction.
- Grants are written explicitly in each migration, so access does not depend on the project's default exposure settings. Our project grants nothing by default: `system_meta` had been left to the defaults and `/api/health` failed on the first deployment, fixed in migration 000700. `tests/db/grants.test.ts` now runs the migrations both with and without default grants and checks the full privilege matrix for every table and public function.

### Governorates are a migration, not a seed
The 24 governorates (ISO 3166-2:TN, checked against the ISO list) are official reference data, not demo data, so they are inserted by a migration and exist in every environment. Seed files hold only `simulated` rows.

### Access rules are tested on every push, without a live database
`tests/db/` runs the real migrations in PGlite (Postgres compiled to WebAssembly, with `pg_trgm` and `unaccent`) behind a small shim for Supabase's roles and `auth.uid()` (`tests/db/supabase-shim.sql`). `tests/live/` repeats the key checks against the real project with the real demo accounts (`npm run test:live`).

### One-click demo roles
- "Changer de rôle" signs out with `scope: 'local'`. The default (global) would revoke every session of the shared demo account, signing out other visitors using the same role.
- Supabase limits sign-ins to 30 per 5 minutes per IP by default, and all demo sign-ins come from the server. The limit is raised in the dashboard (manual step), and a 429 shows a plain "try again in a minute" message.
- Interface text inline in JSX fails the lint (`react/jsx-no-literals`), enforcing that all text lives in `messages/fr.json`.

Five auth users, one per role button, created by `scripts/seed-demo.ts`, all sharing `DEMO_ACCOUNT_PASSWORD` from the server environment. The button sends only a role key from a fixed list. Emails use the reserved `.example` domain, so no mail can ever be sent. "Changer de rôle" signs out and returns to the role picker.

### Next.js 16 with Cache Components turned off
`create-next-app` 16.4 enables `cacheComponents`. With it, every cookie read must sit behind a Suspense boundary and instant-navigation checks flag every session route. Almost every page here reads the session; the request-time model is simpler and predictable with `@supabase/ssr`. `proxy.ts` (Next 16's name for middleware) refreshes the session cookie.

### Design tokens
`--level-watch` is `#9A7500` instead of `#B58A00`: the original gives 2.9:1 on `--surface-subtle`, below the 3:1 needed for a meaningful shape. Badge words are always in `--ink`. `--brand-strong` (`#0A5444`) added for hover only.

### Dependencies
- `@supabase/supabase-js`, `@supabase/ssr`: database, auth, session cookies in Next.js.
- `server-only`: makes a build fail if server code (service role key) is imported into a client component.
- `vitest`: unit tests, required by the plan.
- `tsx`: runs the TypeScript scripts in `scripts/`.
- `exceljs` (dev): reads the CNAM `.xlsx`. Chosen over the npm `xlsx` package, which is no longer updated on npm.
- `@electric-sql/pglite` (dev): runs the migrations and access tests in CI without Docker.
- `supabase` (dev, CLI 3.2.0): applies migrations (`npm run db:push`).
- `@types/node` 22: matches the Node version used here and in CI, and Vitest 5's peer range.
