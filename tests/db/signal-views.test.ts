// Session 4, fixes 2 and 4, on the real migrations.
// Fix 2: no API path gives a signed-in caller an exact pharmacy count under 3. The raw evidence
// columns are not readable; signals_view, signal_events_view and my_alerts return '<3'.
// Fix 4: tester numbering restarts at 1, only when no tester pharmacy remains.

import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Evidence } from '@/lib/signal';
import { recomputeSignal } from '@/lib/signals/recompute';
import { shownEvidence } from '@/lib/signals/shown';
import { as, asCommitted, createTestDatabase } from './harness';
import { pgliteSignalStore } from './pglite-store';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

const MOL_FEW = id(0x200); // 2 pharmacies, one governorate: counts must read '<3'
const MOL_MANY = id(0x201); // 4 pharmacies, 2 governorates: counts shown as they are
const ORG = { p1: id(0xa1), p2: id(0xa2), p3: id(0xa3), p4: id(0xa4), coordinator: id(0xd1) };
const USER = { p1: id(0x1a1), p2: id(0x1a2), coordinator: id(0x1d1), tester: id(0x1e1) };
const user = (userId: string) => ({ kind: 'user' as const, userId });
const service = { kind: 'service' as const };
const anon = { kind: 'anon' as const };

const T0 = new Date(Date.now() - 2 * DAY);
const at = (hours: number) => new Date(T0.getTime() + hours * HOUR);

let db: PGlite;

async function report(org: string, gov: string, molecule: string, when: Date) {
  await asCommitted(db, service, (tx) =>
    tx.query(
      `insert into public.reports (organisation_id, governorate_code, molecule_id, kind, ordered_at, reported_at, origin)
       values ($1, $2, $3, 'not_delivered', $4, $5, 'simulated')`,
      [org, gov, molecule, new Date(when.getTime() - 4 * DAY), when],
    ),
  );
  await recomputeSignal(pgliteSignalStore(db), molecule, when);
}

beforeAll(async () => {
  db = await createTestDatabase({ defaultGrants: false });
  await db.query(`insert into public.molecules (id, name) values ($1, 'MOLECULE PEU'), ($2, 'MOLECULE BEAUCOUP')`, [MOL_FEW, MOL_MANY]);
  for (const [oid, type, gov] of [
    [ORG.p1, 'pharmacy', 'TN-11'],
    [ORG.p2, 'pharmacy', 'TN-11'],
    [ORG.p3, 'pharmacy', 'TN-61'],
    [ORG.p4, 'pharmacy', 'TN-61'],
    [ORG.coordinator, 'coordinator', 'TN-11'],
  ]) {
    await db.query(
      `insert into public.organisations (id, type, display_name, governorate_code, origin) values ($1, $2, $3, $4, 'simulated')`,
      [oid, type, `Organisation ${oid}`, gov],
    );
  }
  for (const [uid, oid, role] of [
    [USER.p1, ORG.p1, 'pharmacist'],
    [USER.p2, ORG.p2, 'pharmacist'],
    [USER.coordinator, ORG.coordinator, 'coordinator'],
  ]) {
    await db.query(`insert into auth.users (id) values ($1)`, [uid]);
    await db.query(`insert into public.profiles (user_id, organisation_id, role) values ($1, $2, $3)`, [uid, oid, role]);
  }
  await db.query(`insert into auth.users (id) values ($1)`, [USER.tester]);
  await db.query(`insert into public.followed_molecules (organisation_id, molecule_id) values ($1, $2)`, [ORG.p1, MOL_FEW]);

  await report(ORG.p1, 'TN-11', MOL_FEW, at(0));
  await report(ORG.p2, 'TN-11', MOL_FEW, at(1)); // likely, 2 pharmacies in 1 governorate
  for (const [i, [org, gov]] of [
    [ORG.p1, 'TN-11'],
    [ORG.p2, 'TN-11'],
    [ORG.p3, 'TN-61'],
    [ORG.p4, 'TN-61'],
  ].entries()) {
    await report(org, gov, MOL_MANY, at(2 + i)); // confirmed, 4 pharmacies in 2 governorates
  }
}, 120_000);

afterAll(async () => {
  await db.close();
});

type Row = { molecule_id: string; level: string; evidence: Record<string, unknown> };

describe('fix 2: no exact count under 3 for a signed-in caller', () => {
  it('the stored evidence is exact (service role), so the test data really holds a 2', async () => {
    const { rows } = await db.query<{ evidence: { pharmacies14d: number } }>(`select evidence from public.signals where molecule_id = $1`, [MOL_FEW]);
    expect(rows[0].evidence.pharmacies14d).toBe(2);
  });

  it.each([
    ['pharmacy', USER.p2],
    ['coordinator', USER.coordinator],
  ])('a %s cannot select the evidence of signals or signal_events', async (_role, uid) => {
    for (const sql of [
      'select evidence from public.signals',
      'select * from public.signals',
      'select evidence from public.signal_events',
      'select * from public.signal_events',
    ]) {
      await expect(as(db, user(uid), (tx) => tx.query(sql))).rejects.toThrow(/permission denied/);
    }
  });

  it('a signed-in caller still reads the columns without counts (for Realtime and the level)', async () => {
    const { rows } = await as(db, user(USER.p2), (tx) =>
      tx.query<{ level: string }>(`select molecule_id, level, since, rule, updated_at from public.signals where molecule_id = $1`, [MOL_FEW]),
    );
    expect(rows[0].level).toBe('likely');
    const events = await as(db, user(USER.p2), (tx) =>
      tx.query(`select id, molecule_id, from_level, to_level, rule, at from public.signal_events`),
    );
    expect(events.rows.length).toBeGreaterThan(0);
  });

  it.each([
    ['pharmacy', USER.p2],
    ['coordinator', USER.coordinator],
  ])('signals_view gives a %s "<3" and no governorate count for 2 pharmacies', async (_role, uid) => {
    const { rows } = await as(db, user(uid), (tx) => tx.query<Row>(`select * from public.signals_view(array[$1]::uuid[])`, [MOL_FEW]));
    expect(rows).toHaveLength(1);
    expect(rows[0].level).toBe('likely');
    expect(rows[0].evidence).toMatchObject({ pharmacies14d: '<3', pharmacies7d: '<3', governorates14d: null });
  });

  it('signals_view shows counts of 3 and more as they are', async () => {
    const { rows } = await as(db, user(USER.coordinator), (tx) => tx.query<Row>(`select * from public.signals_view()`));
    const many = rows.find((r) => r.molecule_id === MOL_MANY)!;
    expect(many.level).toBe('confirmed');
    expect(many.evidence).toMatchObject({ pharmacies14d: 4, pharmacies7d: 4, governorates14d: 2 });
    expect(rows.map((r) => r.molecule_id).sort()).toEqual([MOL_FEW, MOL_MANY].sort());
  });

  it('signal_events_view never returns 1 or 2 in a pharmacy count', async () => {
    const { rows } = await as(db, user(USER.coordinator), (tx) => tx.query<Row>(`select * from public.signal_events_view()`));
    expect(rows.length).toBeGreaterThanOrEqual(5);
    for (const r of rows) {
      for (const key of ['pharmacies14d', 'pharmacies7d', 'deliveredAgainPharmacies', 'ignoredTooEarly']) {
        expect([1, 2]).not.toContain(r.evidence[key]);
      }
      if (r.evidence.pharmacies14d === '<3') expect(r.evidence.governorates14d).toBeNull();
    }
    // Newest first.
    const times = rows.map((r) => (r as unknown as { at: string }).at);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it('my_alerts returns only the caller’s alerts, with display counts', async () => {
    const mine = await as(db, user(USER.p1), (tx) => tx.query<Row>(`select * from public.my_alerts()`));
    expect(mine.rows.length).toBeGreaterThan(0);
    expect(mine.rows.every((r) => r.molecule_id === MOL_FEW)).toBe(true); // p1 follows MOL_FEW only
    for (const r of mine.rows) expect([1, 2]).not.toContain(r.evidence.pharmacies14d);
    const other = await as(db, user(USER.p2), (tx) => tx.query<Row>(`select * from public.my_alerts()`));
    expect(other.rows).toHaveLength(0); // p2 follows nothing
  });

  it('anonymous visitors cannot call any of the three', async () => {
    for (const sql of ['select * from public.signals_view()', 'select * from public.signal_events_view()', 'select * from public.my_alerts()']) {
      await expect(as(db, anon, (tx) => tx.query(sql))).rejects.toThrow(/permission denied/);
    }
  });

  it('the database and lib/signals/shown.ts suppress the same way', async () => {
    for (const p14 of [0, 1, 2, 3, 4, 7]) {
      for (const p7 of [0, 1, 2, 3]) {
        const evidence: Evidence = {
          pharmacies14d: p14,
          governorates14d: Math.min(p14, 2),
          pharmacies7d: p7,
          activeNotices: [],
          deliveredAgainPharmacies: p7,
          lastNotDeliveredAt: p14 ? new Date('2026-11-20T10:00:00Z') : null,
          ignoredTooEarly: p14,
        };
        const stored = {
          pharmacies14d: p14,
          governorates14d: Math.min(p14, 2),
          pharmacies7d: p7,
          deliveredAgainPharmacies: p7,
          ignoredTooEarly: p14,
          lastNotDeliveredAt: evidence.lastNotDeliveredAt?.toISOString() ?? null,
          notices: [],
        };
        const { rows } = await db.query<{ e: unknown }>(`select app.shown_evidence($1::jsonb) as e`, [JSON.stringify(stored)]);
        expect(rows[0].e).toEqual(shownEvidence(evidence));
      }
    }
  });

  it('a key added to the stored evidence later is not passed on', async () => {
    const { rows } = await db.query<{ e: Record<string, unknown> }>(`select app.shown_evidence($1::jsonb) as e`, [
      JSON.stringify({ pharmacies14d: 5, governorates14d: 2, somethingNew: 1 }),
    ]);
    expect(rows[0].e).not.toHaveProperty('somethingNew');
  });
});

describe('fix 4: tester numbering restarts at 1', () => {
  const template = 'Pharmacie testeuse n° {n}, {governorate}';

  it('the migration leaves the sequence at 1 on a project with no tester', async () => {
    const created = await asCommitted(db, service, (tx) =>
      tx.query<{ display_name: string; organisation_id: string }>(`select * from public.create_tester_pharmacy($1, 'TN-11', $2)`, [
        USER.tester,
        template,
      ]),
    );
    expect(created.rows[0].display_name).toBe('Pharmacie testeuse n° 1, Tunis');
  });

  it('changes nothing while a tester pharmacy remains', async () => {
    await db.query(`select nextval('public.tester_pharmacy_number')`); // a later sign-up took n° 2
    const { rows } = await asCommitted(db, service, (tx) =>
      tx.query<{ reset: boolean; remaining_testers: number }>(`select * from public.reset_tester_numbering()`),
    );
    expect(rows[0]).toEqual({ reset: false, remaining_testers: 1 });
    const next = await db.query<{ n: string }>(`select nextval('public.tester_pharmacy_number')::text as n`);
    expect(next.rows[0].n).toBe('3');
  });

  it('restarts at 1 once the testers are removed (npm run verify:clean)', async () => {
    await db.query(`delete from public.profiles where user_id = $1`, [USER.tester]);
    await db.query(`delete from public.organisations where origin = 'tester'`);
    const { rows } = await asCommitted(db, service, (tx) =>
      tx.query<{ reset: boolean; remaining_testers: number }>(`select * from public.reset_tester_numbering()`),
    );
    expect(rows[0]).toEqual({ reset: true, remaining_testers: 0 });
    const created = await asCommitted(db, service, (tx) =>
      tx.query<{ display_name: string }>(`select * from public.create_tester_pharmacy($1, 'TN-61', $2)`, [USER.tester, template]),
    );
    expect(created.rows[0].display_name).toBe('Pharmacie testeuse n° 1, Sfax');
  });

  it('is for the service role only', async () => {
    for (const caller of [user(USER.coordinator), anon]) {
      await expect(as(db, caller, (tx) => tx.query(`select * from public.reset_tester_numbering()`))).rejects.toThrow(
        /permission denied/,
      );
    }
  });
});
