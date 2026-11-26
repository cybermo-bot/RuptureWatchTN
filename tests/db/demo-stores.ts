// PGlite versions of the demo stores and a snapshot of every public table, shared by the
// demo:shortage and demo:national tests.

import type { PGlite } from '@electric-sql/pglite';
import { NATIONAL_IDS, type NationalStore } from '@/lib/demo/national';
import { DEMO_IDS, type DemoStore } from '@/lib/demo/shortage';
import { asCommitted } from './harness';
import { pgliteSignalStore } from './pglite-store';

const service = { kind: 'service' as const };

const query = (db: PGlite) => <T>(sql: string, params: unknown[] = []) =>
  asCommitted(db, service, async (tx) => (await tx.query<T>(sql, params)).rows);

export function pgliteDemoStore(db: PGlite): DemoStore {
  const q = query(db);
  return {
    async moleculeIdByName(name) {
      return (await q<{ id: string }>('select id from public.molecules where name = $1', [name]))[0]?.id ?? null;
    },
    async medicineIdsByCode(moleculeId, codes) {
      const rows = await q<{ id: string; code_pct: string }>('select id, code_pct from public.medicines where molecule_id = $1 and code_pct = any($2::text[])', [moleculeId, [...codes]]);
      const byCode = new Map(rows.map((m) => [m.code_pct, m.id]));
      return codes.flatMap((code) => (byCode.has(code) ? [byCode.get(code)!] : []));
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
            `insert into public.reports (id, organisation_id, governorate_code, molecule_id, medicine_id, kind, ordered_at, reported_at, channel, origin)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [r.id, r.organisation_id, r.governorate_code, r.molecule_id, r.medicine_id, r.kind, r.ordered_at, r.reported_at, r.channel, r.origin],
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
export async function snapshot(db: PGlite): Promise<Record<string, string[]>> {
  const q = query(db);
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

export function pgliteNationalStore(db: PGlite): NationalStore {
  const q = query(db);
  const n = async (sql: string, params: unknown[]) => (await q<{ n: number }>(sql, params))[0].n;
  return {
    async moleculeIdByName(name) {
      return (await q<{ id: string }>('select id from public.molecules where name = $1', [name]))[0]?.id ?? null;
    },
    async medicineIdsByCode(moleculeId, codes) {
      const rows = await q<{ id: string; code_pct: string }>('select id, code_pct from public.medicines where molecule_id = $1 and code_pct = any($2::text[])', [moleculeId, [...codes]]);
      const byCode = new Map(rows.map((m) => [m.code_pct, m.id]));
      return codes.flatMap((code) => (byCode.has(code) ? [byCode.get(code)!] : []));
    },
    async governorateNames() {
      return new Map((await q<{ code: string; name_fr: string }>('select code, name_fr from public.governorates')).map((g) => [g.code, g.name_fr]));
    },
    async otherUses(moleculeId) {
      return n(
        `select ((select count(*) from public.reports where molecule_id = $1 and not (id = any($2::uuid[])))
               + (select count(*) from public.followed_molecules where molecule_id = $1)
               + (select count(*) from public.foreign_notices where molecule_id = $1 and not (id = any($3::uuid[])))
               + (select count(*) from public.availability_requests where molecule_id = $1 and not (id = any($4::uuid[])))
               + (select count(*) from public.allocation_decisions where molecule_id = $1 and not (id = any($5::uuid[])))
               + (select count(*) from public.signals where molecule_id = $1))::int as n`,
        [moleculeId, NATIONAL_IDS.reports, NATIONAL_IDS.notices, NATIONAL_IDS.requests, NATIONAL_IDS.decisions],
      );
    },
    async demoRows() {
      return n(
        `select ((select count(*) from public.organisations where id = any($1::uuid[]))
               + (select count(*) from public.reports where id = any($2::uuid[]))
               + (select count(*) from public.availability_requests where id = any($3::uuid[]))
               + (select count(*) from public.foreign_notices where id = any($4::uuid[]))
               + (select count(*) from public.allocation_decisions where id = any($5::uuid[])))::int as n`,
        [NATIONAL_IDS.organisations, NATIONAL_IDS.reports, NATIONAL_IDS.requests, NATIONAL_IDS.notices, NATIONAL_IDS.decisions],
      );
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
            `insert into public.reports (id, organisation_id, governorate_code, molecule_id, medicine_id, kind, ordered_at, reported_at, channel, origin)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [r.id, r.organisation_id, r.governorate_code, r.molecule_id, r.medicine_id, r.kind, r.ordered_at, r.reported_at, r.channel, r.origin],
          );
        }
        for (const x of plan.notices) {
          await tx.query(
            'insert into public.foreign_notices (id, molecule_id, source, status, published_at, url, origin) values ($1, $2, $3, $4, $5, $6, $7)',
            [x.id, x.molecule_id, x.source, x.status, x.published_at, x.url, x.origin],
          );
        }
        for (const r of plan.requests) {
          await tx.query(
            `insert into public.availability_requests (id, molecule_id, governorate_code, created_at, expires_at, device_hash, origin)
             values ($1, $2, $3, $4, $5, $6, $7)`,
            [r.id, r.molecule_id, r.governorate_code, r.created_at, r.expires_at, r.device_hash, r.origin],
          );
        }
        for (const a of plan.answers) {
          await tx.query(
            `insert into public.availability_answers (request_id, organisation_id, answer, show_identity, answered_at, origin)
             values ($1, $2, $3, $4, $5, $6)`,
            [a.request_id, a.organisation_id, a.answer, a.show_identity, a.answered_at, a.origin],
          );
        }
        for (const d of plan.decisions) {
          await tx.query(
            `insert into public.allocation_decisions (id, molecule_id, organisation_id, stock, recommended, applied, deviation_reason, decided_at, origin)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [d.id, d.molecule_id, d.organisation_id, d.stock, JSON.stringify(d.recommended), d.applied, d.deviation_reason, d.decided_at, d.origin],
          );
        }
      });
    },
    async deleteIds(ids) {
      const del = async (sql: string, values: string[]) => (await q<{ id: number }>(`${sql} returning 1 as id`, [values])).length;
      return {
        decisions: await del('delete from public.allocation_decisions where id = any($1::uuid[])', ids.decisions),
        answers: await del('delete from public.availability_answers where request_id = any($1::uuid[])', ids.requests),
        requests: await del('delete from public.availability_requests where id = any($1::uuid[])', ids.requests),
        notices: await del('delete from public.foreign_notices where id = any($1::uuid[])', ids.notices),
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
