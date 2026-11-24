# End-to-end tests

Run against a deployed site, not in CI:

```
npx playwright install chromium     # once
E2E_BASE_URL=https://<preview>.vercel.app npm run test:e2e
```

In PowerShell: `$env:E2E_BASE_URL="https://<preview>.vercel.app"; npm run test:e2e`.

Set `E2E_WRITE_PRESENTATIONS=1` only with a database approved for test writes. The two-strength test opens separate anonymous browser contexts to respect the per-device, per-molecule limit.

## What the tests leave behind

All of it comes from demo accounts, whose organisations are marked `simulated`:

| Test | Rows created |
| --- | --- |
| 1. Pharmacy report | One `reports` row (`not_delivered`) from "Pharmacie démo A, Tunis" for its first followed medicine other than the showcase LEVETIRACETAM; possibly a `signals` row, a `signal_events` row and `alerts` rows if the level changes. |
| 2. Coordination | Nothing. |
| 3. Scenario | Nothing: the scenario runs in the browser. |
| 4. Patient request | One `availability_requests` row (LEVETIRACETAM, Tunis) and one answer from "Pharmacie démo A, Tunis", name shown. A browser can ask once a day per medicine: each run uses a fresh context. |
| Two strengths (opt-in) | Two `availability_requests` rows for ANTIOMAL, Tunis, one per strength, and two answers from the Tunis demo pharmacy, one with its name shown. |
| 5. Arrival | One `arrival_announcements` row on LEVETIRACETAM from "Centrale d'achat démo, Tunis", 10 days ahead. The level does not change. |
| 6. Ordre message | One `order_messages` row to Sfax from "Conseil régional démo, Sfax". |
| 7. Note de situation | Nothing. |

Note the time before a run. The team lead removes the rows with `npm run verify:clean -- --since <time> --apply` (reports, follows, arrival announcements, Ordre messages and the one-click pharmacies' answers; add `--requests` to remove the test's patient request too, before real patients use the site).
