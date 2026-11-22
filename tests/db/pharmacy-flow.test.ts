// Session 2 on the real migrations: the signal service end to end, report_impact, alerts,
// tester pharmacies, molecule search, and what a pharmacy can see.

import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '@/lib/signal';
import { recomputeAll, recomputeSignal } from '@/lib/signals/recompute';
import { as, asCommitted, createTestDatabase } from './harness';
import { pgliteSignalStore } from './pglite-store';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

const MOL = id(0x100);
const MOL_QUIET = id(0x101);
const ORG = {
  p1: id(0xa1), // Tunis, follows MOL
  p2: id(0xa2), // Tunis
  p3: id(0xa3), // Sfax
  p4: id(0xa4), // Sfax, follows MOL
  coordinator: id(0xd1),
  wholesaler: id(0xb1),
  hospital: id(0xc1),
};
const NAMES: Record<string, string> = {
  [ORG.p1]: 'Pharmacie flux 1, Tunis',
  [ORG.p2]: 'Pharmacie flux 2, Tunis',
  [ORG.p3]: 'Pharmacie flux 3, Sfax',
  [ORG.p4]: 'Pharmacie flux 4, Sfax',
  [ORG.coordinator]: 'Coordination flux',
  [ORG.wholesaler]: 'Grossiste flux',
  [ORG.hospital]: 'Hôpital flux',
};
const USER = { p1: id(0x1a1), p2: id(0x1a2), p3: id(0x1a3), p4: id(0x1a4), coordinator: id(0x1d1), tester: id(0x1e1), tester2: id(0x1e2) };
const user = (userId: string) => ({ kind: 'user' as const, userId });
const service = { kind: 'service' as const };

// A fixed clock in the recent past, so report_impact (default p_at = now()) sees the reports.
const T0 = new Date(Date.now() - 2 * DAY);
const at = (hours: number) => new Date(T0.getTime() + hours * HOUR);

let db: PGlite;

async function report(
  org: string,
  gov: string,
  when: Date,
  kind: 'not_delivered' | 'delivered_again' = 'not_delivered',
  molecule = MOL,
) {
  await asCommitted(db, service, (tx) =>
    tx.query(
      `insert into public.reports (organisation_id, governorate_code, molecule_id, kind, ordered_at, reported_at, origin)
       values ($1, $2, $3, $4, $5, $6, 'simulated')`,
      [org, gov, molecule, kind, kind === 'not_delivered' ? new Date(when.getTime() - 3 * DAY) : null, when],
    ),
  );
}

beforeAll(async () => {
  db = await createTestDatabase({ defaultGrants: false });
  await db.query(`insert into public.molecules (id, name) values ($1, 'LEVETIRACETAM'), ($2, 'LEVOTHYROXINE')`, [MOL, MOL_QUIET]);
  const orgs: [string, string, string][] = [
    [ORG.p1, 'pharmacy', 'TN-11'],
    [ORG.p2, 'pharmacy', 'TN-11'],
    [ORG.p3, 'pharmacy', 'TN-61'],
    [ORG.p4, 'pharmacy', 'TN-61'],
    [ORG.coordinator, 'coordinator', 'TN-11'],
    [ORG.wholesaler, 'wholesaler', 'TN-13'],
    [ORG.hospital, 'hospital_pharmacy', 'TN-51'],
  ];
  for (const [oid, type, gov] of orgs) {
    await db.query(
      `insert into public.organisations (id, type, display_name, governorate_code, origin) values ($1, $2, $3, $4, 'simulated')`,
      [oid, type, NAMES[oid], gov],
    );
  }
  for (const [uid, oid, role] of [
    [USER.p1, ORG.p1, 'pharmacist'],
    [USER.p2, ORG.p2, 'pharmacist'],
    [USER.p3, ORG.p3, 'pharmacist'],
    [USER.p4, ORG.p4, 'pharmacist'],
    [USER.coordinator, ORG.coordinator, 'coordinator'],
  ]) {
    await db.query(`insert into auth.users (id) values ($1)`, [uid]);
    await db.query(`insert into public.profiles (user_id, organisation_id, role) values ($1, $2, $3)`, [uid, oid, role]);
  }
  await db.query(`insert into auth.users (id) values ($1), ($2)`, [USER.tester, USER.tester2]);
  await db.query(`insert into public.followed_molecules (organisation_id, molecule_id) values ($1, $3), ($2, $3)`, [
    ORG.p1,
    ORG.p4,
    MOL,
  ]);
}, 120_000);

afterAll(async () => {
  await db.close();
});

describe('the signal service on the real database', () => {
  const store = () => pgliteSignalStore(db);

  it('walks none, watch, likely, confirmed and logs each step with its rule', async () => {
    await report(ORG.p1, 'TN-11', at(0));
    await recomputeSignal(store(), MOL, at(0));
    await report(ORG.p2, 'TN-11', at(1));
    await recomputeSignal(store(), MOL, at(1));
    await report(ORG.p3, 'TN-61', at(2));
    await recomputeSignal(store(), MOL, at(2));
    await report(ORG.p4, 'TN-61', at(3));
    const last = await recomputeSignal(store(), MOL, at(3));
    expect(last.evaluation.level).toBe('confirmed');

    const { rows } = await db.query<{ from_level: string; to_level: string; rule: string }>(
      `select from_level, to_level, rule from public.signal_events where molecule_id = $1 order by id`,
      [MOL],
    );
    expect(rows.map((r) => `${r.from_level}>${r.to_level}`)).toEqual(['none>watch', 'watch>likely', 'likely>confirmed']);
    expect(rows.map((r) => r.rule)).toEqual(['local_reports_below_threshold', 'two_pharmacies_7d', 'confirmed_threshold']);
  });

  it('alerts the pharmacies that follow the molecule and every wholesaler, hospital and coordinator', async () => {
    const { rows } = await db.query<{ organisation_id: string; n: number }>(
      `select organisation_id, count(*)::int as n from public.alerts group by 1`,
    );
    const byOrg = Object.fromEntries(rows.map((r) => [r.organisation_id, r.n]));
    expect(byOrg).toEqual({ [ORG.p1]: 3, [ORG.p4]: 3, [ORG.coordinator]: 3, [ORG.wholesaler]: 3, [ORG.hospital]: 3 });
  });

  it('a stale write is refused and leaves no event', async () => {
    const before = await db.query<{ n: number }>('select count(*)::int as n from public.signal_events');
    const result = await asCommitted(db, service, (tx) =>
      tx.query<{ applied: boolean }>(
        `select * from public.apply_signal_evaluation($1, 'likely', now() - interval '1 day', 'watch', now(), 'x', '{}'::jsonb, now(), true)`,
        [MOL],
      ),
    );
    expect(result.rows[0].applied).toBe(false);
    const after = await db.query<{ n: number }>('select count(*)::int as n from public.signal_events');
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  it('two recomputes at the same moment write one event', async () => {
    const now = at(3.5);
    const results = await Promise.all([recomputeSignal(store(), MOL, now), recomputeSignal(store(), MOL, now)]);
    expect(results.every((r) => r.evaluation.level === 'confirmed')).toBe(true);
    const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from public.signal_events where molecule_id = $1`, [MOL]);
    expect(rows[0].n).toBe(3);
  });

  it('delivered again from two pharmacies, then the daily run 15 days later, gives "levée" and a stand-down alert', async () => {
    await report(ORG.p1, 'TN-11', at(4), 'delivered_again');
    await report(ORG.p3, 'TN-61', at(5), 'delivered_again');
    await recomputeSignal(store(), MOL, at(5));
    const summary = await recomputeAll(store(), new Date(at(3).getTime() + 15 * DAY));
    expect(summary).toMatchObject({ checked: 1, changed: 1, failed: 0 });

    const { rows } = await db.query<{ from_level: string; to_level: string; rule: string; id: number }>(
      `select id, from_level, to_level, rule from public.signal_events where molecule_id = $1 order by id desc limit 1`,
      [MOL],
    );
    expect(rows[0]).toMatchObject({ from_level: 'confirmed', to_level: 'cleared', rule: 'delivered_again_cleared' });
    const alerts = await db.query<{ n: number }>(`select count(*)::int as n from public.alerts where signal_event_id = $1`, [rows[0].id]);
    expect(alerts.rows[0].n).toBe(5);
  });

  it('apply_signal_evaluation is for the service role only', async () => {
    for (const caller of [user(USER.p1), user(USER.coordinator), { kind: 'anon' as const }]) {
      await expect(
        as(db, caller, (tx) =>
          tx.query(`select * from public.apply_signal_evaluation($1, null, null, 'confirmed', now(), 'x', '{}'::jsonb, now(), true)`, [MOL_QUIET]),
        ),
      ).rejects.toThrow(/permission denied/);
    }
  });
});

describe('report_impact', () => {
  const call = `select * from public.report_impact($1, $2, $3)`;
  const args = [MOL, DEFAULT_PARAMS.confirmWindowDays, DEFAULT_PARAMS.minUndeliveredHours];

  it('gives a pharmacy the national count and the number of governorates, nothing else', async () => {
    const { rows, fields } = await as(db, user(USER.p2), (tx) => tx.query(call, args));
    expect(fields.map((f) => f.name)).toEqual(['pharmacies', 'governorates']);
    expect(rows).toEqual([{ pharmacies: '4', governorates: 2 }]);
  });

  it('shows "<3" and withholds the governorates below 3 pharmacies', async () => {
    await report(ORG.p1, 'TN-11', at(0), 'not_delivered', MOL_QUIET);
    await report(ORG.p3, 'TN-61', at(1), 'not_delivered', MOL_QUIET);
    const { rows } = await as(db, user(USER.p1), (tx) => tx.query(call, [MOL_QUIET, args[1], args[2]]));
    expect(rows).toEqual([{ pharmacies: '<3', governorates: null }]);
  });

  it('is refused to coordinators, other roles and anonymous visitors', async () => {
    await expect(as(db, user(USER.coordinator), (tx) => tx.query(call, args))).rejects.toThrow(/not allowed/);
    await expect(as(db, { kind: 'anon' }, (tx) => tx.query(call, args))).rejects.toThrow(/permission denied/);
  });
});

describe('alerts', () => {
  it('a pharmacy marks its own alert read, and nothing else', async () => {
    const mine = await as(db, user(USER.p1), async (tx) => {
      const { rows } = await tx.query<{ id: string }>('select id from public.alerts where read_at is null limit 1');
      const updated = await tx.query('update public.alerts set read_at = now() where id = $1 returning id', [rows[0].id]);
      return updated.rows.length;
    });
    expect(mine).toBe(1);

    const others = await as(db, user(USER.p1), (tx) =>
      tx.query('update public.alerts set read_at = now() where organisation_id <> $1 returning id', [ORG.p1]),
    );
    expect(others.rows).toHaveLength(0);

    await expect(
      as(db, user(USER.p1), (tx) => tx.query('update public.alerts set organisation_id = $1', [ORG.p2])),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('tester pharmacies', () => {
  const template = 'Pharmacie testeuse n° {n}, {governorate}';

  it('creates a tester pharmacy with a number and a governorate, nothing else', async () => {
    const first = await asCommitted(db, service, (tx) =>
      tx.query<{ organisation_id: string; display_name: string }>(`select * from public.create_tester_pharmacy($1, 'TN-11', $2)`, [USER.tester, template]),
    );
    const second = await asCommitted(db, service, (tx) =>
      tx.query<{ display_name: string }>(`select * from public.create_tester_pharmacy($1, 'TN-61', $2)`, [USER.tester2, template]),
    );
    expect(first.rows[0].display_name).toBe('Pharmacie testeuse n° 1, Tunis');
    expect(second.rows[0].display_name).toBe('Pharmacie testeuse n° 2, Sfax');
    const org = await db.query<{ type: string; origin: string }>(`select type, origin from public.organisations where id = $1`, [
      first.rows[0].organisation_id,
    ]);
    expect(org.rows[0]).toEqual({ type: 'pharmacy', origin: 'tester' });
  });

  it('refuses a second organisation for the same user, and is service role only', async () => {
    await expect(
      asCommitted(db, service, (tx) => tx.query(`select * from public.create_tester_pharmacy($1, 'TN-11', $2)`, [USER.tester, template])),
    ).rejects.toThrow(/already has a profile/);
    await expect(
      as(db, user(USER.p1), (tx) => tx.query(`select * from public.create_tester_pharmacy($1, 'TN-11', $2)`, [USER.p1, template])),
    ).rejects.toThrow(/permission denied/);
  });

  it('a tester’s reports are marked tester, never simulated', async () => {
    const insert = (origin: string) =>
      as(db, user(USER.tester), (tx) =>
        tx.query(
          `insert into public.reports (organisation_id, governorate_code, molecule_id, kind, ordered_at, origin)
           values ((select organisation_id from public.profiles where user_id = $1), 'TN-11', $2, 'not_delivered', now() - interval '3 days', $3) returning origin`,
          [USER.tester, MOL, origin],
        ),
      );
    expect((await insert('tester')).rows).toEqual([{ origin: 'tester' }]);
    await expect(insert('simulated')).rejects.toThrow(/row-level security/);
  });
});

describe('molecule search', () => {
  it.each(['levetiracetam', 'LÉVÉTIRACÉTAM', 'levetiracetan', 'levetir'])('"%s" leads to the molecule', async (q) => {
    const { rows } = await as(db, { kind: 'anon' }, (tx) => tx.query<{ name: string }>('select * from public.search_molecules($1)', [q]));
    expect(rows[0]?.name).toBe('LEVETIRACETAM');
  });

  it('a brand name does not match a molecule', async () => {
    const { rows } = await as(db, { kind: 'anon' }, (tx) => tx.query('select * from public.search_molecules($1)', ['epitam']));
    expect(rows).toHaveLength(0);
  });
});

describe('reset_molecule_signal', () => {
  it('is refused to pharmacies and coordinators', async () => {
    for (const caller of [user(USER.p1), user(USER.coordinator)]) {
      await expect(as(db, caller, (tx) => tx.query('select * from public.reset_molecule_signal($1)', [MOL]))).rejects.toThrow(/permission denied/);
    }
  });

  it('removes a molecule’s alerts, events and signal, and only that molecule’s', async () => {
    await recomputeSignal(pgliteSignalStore(db), MOL_QUIET, at(1));
    const before = await db.query<{ n: number }>('select count(*)::int as n from public.signal_events where molecule_id = $1', [MOL_QUIET]);
    expect(before.rows[0].n).toBeGreaterThan(0);
    const { rows } = await as(db, service, (tx) => tx.query<{ alerts: number; events: number; signals: number }>('select * from public.reset_molecule_signal($1)', [MOL]));
    expect(rows[0].events).toBe(4);
    expect(rows[0].signals).toBe(1);
    const left = await db.query<{ n: number }>('select count(*)::int as n from public.signal_events where molecule_id = $1', [MOL_QUIET]);
    expect(left.rows[0].n).toBe(before.rows[0].n);
  });

  it('leaves the event log append only outside the function', async () => {
    await expect(
      asCommitted(db, service, (tx) => tx.query('delete from public.signal_events where molecule_id = $1', [MOL_QUIET])),
    ).rejects.toThrow(/append only/);
  });
});

describe('what a pharmacy can see', () => {
  it('no table or function a pharmacy can read returns another organisation’s id or name', async () => {
    const seen = await as(db, user(USER.p2), async (tx) => {
      const out: unknown[] = [];
      for (const table of ['organisations', 'profiles', 'reports', 'followed_molecules', 'signals', 'signal_events', 'alerts', 'foreign_notices']) {
        out.push((await tx.query(`select * from public.${table}`)).rows);
      }
      out.push((await tx.query(`select * from public.report_impact($1)`, [MOL])).rows);
      return JSON.stringify(out);
    });
    for (const [orgId, name] of Object.entries(NAMES)) {
      if (orgId === ORG.p2) continue;
      expect(seen).not.toContain(orgId);
      expect(seen).not.toContain(name);
    }
    expect(seen).toContain(ORG.p2); // its own rows are there, so the scan did read data
  });
});
