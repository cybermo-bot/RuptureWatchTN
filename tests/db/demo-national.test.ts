// Session 5, part 2: demo:national builds one medicine at each situation the jury should see,
// each by the rule that explains it, and demo:clear then leaves every table exactly as before.
// On the real migrations, with the real signal service.

import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_WHOLESALER_ID, NATIONAL_IDS, NATIONAL_MOLECULES, runDemoNational, runNationalClear } from '@/lib/demo/national';
import { DEMO_SHORTAGE_MOLECULE, runDemoClear, runDemoShortage } from '@/lib/demo/shortage';
import { createTestDatabase } from './harness';
import { pgliteDemoStore, pgliteNationalStore, snapshot } from './demo-stores';

const SEED_GOV: Record<string, string> = {
  '01': 'TN-11', '02': 'TN-11', '03': 'TN-11', '04': 'TN-12', '05': 'TN-12', '06': 'TN-61',
  '07': 'TN-61', '08': 'TN-61', '09': 'TN-51', '10': 'TN-51', '11': 'TN-41', '12': 'TN-41',
};
const ONE_CLICK = ['00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000a06'];

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase({ defaultGrants: false });
  const names = [DEMO_SHORTAGE_MOLECULE, ...Object.values(NATIONAL_MOLECULES), 'AUTRE'];
  for (const [i, name] of names.entries()) {
    await db.query('insert into public.molecules (id, name) values ($1, $2)', [`00000000-0000-4000-8000-00000000050${i}`, name]);
  }
  for (const [n, code] of Object.entries(SEED_GOV)) {
    await db.query(
      `insert into public.organisations (id, type, display_name, governorate_code, origin) values ($1, 'pharmacy', $2, $3, 'simulated')`,
      [`00000000-0000-4000-8000-000000000a${n}`, `Pharmacie démo ${n}`, code],
    );
  }
  for (const [id, type] of [
    [DEMO_WHOLESALER_ID, 'wholesaler'],
    ['00000000-0000-4000-8000-000000000c01', 'hospital_pharmacy'],
    ['00000000-0000-4000-8000-000000000d01', 'coordinator'],
  ]) {
    await db.query(`insert into public.organisations (id, type, display_name, governorate_code, origin) values ($1, $2, $3, 'TN-11', 'simulated')`, [
      id, type, `Organisation ${type}`,
    ]);
  }
  // Unrelated data that must survive untouched: a follow and a tester report on another molecule.
  await db.query(`insert into public.followed_molecules (organisation_id, molecule_id) values ($1, '00000000-0000-4000-8000-000000000505')`, [ONE_CLICK[0]]);
  await db.query(
    `insert into public.reports (organisation_id, governorate_code, molecule_id, kind, ordered_at, reported_at, origin)
     values ($1, 'TN-11', '00000000-0000-4000-8000-000000000505', 'not_delivered', now() - interval '6 days', now() - interval '1 day', 'tester')`,
    [ONE_CLICK[0]],
  );
});

afterAll(async () => {
  await db?.close();
});

describe('demo:national then demo:clear', () => {
  let before: Record<string, string[]>;

  it('shows each situation by the rule that explains it', async () => {
    before = await snapshot(db);
    expect((await runDemoShortage(pgliteDemoStore(db))).status).toBe('created');
    const result = await runDemoNational(pgliteNationalStore(db));
    expect(result.status).toBe('created');
    if (result.status !== 'created') return;
    const final = Object.fromEntries(Object.entries(result.final).map(([k, r]) => [k, [r.evaluation.level, r.evaluation.rule]]));
    expect(final).toEqual({
      probable: ['likely', 'single_governorate_cap'],
      watchLocal: ['watch', 'local_reports_below_threshold'],
      watchForeign: ['watch', 'foreign_notice_only'],
      cleared: ['cleared', 'delivered_again_cleared'],
    });
    // Gate two: five pharmacies, enough for "confirmée", but all in one governorate.
    expect(result.final.probable.evaluation.evidence.pharmacies14d).toBe(5);
    expect(result.final.probable.evaluation.evidence.governorates14d).toBe(1);
    // The levée went through every level on its way, over the last 30 days.
    const cleared = result.changes.filter((c) => c.moleculeId === result.molecules.cleared);
    expect(cleared.map((c) => c.evaluation.level)).toEqual(['watch', 'likely', 'confirmed', 'cleared']);
    const firstDay = Math.min(...result.changes.map((c) => c.evaluation.since.getTime()));
    expect(Date.now() - firstDay).toBeGreaterThan(25 * 86_400_000);
    expect(Date.now() - firstDay).toBeLessThan(30 * 86_400_000);
  });

  it('is all simulated, keeps the one-click pharmacies free, and records one decision of each kind', async () => {
    const [{ n }] = (
      await db.query<{ n: number }>(
        `select count(*)::int as n from (
           select origin from public.reports union all select origin from public.foreign_notices
           union all select origin from public.availability_requests union all select origin from public.allocation_decisions
           union all select origin from public.availability_answers
           union all select origin from public.organisations where id = any($1::uuid[])) x
         where origin <> 'simulated'`,
        [NATIONAL_IDS.organisations],
      )
    ).rows;
    expect(n).toBe(1); // the unrelated tester report only
    const reporters = (await db.query<{ organisation_id: string }>('select organisation_id from public.reports where id = any($1::uuid[])', [NATIONAL_IDS.reports])).rows;
    for (const r of reporters) expect(ONE_CLICK).not.toContain(r.organisation_id);
    const decisions = (await db.query<{ applied: boolean; deviation_reason: string | null }>('select applied, deviation_reason from public.allocation_decisions order by applied')).rows;
    expect(decisions.map((d) => d.applied)).toEqual([false, true]);
    expect(decisions[0].deviation_reason?.length).toBeGreaterThanOrEqual(15);
    // Answers come from pharmacies of the request's own governorate, never a one-click pharmacy.
    const answers = (
      await db.query<{ organisation_id: string; same: boolean; shown: boolean }>(
        `select a.organisation_id, o.governorate_code = r.governorate_code as same, a.show_identity as shown
         from public.availability_answers a
         join public.availability_requests r on r.id = a.request_id
         join public.organisations o on o.id = a.organisation_id
         where a.request_id = any($1::uuid[])`,
        [NATIONAL_IDS.requests],
      )
    ).rows;
    expect(answers).toHaveLength(4);
    for (const a of answers) {
      expect(a.same).toBe(true);
      expect(ONE_CLICK).not.toContain(a.organisation_id);
    }
    expect(answers.filter((a) => a.shown)).toHaveLength(1);
    const notice = (await db.query<{ source: string }>('select source from public.foreign_notices')).rows;
    expect(notice).toEqual([{ source: 'Régulateur fictif (démonstration)' }]);
  });

  it('does nothing when run twice', async () => {
    expect((await runDemoNational(pgliteNationalStore(db))).status).toBe('already');
  });

  it('demo:clear leaves every table exactly as before', async () => {
    const national = await runNationalClear(pgliteNationalStore(db));
    expect(national.deleted).toMatchObject({
      reports: NATIONAL_IDS.reports.length,
      organisations: NATIONAL_IDS.organisations.length,
      requests: NATIONAL_IDS.requests.length,
      answers: 4,
      notices: 1,
      decisions: 2,
    });
    await runDemoClear(pgliteDemoStore(db));
    expect(await snapshot(db)).toEqual(before);
  });

  it('refuses to mix with data of a molecule of its own', async () => {
    await db.query(`insert into public.followed_molecules (organisation_id, molecule_id) values ($1, '00000000-0000-4000-8000-000000000502')`, [ONE_CLICK[0]]);
    const result = await runDemoNational(pgliteNationalStore(db));
    expect(result.status).toBe('refused');
    expect(await pgliteNationalStore(db).demoRows()).toBe(0);
  });
});
