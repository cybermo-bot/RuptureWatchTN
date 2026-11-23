// Session 3, section 1: the count of active member pharmacies, on the real migrations.
// Members are participating pharmacies (simulated demo accounts excluded) with a report or a
// sign-in in the last 90 days. The signal service passes the count to evaluate(), which raises
// the "confirmed" bar on a large network.

import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '@/lib/signal';
import { ACTIVE_MEMBER_DAYS, recomputeSignal } from '@/lib/signals/recompute';
import { as, asCommitted, createTestDatabase } from './harness';
import { pgliteSignalStore } from './pglite-store';

const DAY = 86_400_000;
const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const service = { kind: 'service' as const };
const anon = { kind: 'anon' as const };

const MOL = id(0x300);
const ORG = {
  reported: id(0xb1), // tester pharmacy, report 10 days ago: active
  oldReport: id(0xb2), // tester pharmacy, report 100 days ago, no sign-in: not active
  signedIn: id(0xb3), // tester pharmacy, sign-in 5 days ago: active
  simulated: id(0xb4), // demo pharmacy with a recent report: excluded
  wholesaler: id(0xb5), // not a pharmacy: excluded
  oldSignIn: id(0xb6), // tester pharmacy, sign-in 120 days ago: not active
};
const USER = { signedIn: id(0x1b3), wholesaler: id(0x1b5), oldSignIn: id(0x1b6) };

let db: PGlite;
const daysAgo = (d: number) => new Date(Date.now() - d * DAY);

async function count(): Promise<number> {
  return asCommitted(db, service, async (tx) => (await tx.query<{ n: number }>('select public.active_member_pharmacies($1) as n', [ACTIVE_MEMBER_DAYS])).rows[0].n);
}

async function report(org: string, gov: string, when: Date, origin = 'tester') {
  await db.query(
    `insert into public.reports (organisation_id, governorate_code, molecule_id, kind, ordered_at, reported_at, origin)
     values ($1, $2, $3, 'not_delivered', $4, $5, $6)`,
    [org, gov, MOL, new Date(when.getTime() - 4 * DAY), when, origin],
  );
}

beforeAll(async () => {
  db = await createTestDatabase({ defaultGrants: false });
  await db.query(`insert into public.molecules (id, name) values ($1, 'MOLECULE MEMBRES')`, [MOL]);
  for (const [oid, type, origin] of [
    [ORG.reported, 'pharmacy', 'tester'],
    [ORG.oldReport, 'pharmacy', 'tester'],
    [ORG.signedIn, 'pharmacy', 'tester'],
    [ORG.simulated, 'pharmacy', 'simulated'],
    [ORG.wholesaler, 'wholesaler', 'tester'],
    [ORG.oldSignIn, 'pharmacy', 'tester'],
  ]) {
    await db.query(
      `insert into public.organisations (id, type, display_name, governorate_code, origin) values ($1, $2, $3, 'TN-11', $4)`,
      [oid, type, `Organisation ${oid}`, origin],
    );
  }
  for (const [uid, oid, role, last] of [
    [USER.signedIn, ORG.signedIn, 'pharmacist', daysAgo(5)],
    [USER.wholesaler, ORG.wholesaler, 'wholesaler', daysAgo(1)],
    [USER.oldSignIn, ORG.oldSignIn, 'pharmacist', daysAgo(120)],
  ] as const) {
    await db.query(`insert into auth.users (id, last_sign_in_at) values ($1, $2)`, [uid, last]);
    await db.query(`insert into public.profiles (user_id, organisation_id, role) values ($1, $2, $3)`, [uid, oid, role]);
  }
  await report(ORG.reported, 'TN-11', daysAgo(10));
  await report(ORG.oldReport, 'TN-11', daysAgo(100));
  await report(ORG.simulated, 'TN-11', daysAgo(2), 'simulated');
});

afterAll(async () => {
  await db?.close();
});

describe('active_member_pharmacies', () => {
  it('counts pharmacies with a recent report or sign-in, never simulated ones or other roles', async () => {
    expect(await count()).toBe(2);
  });

  it('is refused to signed-in users and to the public', async () => {
    await expect(as(db, anon, (tx) => tx.query('select public.active_member_pharmacies(90)'))).rejects.toThrow(/permission denied/);
    await expect(
      as(db, { kind: 'user', userId: USER.signedIn }, (tx) => tx.query('select public.active_member_pharmacies(90)')),
    ).rejects.toThrow(/permission denied/);
  });

  it('rejects a window out of range', async () => {
    await expect(asCommitted(db, service, (tx) => tx.query('select public.active_member_pharmacies(0)'))).rejects.toThrow(/out of range/);
  });

  it('a small network keeps the floor: four pharmacies in two governorates confirm', async () => {
    const pharmacies = Array.from({ length: DEFAULT_PARAMS.confirmMinPharmacies }, (_, i) => id(0xc00 + i));
    for (const [i, oid] of pharmacies.entries()) {
      await db.query(
        `insert into public.organisations (id, type, display_name, governorate_code, origin) values ($1, 'pharmacy', $2, $3, 'simulated')`,
        [oid, `Demo ${i}`, i % 2 ? 'TN-61' : 'TN-11'],
      );
      await report(oid, i % 2 ? 'TN-61' : 'TN-11', daysAgo(1), 'simulated');
    }
    const r = await recomputeSignal(pgliteSignalStore(db), MOL, new Date());
    expect(r.evaluation.level).toBe('confirmed');
  });

  it('a large network raises the bar: the same reports are no longer enough', async () => {
    // 250 tester pharmacies signed in this week: ceil(0.02 x 252) = 6 pharmacies needed.
    await db.query(`
      with o as (
        insert into public.organisations (id, type, display_name, governorate_code, origin)
        select gen_random_uuid(), 'pharmacy', 'Testeuse ' || g, 'TN-12', 'tester' from generate_series(1, 250) g
        returning id
      ), u as (
        insert into auth.users (id, last_sign_in_at) select gen_random_uuid(), now() - interval '2 days' from o
        returning id
      ), pairs as (
        select o.id as org, u.id as uid from (select id, row_number() over () as n from o) o
        join (select id, row_number() over () as n from u) u using (n)
      )
      insert into public.profiles (user_id, organisation_id, role) select uid, org, 'pharmacist' from pairs`);
    const members = await count();
    expect(members).toBe(252);
    const needed = Math.ceil(DEFAULT_PARAMS.confirmMemberShare * members);
    expect(needed).toBeGreaterThan(DEFAULT_PARAMS.confirmMinPharmacies);
    // The level was confirmed; it is now held (likely and confirmed never fall on fewer reports),
    // so check the raw evaluation on a fresh molecule instead.
    const MOL2 = id(0x301);
    await db.query(`insert into public.molecules (id, name) values ($1, 'MOLECULE GRAND RESEAU')`, [MOL2]);
    await db.query(`update public.reports set molecule_id = $1 where origin = 'simulated' and molecule_id = $2 and reported_at > now() - interval '3 days'`, [MOL2, MOL]);
    const r = await recomputeSignal(pgliteSignalStore(db), MOL2, new Date());
    expect(r.evaluation.evidence.pharmacies14d).toBe(DEFAULT_PARAMS.confirmMinPharmacies + 1);
    expect(r.evaluation.level).toBe('likely');
  });
});
