// Removes the data a verification run created on the live project, so real testers start clean.
//
//   npm run verify:clean -- --since 2026-11-22T01:00:00Z            (dry run: lists what would go)
//   npm run verify:clean -- --since 2026-11-22T01:00:00Z --apply
//
// Removes, for rows created at or after --since:
//   - tester pharmacies (origin tester), their profiles, follows and auth users;
//   - reports by the demo pharmacies and by those testers;
//   - follows added by the demo pharmacies, except those in supabase/seed/demo-follows.json;
//   - the signal state (alerts, event log, signal row) of every molecule those reports touched,
//     through reset_molecule_signal(), the only sanctioned way to clear the event log.
// Then restarts tester numbering at 1 (reset_tester_numbering), which does nothing while any
// tester pharmacy remains.
// Never run it after real testers have joined: it would remove their pharmacies too.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEMO_ROLES } from '../lib/demo/roles';
import { ROOT, serviceClient } from './lib/script-env';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const since = arg('since');
  const apply = process.argv.includes('--apply');
  if (!since || Number.isNaN(Date.parse(since))) {
    console.error('Usage: npm run verify:clean -- --since <ISO date> [--apply]');
    process.exit(1);
  }
  const supabase = serviceClient();
  const demoPharmacies = DEMO_ROLES.filter((r) => r.home === '/pharmacie').map((r) => r.organisationId);

  const { data: testers, error: testerError } = await supabase
    .from('organisations')
    .select('id, display_name')
    .eq('origin', 'tester')
    .gte('created_at', since);
  if (testerError) throw new Error(testerError.message);
  const testerIds = (testers ?? []).map((o) => o.id as string);

  const { data: reports, error: reportError } = await supabase
    .from('reports')
    .select('id, molecule_id')
    .in('organisation_id', [...demoPharmacies, ...testerIds])
    .gte('reported_at', since);
  if (reportError) throw new Error(reportError.message);
  const molecules = [...new Set((reports ?? []).map((r) => r.molecule_id as string))];

  const { data: profiles } = testerIds.length
    ? await supabase.from('profiles').select('user_id').in('organisation_id', testerIds)
    : { data: [] as { user_id: string }[] };
  const testerUsers = (profiles ?? []).map((p) => p.user_id as string);

  console.log(`Since ${since}:`);
  console.log(`  tester pharmacies: ${testers?.map((o) => o.display_name).join('; ') || 'none'}`);
  console.log(`  reports: ${reports?.length ?? 0}`);
  console.log(`  molecules to reset: ${molecules.length}`);
  if (!apply) {
    console.log('Dry run. Add --apply to remove.');
    return;
  }

  for (const id of molecules) {
    const { data, error } = await supabase.rpc('reset_molecule_signal', { p_molecule_id: id });
    if (error) throw new Error(`reset ${id}: ${error.message}`);
    console.log(`  reset ${id}: ${JSON.stringify(data?.[0])}`);
  }
  if (reports?.length) {
    const { error } = await supabase.from('reports').delete().in('id', reports.map((r) => r.id as string));
    if (error) throw new Error(`delete reports: ${error.message}`);
  }
  // Follows added during the run, but never the seeded ones (re-seeding may postdate --since).
  const seeded = (JSON.parse(readFileSync(join(ROOT, 'supabase/seed/demo-follows.json'), 'utf8')) as { molecules: string[] })
    .molecules;
  const { data: seededMolecules, error: seededError } = await supabase.from('molecules').select('id').in('name', seeded);
  if (seededError) throw new Error(`seeded follows: ${seededError.message}`);
  const keep = (seededMolecules ?? []).map((m) => m.id as string);
  let followDelete = supabase.from('followed_molecules').delete().in('organisation_id', demoPharmacies).gte('created_at', since);
  if (keep.length) followDelete = followDelete.not('molecule_id', 'in', `(${keep.join(',')})`);
  const { error: followError } = await followDelete;
  if (followError) throw new Error(`delete follows: ${followError.message}`);
  if (testerIds.length) {
    const { error: profileError } = await supabase.from('profiles').delete().in('organisation_id', testerIds);
    if (profileError) throw new Error(`delete profiles: ${profileError.message}`);
    const { error: orgError } = await supabase.from('organisations').delete().in('id', testerIds);
    if (orgError) throw new Error(`delete organisations: ${orgError.message}`);
  }
  for (const userId of testerUsers) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw new Error(`delete user: ${error.message}`);
  }
  const { data: numbering, error: numberingError } = await supabase.rpc('reset_tester_numbering');
  if (numberingError) throw new Error(`reset tester numbering: ${numberingError.message}`);
  const n = (numbering as { reset: boolean; remaining_testers: number }[] | null)?.[0];
  console.log(
    n?.reset
      ? '  tester numbering restarted at 1'
      : `  tester numbering kept: ${n?.remaining_testers ?? '?'} tester pharmacies remain`,
  );
  console.log('Removed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
