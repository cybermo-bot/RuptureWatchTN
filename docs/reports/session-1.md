# Session 1 report: foundations and data spine

Status: **in progress**. Everything that does not need the team's accounts is built, tested and committed. The done checks on the deployed site wait for the Supabase values, then the GitHub repository and the Vercel project, then the Meta values. This report is updated as each check passes.

## 1. Done checks

| # | Check | Status | How it was or will be verified |
| --- | --- | --- | --- |
| 1 | Home page right at 360 px and 1280 px | Passing on https://rupturewatch-tn.vercel.app | Headless Chrome with an exact 360 × 780 mobile viewport and 1280 × 900: no horizontal overflow at 360, layout as designed. Screenshots sent to the team lead. |
| 2 | Each role button signs in with one click, shows the role’s name and "Changer de rôle" | Passing on the deployed site | Headless Chrome clicked each of the 5 buttons: each landed on its space (/pharmacie ×2, /grossiste, /hopital, /coordination) in 1.6 to 2.4 s, showing its organisation ("Pharmacie démo A, Tunis", "Pharmacie démo F, Sfax", "Grossiste démo 1, Ben Arous", "Pharmacie hospitalière démo, Sousse", "Cellule de coordination démo, Tunis") and "Changer de rôle", which returned to the role picker signed out. |
| 3 | A test proves a demo pharmacy cannot read another organisation’s reports, and a coordinator cannot select from `reports` | Passing locally and on the live project | `tests/db/access.test.ts` runs the real migrations in PGlite on every push. `npm run test:live` against the real project with the real demo accounts: 6 of 6 pass (Tunis sees its report, not Sfax’s; Sfax cannot read Tunis’s even by id; coordinator gets permission denied on `reports` and counts with `<3` from `governorate_counts`; a pharmacy cannot call `governorate_counts`; anonymous visitors read nothing). The two test reports are deleted after the run. |
| 4 | `/dev/search` finds one medicine from its brand, its DCI, the DCI without accents, and a one-letter misspelling | Passing on the deployed site | EPITAM (levetiracetam) is returned for "epitam" (#1), "EPITAM" (#1), "epitan" (#1), "levetiracetam" (#6 of 10), "lévétiracétam" (#6), "levetiracetan" (#6), "levetir" (#6). For DCI queries the other levetiracetam brands rank level with it. The page itself was driven in Chrome at 360 px. |
| 5 | `/api/health` returns a value read from the database; CI green; daily workflow run once by hand | Health passing; CI and workflow waiting on the team lead | `/api/health` on the deployed site: `{"status":"ok","schemaVersion":7,...}`. The first deployment returned 503: the new project grants nothing on new tables and `system_meta` had no explicit grant (fixed by migration 000700, see section 4). The repository is private, so the CI result and the manual workflow run need the team lead (section 6). |
| 6 | `/status` draws all 24 governorates | Passing on the deployed site | 24 shapes with 24 distinct codes in the page, database "Répond", schema 7, commit shown. Screenshot at 1280 px. |
| 7 | WhatsApp acknowledgement within seconds, a row in `wa_inbound`, 401 on a bad signature | Pending on the Meta values | Signature check, parsing, duplicate handling and the 401 are unit tested (`tests/whatsapp*.test.ts`, 22 tests). |
| 8 | `tests/signal.test.ts` still passes, unchanged | Passing | 31 of 31. `lib/signal/` and the test file are byte-for-byte as delivered (first commit). |

Local totals: 147 tests pass; lint (with a rule that fails on inline interface text), type check and production build are clean.

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
- **Database import:** done on 21 November 2026: 3,358 medicines and 548 molecules in the live project.

## 4. Decisions

All in `docs/DECISIONS.md`. The main ones:
- Cache Components turned off in Next.js 16 (every page reads the session).
- Governorate boundaries from geoBoundaries (ODbL, OpenStreetMap): Natural Earth has no Ariana.
- `governorate_counts` repeats the counting of `countByGovernorate()` in SQL, because the access boundary has to be in the database. Thresholds come from `lib/signal/params.ts`; a parity test checks both agree. **This is the one place a rule exists outside `lib/signal`; please confirm you accept it.**
- Every grant is explicit in the migrations. The live project grants nothing on new tables by default; `system_meta` relied on the default and `/api/health` failed until migration 000700. `tests/db/grants.test.ts` now checks the full privilege matrix with and without default grants.
- `--level-watch` darkened to `#9A7500` for 3:1 contrast on the grey surface.
- "Changer de rôle" signs out locally only, so shared demo accounts never sign out other visitors.
- WhatsApp Graph API v27.0; senders hashed on the business-scoped id when present.

## 5. Open questions and blockers

- **Blocked on values:** Meta (WhatsApp). **Waiting on the team lead:** CI result and the manual keep-alive run (private repository).
- **Question:** do you accept `governorate_counts` mirroring the counting rule in SQL (see 4)?
- **Question:** should pharmacies also see counts by governorate later (for "what my report changed")? Today they are refused.

## 6. Manual steps pending for the team lead

1. Supabase: all four values received; 7 migrations applied, 16 demo organisations and 5 demo accounts seeded, catalogue imported. Done.
2. Supabase dashboard, Authentication → Rate Limits: raise "sign-ups and sign-ins" from 30 to about 300 per 5 minutes. Every demo sign-in comes from the server's IP.
3. GitHub repository received; `main` pushed to https://github.com/cybermo-bot/RuptureWatchTN. The repository is private, so the CI result has to be read in its Actions tab.
4. Import the repository in Vercel and add the environment values (not `SUPABASE_DB_URL`, which stays on your machine).
5. GitHub repository variable `HEALTH_URL` = `https://<deployment>/api/health`, then run the keep-alive workflow once by hand.
6. Meta: give the WhatsApp values, then set the webhook URL to `https://<deployment>/api/whatsapp/webhook` with the verify token from `.env.local`, and subscribe to `messages`.
