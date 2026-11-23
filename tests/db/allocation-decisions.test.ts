// Track D: the wholesaler's split decisions (allocation_decisions), on the real migrations.
// A wholesaler records and reads its own; coordinators read all; nobody else reads or writes;
// not applying the split needs a reason; nothing is ever updated or deleted.

import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, asCommitted, createTestDatabase } from './harness';

const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const MOL = id(0x200);
const ORG = { w1: id(0xb1), w2: id(0xb2), wTester: id(0xb3), coordinator: id(0xd1), pharmacy: id(0xa1), hospital: id(0xc1) };
const USER: Record<keyof typeof ORG, string> = {
  w1: id(0x1b1),
  w2: id(0x1b2),
  wTester: id(0x1b3),
  coordinator: id(0x1d1),
  pharmacy: id(0x1a1),
  hospital: id(0x1c1),
};
const user = (k: keyof typeof ORG) => ({ kind: 'user' as const, userId: USER[k] });
const RECOMMENDED = JSON.stringify({ reserve: 10, rows: [{ code: 'TN-11', boxes: 90 }] });
const REASON = 'Commande hospitalière urgente déjà engagée pour Sfax';

let db: PGlite;

async function errorOf(p: Promise<unknown>): Promise<{ message: string } | null> {
  try {
    await p;
    return null;
  } catch (error) {
    return error as { message: string };
  }
}

const insert = (k: keyof typeof ORG, applied: boolean, reason: string | null, extra = '') =>
  asCommitted(db, user(k), (tx) =>
    tx.query(
      `insert into public.allocation_decisions (molecule_id, stock, recommended, applied, deviation_reason${extra ? ', ' + extra : ''})
       values ($1, 100, $2::jsonb, $3, $4${extra ? ', $5' : ''})`,
      extra ? [MOL, RECOMMENDED, applied, reason, extra === 'origin' ? 'official_source' : ORG.w2] : [MOL, RECOMMENDED, applied, reason],
    ),
  );

const visible = (k: keyof typeof ORG) =>
  as(db, user(k), async (tx) => (await tx.query<{ organisation_id: string }>(`select organisation_id from public.allocation_decisions`)).rows);

beforeAll(async () => {
  db = await createTestDatabase({ defaultGrants: false });
  await db.query(`insert into public.molecules (id, name) values ($1, 'LEVETIRACETAM')`, [MOL]);
  const orgs: [keyof typeof ORG, string, string, string, string][] = [
    ['w1', 'wholesaler', 'TN-13', 'simulated', 'wholesaler'],
    ['w2', 'wholesaler', 'TN-61', 'simulated', 'wholesaler'],
    ['wTester', 'wholesaler', 'TN-11', 'tester', 'wholesaler'],
    ['coordinator', 'coordinator', 'TN-11', 'simulated', 'coordinator'],
    ['pharmacy', 'pharmacy', 'TN-11', 'simulated', 'pharmacist'],
    ['hospital', 'hospital_pharmacy', 'TN-51', 'simulated', 'hospital_pharmacist'],
  ];
  for (const [k, type, gov, origin, role] of orgs) {
    await db.query(
      `insert into public.organisations (id, type, display_name, governorate_code, origin) values ($1, $2, $3, $4, $5)`,
      [ORG[k], type, `Organisation ${k}`, gov, origin],
    );
    await db.query(`insert into auth.users (id) values ($1)`, [USER[k]]);
    await db.query(`insert into public.profiles (user_id, organisation_id, role) values ($1, $2, $3)`, [USER[k], ORG[k], role]);
  }
});

afterAll(async () => {
  await db.close();
});

describe('allocation decisions', () => {
  it('a wholesaler records a decision; the database sets its organisation, time and origin', async () => {
    await insert('w1', true, null);
    await insert('wTester', false, REASON);
    const { rows } = await db.query<{ organisation_id: string; origin: string; decided_at: Date | null }>(
      `select organisation_id, origin, decided_at from public.allocation_decisions order by organisation_id`,
    );
    expect(rows.map((r) => [r.organisation_id, r.origin])).toEqual([
      [ORG.w1, 'simulated'],
      [ORG.wTester, 'tester'],
    ]);
    expect(rows.every((r) => r.decided_at)).toBe(true);
  });

  it('"Ne pas appliquer" needs a reason of a few words', async () => {
    for (const reason of [null, '', '   ', 'non']) {
      const err = await errorOf(insert('w1', false, reason));
      expect(err?.message, String(reason)).toMatch(/allocation_decisions_reason/);
    }
    expect(await errorOf(insert('w1', false, REASON))).toBeNull();
  });

  it('a wholesaler cannot write for another organisation, nor choose its origin', async () => {
    expect((await errorOf(insert('w1', true, null, 'organisation_id')))?.message).toMatch(/permission denied/);
    expect((await errorOf(insert('w1', true, null, 'origin')))?.message).toMatch(/permission denied/);
  });

  it('only wholesalers record decisions', async () => {
    for (const k of ['coordinator', 'pharmacy', 'hospital'] as const) {
      expect((await errorOf(insert(k, true, null)))?.message, k).toMatch(/row-level security/);
    }
    const err = await errorOf(
      as(db, { kind: 'anon' }, (tx) =>
        tx.query(`insert into public.allocation_decisions (molecule_id, stock, recommended, applied) values ($1, 1, '{}', true)`, [MOL]),
      ),
    );
    expect(err?.message).toMatch(/permission denied/);
  });

  it('a wholesaler reads its own decisions only; coordinators read all; others none', async () => {
    expect((await visible('w1')).every((r) => r.organisation_id === ORG.w1)).toBe(true);
    expect((await visible('w1')).length).toBeGreaterThan(0);
    expect(await visible('w2')).toEqual([]);
    expect(new Set((await visible('coordinator')).map((r) => r.organisation_id))).toEqual(new Set([ORG.w1, ORG.wTester]));
    expect(await visible('pharmacy')).toEqual([]);
    expect(await visible('hospital')).toEqual([]);
    const anon = await errorOf(as(db, { kind: 'anon' }, (tx) => tx.query(`select * from public.allocation_decisions`)));
    expect(anon?.message).toMatch(/permission denied/);
  });

  it('a decision is never updated or deleted by its author', async () => {
    const upd = await errorOf(as(db, user('w1'), (tx) => tx.query(`update public.allocation_decisions set applied = false`)));
    expect(upd?.message).toMatch(/permission denied/);
    const del = await errorOf(as(db, user('w1'), (tx) => tx.query(`delete from public.allocation_decisions`)));
    expect(del?.message).toMatch(/permission denied/);
  });
});
