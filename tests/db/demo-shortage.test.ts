// Session 3, section 2: demo:shortage reaches "confirmée" with at least 12 pharmacies in at
// least 4 governorates; demo:clear then leaves every table exactly as before. On the real
// migrations, with the real signal service.

import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_IDS, DEMO_SHORTAGE_MOLECULE, runDemoClear, runDemoShortage, type DemoStore } from '@/lib/demo/shortage';
import { asCommitted, createTestDatabase } from './harness';
import { pgliteSignalStore } from './pglite-store';

const service = { kind: 'service' as const };
const MOL = '00000000-0000-4000-8000-000000000400';
const SEED = ['02', '03', '04', '05', '07', '08', '09', '10', '11', '12', '01', '06'];
const SEED_GOV: Record<string, string> = {
  '01': 'TN-11', '02': 'TN-11', '03': 'TN-11', '04': 'TN-12', '05': 'TN-12', '06': 'TN-61',
  '07': 'TN-61', '08': 'TN-61', '09': 'TN-51', '10': 'TN-51', '11': 'TN-41', '12': 'TN-41',
};

let db: PGlite;

function pgliteDemoStore(): DemoStore {
  const q = <T>(sql: string, params: unknown[] = []) =>
    asCommitted(db, service, async (tx) => (await tx.query<T>(sql, params)).rows);
  return {
    async moleculeIdByName(name) {
      return (await q<{ id: string }>('select id from public.molecules where name = $1', [name]))[0]?.id ?? null;
    },
    async governorateNames() {
      return new Map((await q<{ code: string; name_fr: string }>('select code, name_fr from public.governorates')).map((g) => [g.code, g.name_fr]));
    },
    async state(moleculeId) {
      const [{ n: otherReports }] = await q<{ n: number }>(
        'select count(*)::int as n from public.reports where molecule_id = $1 and not (id = any($2::uuid[]))',
        [moleculeId, DEMO_IDS.reports],
      );
      const [{ n: signals }] = await q<{ n: number }>('select count(*)::int as n from public.signals where molecule_id = $1', [moleculeId]);
      const [{ n: demoRows }] = await q<{ n: number }>(
        `select ((select count(*) from public.reports where id = any($1::uuid[]))
               + (select count(*) from public.organisations where id = any($2::uuid[]))
               + (select count(*) from public.availability_requests where id = any($3::uuid[])))::int as n`,
        [DEMO_IDS.reports, DEMO_IDS.organisations, DEMO_IDS.requests],
      );
      return { otherReports, hasSignal: signals > 0, demoRows };
    },
    async insert(plan) {
      await asCommitted(db, service, async (tx) => {
        for (const o of plan.organisations) {
          await tx.query('insert into public.organisations (id, type, display_name, governorate_code, origin) values ($1, $2, $3, $4, $5)', [
            o.id, o.type, o.display_name, o.governorate_code, o.origin,
          ]);
        }
        for (const r of plan.reports) {
          await tx.query(
            `insert into public.reports (id, organisation_id, governorate_code, molecule_id, kind, ordered_at, reported_at, channel, origin)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [r.id, r.organisation_id, r.governorate_code, r.molecule_id, r.kind, r.ordered_at, r.reported_at, r.channel, r.origin],
          );
        }
        for (const r of plan.requests) {
          await tx.query(
            `insert into public.availability_requests (id, molecule_id, governorate_code, created_at, expires_at, device_hash, origin)
             values ($1, $2, $3, $4, $5, $6, $7)`,
            [r.id, r.molecule_id, r.governorate_code, r.created_at, r.expires_at, r.device_hash, r.origin],
          );
        }
      });
    },
    async deleteIds(ids) {
      const del = async (sql: string, values: string[]) => (await q<{ id: string }>(`${sql} returning 1 as id`, [values])).length;
      return {
        answers: await del('delete from public.availability_answers where request_id = any($1::uuid[])', ids.requests),
        requests: await del('delete from public.availability_requests where id = any($1::uuid[])', ids.requests),
        reports: await del('delete from public.reports where id = any($1::uuid[])', ids.reports),
        organisations: await del('delete from public.organisations where id = any($1::uuid[])', ids.organisations),
      };
    },
    async resetSignal(moleculeId) {
      return (await q<{ alerts: number; events: number; signals: number }>('select * from public.reset_molecule_signal($1)', [moleculeId]))[0];
    },
    signalStore: pgliteSignalStore(db),
  };
}

/** Every row of every public table, in a stable order: what "exactly as before" means. */
async function snapshot(): Promise<Record<string, string[]>> {
  const tables = (
    await q<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`,
    )
  ).map((t) => t.table_name);
  const out: Record<string, string[]> = {};
  for (const t of tables) {
    const rows = await q<Record<string, unknown>>(`select * from public.${t}`);
    out[t] = rows.map((r) => JSON.stringify(r)).sort();
  }
  return out;
}
const q = <T>(sql: string, params: unknown[] = []) => asCommitted(db, service, async (tx) => (await tx.query<T>(sql, params)).rows);

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
    before = await snapshot();
    const result = await runDemoShortage(pgliteDemoStore());
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
    expect((await runDemoShortage(pgliteDemoStore())).status).toBe('already');
  });

  it('demo:clear leaves every table exactly as before', async () => {
    const result = await runDemoClear(pgliteDemoStore());
    expect(result.deleted.reports).toBe(DEMO_IDS.reports.length);
    expect(result.deleted.organisations).toBe(DEMO_IDS.organisations.length);
    expect(result.deleted.requests).toBe(DEMO_IDS.requests.length);
    expect(result.recomputed?.skipped).toBe(true);
    expect(await snapshot()).toEqual(before);
  });

  it('refuses to mix with real reports on the molecule', async () => {
    await db.query(
      `insert into public.reports (organisation_id, governorate_code, molecule_id, kind, ordered_at, reported_at, origin)
       values ('00000000-0000-4000-8000-000000000a01', 'TN-11', $1, 'not_delivered', now() - interval '6 days', now() - interval '1 day', 'tester')`,
      [MOL],
    );
    const result = await runDemoShortage(pgliteDemoStore());
    expect(result.status).toBe('refused');
  });
});
