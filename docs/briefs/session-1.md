# Session 1: foundations and data spine

Read `CLAUDE.md` and `docs/PLAN.md` first. This session builds everything the later sessions stand on. Nothing here is a full user feature yet, but every screen built later will look and behave the way this session sets up.

Target: done by Saturday 21 November, evening.

## What already exists in the folder

- `CLAUDE.md`, `docs/PLAN.md`, this brief.
- `lib/signal/` and `tests/signal.test.ts`: the warning logic and its 31 tests. Keep them exactly as they are.

`create-next-app` refuses a folder that already has files. Scaffold into a temporary subfolder, move the generated files up, keep every existing file, then delete the temporary folder. `START-HERE.md` is for the team lead; leave it in place. Make sure `tests/signal.test.ts` runs and passes under the project's Vitest setup.

## Values you will need from the team lead

Ask for them when you reach the step that needs them. Never print them in logs or commit them.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DEMO_ACCOUNT_PASSWORD        # long random string, server only, used by the demo role buttons
WHATSAPP_VERIFY_TOKEN        # any long random string we choose
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_APP_SECRET
WHATSAPP_HASH_SALT           # long random string, for hashing phone numbers
```

## Tasks, in order

### 1. Skeleton and CI

- Next.js (App Router), TypeScript strict, Tailwind, ESLint, Vitest. Folder layout as in `CLAUDE.md`.
- `.env.example` with the names above, `.gitignore` covering `.env*.local`, `node_modules`, `.next`.
- `docs/DECISIONS.md` and `data/SOURCES.md`, started.
- GitHub Actions: lint, type check, tests on every push.
- `messages/fr.json` with a tiny helper `t(key)` used by every component. No interface string inline.

### 2. Design system and home page

- Tokens from `CLAUDE.md` section 9 as CSS variables and Tailwind theme values. IBM Plex Sans and Plex Mono through `next/font`.
- Components, each small and accessible: `LevelBadge` (shape plus word for the four levels), `OriginBadge` (Source officielle, Testeur, Simulé), `Button`, `Input`, `PageHeader`, `EmptyState`, `Hairline` list and table styles.
- Home page (`/`), French, mobile first:
  - Product name and one sentence: "Repérer les ruptures de médicaments avant qu'elles n'atteignent le comptoir."
  - Three short lines on how it works (report, signal, act).
  - The role picker: buttons "Pharmacie (Tunis)", "Pharmacie (Sfax)", "Grossiste", "Pharmacie hospitalière", "Coordination". Each signs in with one click (task 4).
  - A quiet footer: "Prototype étudiant, AOTN TSYP 14. Aucun statut officiel. Données de démonstration signalées comme simulées."
- Take real care here. This page sets the visual tone for the whole product and will be reviewed from screenshots at 360 px and 1280 px.

### 3. Database schema and access rules

One migration per logical group, all under `supabase/migrations/`. Enable `pg_trgm` and `unaccent`. Row-level security on every table, in the migration that creates it.

| Table | Columns (main ones) | Who can read | Who can write |
| --- | --- | --- | --- |
| `system_meta` | schema_version, created_at | anyone | nobody |
| `governorates` | code (ISO 3166-2:TN, e.g. TN-11), name_fr, name_ar | anyone | nobody |
| `molecules` | id, name (normalised DCI), atc_code null, watchlist bool | anyone | service role |
| `medicines` | id, code_pct, brand, dci, dosage, form, presentation, vei_category, price_tnd, molecule_id, source | anyone | service role |
| `organisations` | id, type (pharmacy, wholesaler, hospital_pharmacy, coordinator), display_name, governorate_code, origin | own row only | service role |
| `profiles` | user_id, organisation_id, role | own row only | service role |
| `followed_molecules` | organisation_id, molecule_id | own organisation | own organisation (pharmacy) |
| `reports` | id, organisation_id, governorate_code, molecule_id, medicine_id, kind (not_delivered, delivered_again), ordered_at, reported_at, channel (web, whatsapp), origin | own organisation only | own organisation (pharmacy), insert only |
| `foreign_notices` | id, molecule_id, source, status, published_at, url, origin | anyone | service role |
| `signals` | molecule_id (pk), level, since, rule, evidence jsonb, updated_at | authenticated | service role |
| `signal_events` | id, molecule_id, from_level, to_level, rule, evidence jsonb, at | authenticated | service role, append only |
| `alerts` | id, organisation_id, signal_event_id, channel, sent_at, read_at | own organisation | service role |
| `wa_inbound` | message_id (unique), sender_hash, body, received_at | nobody (service role) | service role |

Rules:

- No role other than the reporting pharmacy may select from `reports`. Coordinators, wholesalers and hospital pharmacies get aggregates only, through `security definer` SQL functions that return counts by governorate with counts under 3 returned as the string `<3`, never pharmacy ids or names. Write `governorate_counts(molecule_id)` now.
- `evidence` jsonb in `signals` and `signal_events` must never contain pharmacy ids. When the app stores an evaluation, it stores counts, not the report list.
- `search_medicines(q text)`: returns up to 10 medicines with their molecule, ranked by trigram similarity on brand and DCI, accent-insensitive. Trigram indexes on both.

### 4. Seed data and one-click demo roles

- Seed the 24 governorates with French names (verify codes against ISO 3166-2:TN).
- Seed demo organisations, all `origin = simulated`, with plainly fictional names:
  - 12 pharmacies: 3 in Tunis, 2 in Ariana, 3 in Sfax, 2 in Sousse, 2 in Kairouan ("Pharmacie démo A, Tunis", and so on).
  - 2 wholesalers, 1 hospital pharmacy, 1 coordination unit.
- Create one demo auth user per role button on the home page, linked through `profiles`. A seed script creates them with the Supabase admin API.
- The role buttons call a server action that signs in as that demo user using `DEMO_ACCOUNT_PASSWORD` from the server environment. The visitor never types anything.
- A visible "Changer de rôle" control on every signed-in page.
- Do not seed any reports, notices or signals in this session.

### 5. National medicine catalogue

- Source: CNAM's list of medicines reimbursed under the basic scheme (the VEI list, version published 3 December 2025). Look for it on CNAM's official website.
- If you find it: save the raw file in `data/raw/cnam/`, write `scripts/import-catalogue.ts` to parse it into `medicines` and `molecules` (one molecule per normalised DCI; combinations keep the full DCI string), and record the source in `data/SOURCES.md`.
- Report: format, rows parsed, rows rejected and why, 20 random rows next to their source lines.
- Do not fill gaps. A missing field stays empty.
- If the site is unreachable or the file will not parse after two honest attempts, stop on this task, write what failed, and ask the team lead to download the file by hand into `data/raw/cnam/`. Move on to the other tasks meanwhile.

### 6. Search check

- A temporary page `/dev/search` (hidden from navigation) with one input that calls `search_medicines` as you type, to check the matching. Try: a brand, a DCI, a DCI without accents, a misspelling, half a word.

### 7. Health, keep-alive, governorate map

- `/api/health`: real database query, returns status, schema version, commit hash.
- `/status`: the same in French, plus the governorate outline drawn as SVG.
- Governorate boundaries: find a file under an open licence, simplify it to a size fit for a phone, save in `data/reference/`, record licence and attribution in `data/SOURCES.md`. Build a `GovernorateMap` component that takes a value per governorate code and draws it, with the 24 names available as labels and in a text list for screen readers.
- A scheduled GitHub Actions workflow that calls `/api/health` daily so the free Supabase project is not paused.

### 8. WhatsApp webhook spike

Only once the team lead has given the WhatsApp values.

- `GET /api/whatsapp/webhook`: Meta's verification handshake with `WHATSAPP_VERIFY_TOKEN`.
- `POST /api/whatsapp/webhook`: check `X-Hub-Signature-256` against `WHATSAPP_APP_SECRET` on the raw body, reject anything unsigned or wrong, parse text messages, ignore duplicates by message id, store in `wa_inbound` with the sender as a salted hash, reply through the Cloud API: "Bien reçu : « <texte> ». RuptureWatch TN, prototype." Answer Meta with 200 promptly.
- Unit tests for the signature check and payload parsing, with fixtures shaped like Meta's current documentation. Record the Graph API version used in `docs/DECISIONS.md`.

## Out of scope for this session

Reporting screens, alerts, the coordinator dashboard, any computation of signals, seeding reports or notices, Arabic, Playwright.

## Done checks (on the deployed site)

1. The home page looks right at 360 px and 1280 px. Send two screenshots.
2. Each role button signs in with one click and shows the role's name and "Changer de rôle".
3. A test proves that a demo pharmacy cannot read another organisation's reports, and that a coordinator cannot select from `reports` at all.
4. `/dev/search` finds the same medicine from its brand, its DCI, the DCI typed without accents, and a one-letter misspelling. Or task 5 is blocked and the report says exactly why.
5. `/api/health` returns a value read from the database. CI is green. The daily workflow has run once by manual trigger.
6. `/status` draws all 24 governorates.
7. A WhatsApp message from a registered phone gets the acknowledgement within a few seconds, a row appears in `wa_inbound`, and a request with a bad signature gets 401. Or the Meta values are not available yet and the report says so.
8. `tests/signal.test.ts` still passes, unchanged.

## Session report

Write `docs/reports/session-1.md`. Include:

1. Each done check: pass or fail, and how it was verified.
2. What was built: routes, tables, functions, scripts.
3. Catalogue findings: source URL, format, row counts, the sample.
4. Decisions made and why (also in `docs/DECISIONS.md`).
5. Open questions and blockers.
6. Manual steps still pending for the team lead.
