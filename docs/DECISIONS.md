# Decisions

Newest first. Each entry: what was decided, and why.

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
