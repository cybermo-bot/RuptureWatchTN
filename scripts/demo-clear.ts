// npm run demo:clear
// Removes exactly what `npm run demo:shortage` created (by fixed ids), resets the molecule's
// signal and recomputes it from any other report. Touches nothing else.

import { DEMO_SHORTAGE_MOLECULE, runDemoClear } from '../lib/demo/shortage';
import { supabaseDemoStore } from './lib/demo-store';
import { serviceClient } from './lib/script-env';

async function main() {
  const { deleted, reset, recomputed } = await runDemoClear(supabaseDemoStore(serviceClient()));
  console.log(`Demo shortage of ${DEMO_SHORTAGE_MOLECULE} cleared.`);
  console.log(
    `  removed: ${deleted.reports} reports, ${deleted.requests} patient requests (${deleted.answers} answers), ${deleted.organisations} simulated pharmacies`,
  );
  if (reset) console.log(`  signal reset: ${reset.signals} signal, ${reset.events} events, ${reset.alerts} alerts`);
  if (recomputed) console.log(`  level now: ${recomputed.evaluation.level}${recomputed.skipped ? ' (no evidence, nothing stored)' : ''}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
