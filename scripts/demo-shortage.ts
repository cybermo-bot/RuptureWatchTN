// npm run demo:shortage
// Creates the simulated demo shortage (lib/demo/shortage.ts): reports from 23 simulated
// pharmacies in 13 governorates over 11 days, a few patient requests, and the level history.
// Every row is origin = simulated. Undo with `npm run demo:clear`.

import { DEMO_SHORTAGE_MOLECULE, runDemoShortage } from '../lib/demo/shortage';
import { supabaseDemoStore } from './lib/demo-store';
import { serviceClient } from './lib/script-env';

async function main() {
  const result = await runDemoShortage(supabaseDemoStore(serviceClient({ demoOnly: true })));
  if (result.status === 'refused') {
    console.error(`Not created: ${result.reason}.`);
    process.exit(1);
  }
  if (result.status === 'already') {
    console.log(`The demo shortage of ${DEMO_SHORTAGE_MOLECULE} is already in place. Run npm run demo:clear first to start again.`);
    return;
  }
  const e = result.final.evaluation;
  console.log(`Demo shortage of ${DEMO_SHORTAGE_MOLECULE} (${result.moleculeId})`);
  console.log(
    `  created: ${result.plan.organisations.length} simulated pharmacies, ${result.plan.reports.length} reports, ${result.plan.requests.length} patient requests`,
  );
  for (const c of result.changes) {
    console.log(`  ${c.evaluation.since.toISOString().slice(0, 16)}  ${c.previous} -> ${c.evaluation.level} (${c.evaluation.rule})`);
  }
  console.log(`  now: ${e.level} (${e.rule}), ${e.evidence.pharmacies14d} pharmacies in ${e.evidence.governorates14d} governorates over 14 days`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
