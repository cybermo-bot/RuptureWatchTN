// npm run demo:clear
// Removes exactly what `npm run demo:national` and `npm run demo:shortage` created (by fixed
// ids), resets the demo molecules' signals and recomputes them from any other report.
// Touches nothing else.

import { runNationalClear } from '../lib/demo/national';
import { DEMO_SHORTAGE_MOLECULE, runDemoClear } from '../lib/demo/shortage';
import { supabaseDemoStore } from './lib/demo-store';
import { supabaseNationalStore } from './lib/national-store';
import { serviceClient } from './lib/script-env';

async function main() {
  const client = serviceClient();
  const national = await runNationalClear(supabaseNationalStore(client));
  const n = national.deleted;
  console.log('National picture cleared.');
  console.log(
    `  removed: ${n.reports} reports, ${n.notices} foreign notice, ${n.requests} patient requests (${n.answers} answers), ${n.decisions} wholesaler decisions, ${n.organisations} simulated pharmacies`,
  );
  console.log(`  signals reset: ${national.reset.signals} signals, ${national.reset.events} events, ${national.reset.alerts} alerts`);

  const { deleted, reset, recomputed } = await runDemoClear(supabaseDemoStore(client));
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
