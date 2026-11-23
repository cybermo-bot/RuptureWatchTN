// npm run demo:national
// Builds the national demo picture (lib/demo/national.ts): the demo shortage (amlodipine,
// "confirmée") if it is not in place yet, then one "probable" held by gate two, two "sous
// surveillance" (local reports; a foreign notice alone), one "levée", patient requests and two
// wholesaler decisions, with their history over the last 30 days. Every row is
// origin = simulated. Undo with `npm run demo:clear`.

import { NATIONAL_MOLECULES, runDemoNational } from '../lib/demo/national';
import { DEMO_SHORTAGE_MOLECULE, runDemoShortage } from '../lib/demo/shortage';
import { supabaseDemoStore } from './lib/demo-store';
import { supabaseNationalStore } from './lib/national-store';
import { serviceClient } from './lib/script-env';

async function main() {
  const client = serviceClient();
  const shortage = await runDemoShortage(supabaseDemoStore(client));
  if (shortage.status === 'refused') {
    console.error(`Not created: ${shortage.reason}.`);
    process.exit(1);
  }
  console.log(
    shortage.status === 'already'
      ? `${DEMO_SHORTAGE_MOLECULE}: the demo shortage is already in place.`
      : `${DEMO_SHORTAGE_MOLECULE}: ${shortage.final.evaluation.level} (${shortage.final.evaluation.rule}), ${shortage.plan.reports.length} reports.`,
  );

  const result = await runDemoNational(supabaseNationalStore(client));
  if (result.status === 'refused') {
    console.error(`Not created: ${result.reason}.`);
    process.exit(1);
  }
  if (result.status === 'already') {
    console.log('The national picture is already in place. Run npm run demo:clear first to start again.');
    return;
  }
  const p = result.plan;
  console.log(
    `Created: ${p.organisations.length} simulated pharmacies, ${p.reports.length} reports, ${p.notices.length} foreign notice, ${p.requests.length} patient requests (${p.answers.length} answers from demo pharmacies), ${p.decisions.length} wholesaler decisions.`,
  );
  for (const [situation, name] of Object.entries(NATIONAL_MOLECULES) as [keyof typeof NATIONAL_MOLECULES, string][]) {
    const e = result.final[situation].evaluation;
    console.log(`  ${name.padEnd(15)} ${e.level} (${e.rule})`);
  }
  for (const c of result.changes) {
    console.log(`    ${c.evaluation.since.toISOString().slice(0, 16)}  ${c.moleculeId.slice(0, 8)}  ${c.previous} -> ${c.evaluation.level} (${c.evaluation.rule})`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
