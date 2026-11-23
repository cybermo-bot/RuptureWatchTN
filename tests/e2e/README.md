# End-to-end tests

Run against a deployed site, not in CI:

```
npx playwright install chromium     # once
E2E_BASE_URL=https://<preview>.vercel.app npm run test:e2e
```

In PowerShell: `$env:E2E_BASE_URL="https://<preview>.vercel.app"; npm run test:e2e`.

## What the tests leave behind

All of it comes from demo accounts, whose organisations are marked `simulated`:

| Test | Rows created |
| --- | --- |
| 1. Pharmacy report | One `reports` row (`not_delivered`) from "Pharmacie démo A, Tunis" for its first followed medicine; possibly a `signals` row, a `signal_events` row and `alerts` rows if the level changes. |
| 2. Coordination | Nothing. |
| 3. Scenario | Nothing: the scenario runs in the browser. |
| 4. Patient request | One `availability_requests` row (AMLODIPINE, Tunis) and one answer from "Pharmacie démo A, Tunis", name shown. A browser can ask once a day per medicine: each run uses a fresh context. |
| 5. Arrival | One `arrival_announcements` row on AMLODIPINE from "Centrale d'achat démo, Tunis", 10 days ahead. The level does not change. |
| 6. Ordre message | One `order_messages` row to Sfax from "Conseil régional démo, Sfax". |
| 7. Note de situation | Nothing. |

Note the time before a run. The team lead removes the rows with `npm run verify:clean -- --since <time> --apply` (reports, follows, arrival announcements and Ordre messages; a patient request is anonymous demand and expires on its own).
