# Session 1 report: foundations and data spine

Status: **in progress**. Everything that does not need the team's accounts is built, tested and committed. The done checks on the deployed site wait for the Supabase values, then the GitHub repository and the Vercel project, then the Meta values. This report is updated as each check passes.

## 1. Done checks

| # | Check | Status | How it was or will be verified |
| --- | --- | --- | --- |
| 1 | Home page right at 360 px and 1280 px | Pending on deployed site | Checked locally with headless Chrome at both widths. Two screenshots of the deployed site still to send. |
| 2 | Each role button signs in with one click, shows the role's name and "Changer de rôle" | Pending | Needs the Supabase project, the migrations and `npm run seed:demo`. |
| 3 | A test proves a demo pharmacy cannot read another organisation's reports, and a coordinator cannot select from `reports` | Passing locally; live run pending | `tests/db/access.test.ts` (27 tests) runs the real migrations in PGlite on every push. `tests/live/access.test.ts` repeats it against the real project with the real demo accounts (`npm run test:live`). |
| 4 | `/dev/search` finds one medicine from its brand, its DCI, the DCI without accents, and a one-letter misspelling | Passing on the full catalogue locally; deployed check pending | `tests/db/search.test.ts`: EPITAM found from "epitam", "levetiracetam", "lévétiracétam", "levetiracetan", "levetir". |
| 5 | `/api/health` returns a value read from the database; CI green; daily workflow run once by hand | Pending | Route built and tested to return 503 without a database. Needs the deployment, the GitHub repository and the `HEALTH_URL` variable. |
| 6 | `/status` draws all 24 governorates | Passing locally; deployed check pending | Screenshot at 1280 px; `tests/map.test.ts` ties the map file to the 24 codes of the migration. |
| 7 | WhatsApp acknowledgement within seconds, a row in `wa_inbound`, 401 on a bad signature | Pending on the Meta values | Signature check, parsing, duplicate handling and the 401 are unit tested (`tests/whatsapp*.test.ts`, 22 tests). |
| 8 | `tests/signal.test.ts` still passes, unchanged | Passing | 31 of 31. `lib/signal/` and the test file are byte-for-byte as delivered (first commit). |

Local totals: 115 tests pass; lint (with a rule that fails on inline interface text), type check and production build are clean.

## 2. What was built

**Routes**
- `/`: home page, product sentence, three steps, the four levels, one-click role picker.
- `/pharmacie`, `/grossiste`, `/hopital`, `/coordination`: role spaces showing the organisation, its origin badge and "Changer de rôle", with an honest empty state.
- `/status`: live database check, schema version, deployed commit, map of the 24 governorates.
- `/dev/search`: hidden search check page.
- `/api/health`, `/api/medicines/search`, `/api/whatsapp/webhook` (GET handshake, POST events).
- French 404 and error pages.

**Tables** (all with row-level security, in `supabase/migrations/`): `system_meta`, `governorates` (24 rows), `molecules`, `medicines`, `organisations`, `profiles`, `followed_molecules`, `reports`, `foreign_notices`, `signals`, `signal_events` (append only, by trigger), `alerts`, `wa_inbound`.

**Functions**: `search_medicines(q)`, `governorate_counts(molecule_id, window_days, min_undelivered_hours, at)`, and helpers in a non-exposed `app` schema (`normalize`, `current_organisation_id`, `current_organisation_type`, `current_governorate_code`, `evidence_is_aggregate`).

**Scripts**: `db:push`, `seed:demo`, `catalogue:import` (dry run by default, `--apply` to write), `map:build`.

**Components**: `LevelBadge`, `OriginBadge`, `Button`, `Input`, `PageHeader`, `EmptyState`, `HairlineList`, `HairlineTable`, `GovernorateMap`, `RolePicker`, `SessionBar`.

**CI**: `.github/workflows/ci.yml` (lint, type check, tests on every push) and `keepalive.yml` (daily call to `/api/health`, plus manual trigger).

## 3. Catalogue findings

- **Source:** CNAM, "Liste des médicaments couverts par le régime de base classés en VEI", update of 06/11/2026, from https://www.cnam.nat.tn/espace_ps.jsp. The 3 December 2025 version named in the brief is no longer published (404).
- **Format:** `.xlsx`, one sheet, 3,358 data rows, columns `CODE_PCT, NOM_COMMERCIAL, PRIX_PUBLIC, TARIF_REFERENCE, CATEGORIE, DCI, AP`. No empty cell in any required column, no duplicate code.
- **Rows parsed:** 3,358. **Rejected:** 0. **Molecules:** 548 distinct normalised DCIs. **VEI categories:** E 2,853, I 348, V 157.
- **What is stored:** the commercial name word for word (`label`), a short brand extracted by tested rules, the DCI, the molecule, the VEI category, the public price. Strength, form and pack size stay empty: the source has them only inside free text.
- **Sample:** 20 rows drawn with a fixed seed, source next to stored values, in `data/reference/cnam-vei-2026-11-06.sample.md`. One wrong brand found in the first draw ("AMOXICILLINE SANOFI(EX AMOXICILLINE") was fixed and turned into a test.
- **Database import:** pending (`npm run catalogue:import -- --apply` once Supabase is connected).

## 4. Decisions

All in `docs/DECISIONS.md`. The main ones:
- Cache Components turned off in Next.js 16 (every page reads the session).
- Governorate boundaries from geoBoundaries (ODbL, OpenStreetMap): Natural Earth has no Ariana.
- `governorate_counts` repeats the counting of `countByGovernorate()` in SQL, because the access boundary has to be in the database. Thresholds come from `lib/signal/params.ts`; a parity test checks both agree. **This is the one place a rule exists outside `lib/signal`; please confirm you accept it.**
- `--level-watch` darkened to `#9A7500` for 3:1 contrast on the grey surface.
- "Changer de rôle" signs out locally only, so shared demo accounts never sign out other visitors.
- WhatsApp Graph API v27.0; senders hashed on the business-scoped id when present.

## 5. Open questions and blockers

- **Blocked on values:** Supabase (URL, anon key, service role key, database connection string), then GitHub and Vercel, then Meta.
- **Question:** do you accept `governorate_counts` mirroring the counting rule in SQL (see 4)?
- **Question:** should pharmacies also see counts by governorate later (for "what my report changed")? Today they are refused.

## 6. Manual steps pending for the team lead

1. Fill the four Supabase values in `.env.local` (done for the three random values).
2. Supabase dashboard, Authentication → Rate Limits: raise "sign-ups and sign-ins" from 30 to about 300 per 5 minutes. Every demo sign-in comes from the server's IP.
3. Create the GitHub repository and give its URL, so the code can be pushed and CI can run.
4. Import the repository in Vercel and add the environment values (not `SUPABASE_DB_URL`, which stays on your machine).
5. GitHub repository variable `HEALTH_URL` = `https://<deployment>/api/health`, then run the keep-alive workflow once by hand.
6. Meta: give the WhatsApp values, then set the webhook URL to `https://<deployment>/api/whatsapp/webhook` with the verify token from `.env.local`, and subscribe to `messages`.
