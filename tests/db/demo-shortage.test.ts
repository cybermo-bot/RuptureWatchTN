// Session 3, section 2: demo:shortage reaches "confirmée" with at least 12 pharmacies in at
// least 4 governorates; demo:clear then leaves every table exactly as before. On the real
// migrations, with the real signal service.

import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_IDS, DEMO_SHORTAGE_MOLECULE, runDemoClear, runDemoShortage } from '@/lib/demo/shortage';
import { createTestDatabase } from './harness';
import { pgliteDemoStore as demoStore, snapshot as snapshotOf } from './demo-stores';

const MOL = '00000000-0000-4000-8000-000000000400';
const SEED = ['02', '03', '04', '05', '07', '08', '09', '10', '11', '12', '01', '06'];
const SEED_GOV: Record<string, string> = {
  '01': 'TN-11', '02': 'TN-11', '03': 'TN-11', '04': 'TN-12', '05': 'TN-12', '06': 'TN-61',
  '07': 'TN-61', '08': 'TN-61', '09': 'TN-51', '10': 'TN-51', '11': 'TN-41', '12': 'TN-41',
};

let db: PGlite;


beforeAll(async () => {
  db = await createTestDatabase({ defaultGrants: false });
  await db.query(`insert into public.molecules (id, name) values ($1, $2), ('00000000-0000-4000-8000-000000000401', 'AUTRE')`, [
    MOL,
    DEMO_SHORTAGE_MOLECULE,
  ]);
  for (const n of SEED) {
    await db.query(
      `insert into public.organisations (id, type, display_name, governorate_code, origin) values ($1, 'pharmacy', $2, $3, 'simulated')`,
      [`00000000-0000-4000-8000-000000000a${n}`, `Pharmacie démo ${n}`, SEED_GOV[n]],
    );
  }
  for (const [id, type] of [
    ['00000000-0000-4000-8000-000000000b01', 'wholesaler'],
    ['00000000-0000-4000-8000-000000000c01', 'hospital_pharmacy'],
    ['00000000-0000-4000-8000-000000000d01', 'coordinator'],
  ]) {
    await db.query(`insert into public.organisations (id, type, display_name, governorate_code, origin) values ($1, $2, $3, 'TN-11', 'simulated')`, [
      id, type, `Organisation ${type}`,
    ]);
  }
  // Unrelated data that must survive untouched: a follow and a report on another molecule.
  await db.query(`insert into public.followed_molecules (organisation_id, molecule_id) values ('00000000-0000-4000-8000-000000000a01', $1)`, [MOL]);
  await db.query(
    `insert into public.reports (organisation_id, governorate_code, molecule_id, kind, ordered_at, reported_at, origin)
     values ('00000000-0000-4000-8000-000000000a01', 'TN-11', '00000000-0000-4000-8000-000000000401', 'not_delivered', now() - interval '6 days', now() - interval '1 day', 'tester')`,
  );
});

afterAll(async () => {
  await db?.close();
});

describe('demo:shortage then demo:clear', () => {
  let before: Record<string, string[]>;

  it('reaches "confirmée" with at least 12 pharmacies in at least 4 governorates, climbing day by day', async () => {
    before = await snapshotOf(db);
    const result = await runDemoShortage(demoStore(db));
    expect(result.status).toBe('created');
    if (result.status !== 'created') return;
    const e = result.final.evaluation;
    expect(e.level).toBe('confirmed');
    expect(e.evidence.pharmacies14d).toBeGreaterThanOrEqual(12);
    expect(e.evidence.governorates14d).toBeGreaterThanOrEqual(4);
    expect(result.changes.map((c) => c.evaluation.level)).toEqual(['watch', 'likely', 'confirmed']);
    // Sfax, Tunis and Sousse pass the "<3" line, so the coordination map shows counts there.
    const perGovernorate = new Map<string, Set<string>>();
    for (const r of result.plan.reports) {
      perGovernorate.set(r.governorate_code, (perGovernorate.get(r.governorate_code) ?? new Set()).add(r.organisation_id));
    }
    expect([...perGovernorate.values()].filter((p) => p.size >= 3).length).toBeGreaterThanOrEqual(3);
    for (const r of result.plan.reports) expect(r.origin).toBe('simulated');
    for (const o of result.plan.organisations) {
      expect(o.origin).toBe('simulated');
      expect(o.display_name).toMatch(/^Pharmacie démo \d{2}, /);
    }
    // The one-click demo pharmacies (Tunis A, Sfax F) stay free for a live report.
    expect(result.plan.reports.map((r) => r.organisation_id)).not.toContain('00000000-0000-4000-8000-000000000a01');
    expect(result.plan.reports.map((r) => r.organisation_id)).not.toContain('00000000-0000-4000-8000-000000000a06');
  });

  it('does nothing when run twice', async () => {
    expect((await runDemoShortage(demoStore(db))).status).toBe('already');
  });

  it('demo:clear leaves every table exactly as before', async () => {
    const result = await runDemoClear(demoStore(db));
    expect(result.deleted.reports).toBe(DEMO_IDS.reports.length);
    expect(result.deleted.organisations).toBe(DEMO_IDS.organisations.length);
    expect(result.deleted.requests).toBe(DEMO_IDS.requests.length);
    expect(result.recomputed?.skipped).toBe(true);
    expect(await snapshotOf(db)).toEqual(before);
  });

  it('refuses to mix with real reports on the molecule', async () => {
    await db.query(
      `insert into public.reports (organisation_id, governorate_code, molecule_id, kind, ordered_at, reported_at, origin)
       values ('00000000-0000-4000-8000-000000000a01', 'TN-11', $1, 'not_delivered', now() - interval '6 days', now() - interval '1 day', 'tester')`,
      [MOL],
    );
    const result = await runDemoShortage(demoStore(db));
    expect(result.status).toBe('refused');
  });
});
