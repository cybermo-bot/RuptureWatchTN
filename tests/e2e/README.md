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

Note the time before a run. The team lead removes the rows with `npm run verify:clean -- --since <time> --apply`.
