# RuptureWatch TN

Early warning and coordination prototype for medicine shortages in Tunisia. Student project, AOTN TSYP 14. No official status.

Start with `CLAUDE.md`, then `docs/PLAN.md`.

## Run locally

```
npm install
copy .env.example .env.local   # then fill in the values
npm run dev
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run check` | Lint, type check, all tests |
| `npm test` | Unit tests, access rules on PGlite, search on the full catalogue |
| `npm run test:live` | Access checks against the real Supabase project (needs `.env.local`) |
| `npm run db:push` | Apply `supabase/migrations` (needs `SUPABASE_DB_URL`) |
| `npm run seed:demo` | Demo organisations and the five demo users |
| `npm run catalogue:import` | Parse the CNAM list; add `-- --apply` to write it to the database |
| `npm run map:build` | Rebuild the governorate map file |

Sources and licences: `data/SOURCES.md`. Decisions: `docs/DECISIONS.md`.
