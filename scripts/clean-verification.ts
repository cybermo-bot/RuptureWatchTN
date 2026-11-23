// Removes the data a verification run created on the live project, so real testers start clean.
//
//   npm run verify:clean -- --since 2026-11-22T01:00:00Z            (dry run: lists what would go)
//   npm run verify:clean -- --since 2026-11-22T01:00:00Z --apply
//   npm run verify:clean -- --since 2026-11-22T01:00:00Z --requests --apply
//
// Removes, for rows created at or after --since:
//   - tester pharmacies (origin tester), their profiles, follows and auth users;
//   - reports by the demo pharmacies and by those testers;
//   - follows added by the demo pharmacies, except those in supabase/seed/demo-follows.json;
//   - arrival announcements by the demo centrale and messages by the demo Ordre (a level never
//     depends on them, so nothing needs recomputing);
//   - availability answers given by the one-click demo pharmacies (demo:national's answers come
//     from other simulated pharmacies and stay);
//   - with --requests only: patients' requests of origin tester (an end-to-end run's request from
//     a browser), with their answers. Requests are anonymous demand and never change a level, so
//     they stay unless asked: never use --requests once real patients use the site.
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
  const withRequests = process.argv.includes('--requests');
  if (!since || Number.isNaN(Date.parse(since))) {
    console.error('Usage: npm run verify:clean -- --since <ISO date> [--apply]');
    process.exit(1);
  }
  const supabase = serviceClient();
  const demoPharmacies = DEMO_ROLES.filter((r) => r.home === '/pharmacie').map((r) => r.organisationId);
  const demoCentral = DEMO_ROLES.filter((r) => r.home === '/centrale').map((r) => r.organisationId);
  const demoOrder = DEMO_ROLES.filter((r) => r.home === '/ordre').map((r) => r.organisationId);

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
  const { data: arrivals, error: arrivalError } = await supabase
    .from('arrival_announcements')
    .select('id, expected_on, molecules ( name )')
    .in('organisation_id', demoCentral)
    .gte('announced_at', since);
  if (arrivalError) throw new Error(`arrival announcements: ${arrivalError.message}`);
  const { data: messages, error: messageError } = await supabase
    .from('order_messages')
    .select('id, body')
    .in('organisation_id', demoOrder)
    .gte('sent_at', since);
  if (messageError) throw new Error(`order messages: ${messageError.message}`);
  for (const a of arrivals ?? []) {
    console.log(`  arrival announcement: ${(a.molecules as unknown as { name: string } | null)?.name ?? '?'}, ${a.expected_on}`);
  }
  for (const m of messages ?? []) console.log(`  Ordre message: ${String(m.body).slice(0, 60)}`);
  const { data: answers, error: answerError } = await supabase
    .from('availability_answers')
    .select('id, request_id, answer')
    .in('organisation_id', demoPharmacies)
    .gte('answered_at', since);
  if (answerError) throw new Error(`availability answers: ${answerError.message}`);
  console.log(`  answers by the one-click pharmacies: ${answers?.length ?? 0}`);
  const { data: requests, error: requestError } = withRequests
    ? await supabase
        .from('availability_requests')
        .select('id, governorate_code, created_at, molecules ( name )')
        .eq('origin', 'tester')
        .gte('created_at', since)
    : { data: [] as { id: string; governorate_code: string; created_at: string; molecules: unknown }[], error: null };
  if (requestError) throw new Error(`availability requests: ${requestError.message}`);
  for (const r of requests ?? []) {
    console.log(
      `  patient request (tester): ${(r.molecules as { name: string } | null)?.name ?? '?'}, ${r.governorate_code}, ${r.created_at}`,
    );
  }
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
  if (arrivals?.length) {
    const { error } = await supabase.from('arrival_announcements').delete().in('id', arrivals.map((a) => a.id as string));
    if (error) throw new Error(`delete arrival announcements: ${error.message}`);
  }
  if (messages?.length) {
    const { error } = await supabase.from('order_messages').delete().in('id', messages.map((m) => m.id as string));
    if (error) throw new Error(`delete Ordre messages: ${error.message}`);
  }
  if (answers?.length) {
    const { error } = await supabase.from('availability_answers').delete().in('id', answers.map((a) => a.id as string));
    if (error) throw new Error(`delete availability answers: ${error.message}`);
  }
  if (requests?.length) {
    const { error } = await supabase.from('availability_requests').delete().in('id', requests.map((r) => r.id));
    if (error) throw new Error(`delete availability requests: ${error.message}`);
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
