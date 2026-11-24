// Session 5, track B (migrations 0017 and 0018), on the real migrations:
// - public_molecule_status tells anyone only "confirmée", "levée" after a confirmed level, or
//   nothing: never "sous surveillance" or "probable", never a count or a rule (rule 10);
// - the prescriber receives the counts by governorate, the pharmacy and visitors do not;
// - the prescriber reads no report, no pharmacy and no patient request (rules 1 to 3).
// Session 6 (migration 0023): the time of the last evaluation, for a shown level only.
// Session 6 (migration 0024): the public history, "confirmée" and "levée" periods only.

import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, createTestDatabase } from './harness';

const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const MOL = {
  none: id(0x300),
  watch: id(0x301),
  likely: id(0x302),
  confirmed: id(0x303),
  clearedFromConfirmed: id(0x304),
  clearedFromLikely: id(0x305),
  noRow: id(0x306),
  history: id(0x307),
};
const ORG = { pharmacy: id(0xa1), prescriber: id(0xe1) };
const USER = { pharmacy: id(0x1a1), prescriber: id(0x1e1) };
const user = (k: keyof typeof USER) => ({ kind: 'user' as const, userId: USER[k] });
const anon = { kind: 'anon' as const };
type Caller = typeof anon | ReturnType<typeof user>;
const SINCE = '2026-11-10T08:00:00.000Z';
const EVALUATED = '2026-11-20T09:30:00.000Z';
const NONE = { level: 'none', since: null, origins: [], evaluated_at: null };

let db: PGlite;

async function errorOf(p: Promise<unknown>) {
  try {
    await p;
    return null;
  } catch (error) {
    return error as { code?: string; message: string };
  }
}

const status = (caller: Caller, molecule: string) =>
  as(db, caller, async (tx) => (await tx.query<{ level: string; since: Date | null; origins: string[]; evaluated_at: Date | null }>('select * from public.public_molecule_status($1)', [molecule])).rows);

beforeAll(async () => {
  db = await createTestDatabase({ defaultGrants: false });
  for (const [name, mol] of Object.entries(MOL)) await db.query('insert into public.molecules (id, name) values ($1, $2)', [mol, name.toUpperCase()]);
  const signal = async (mol: string, level: string, events: [string, string][]) => {
    await db.query(
      `insert into public.signals (molecule_id, level, since, rule, evidence, updated_at) values ($1, $2, $3, 'test_rule', '{"pharmacies14d": 2, "origins": ["simulated"]}', $4)`,
      [mol, level, SINCE, EVALUATED],
    );
    for (const [i, [from, to]] of events.entries()) {
      await db.query(
        `insert into public.signal_events (molecule_id, from_level, to_level, rule, at)
         values ($1, $2, $3, 'test_rule', '2026-10-01T00:00:00Z'::timestamptz + make_interval(days => $4))`,
        [mol, from, to, i],
      );
    }
  };
  await signal(MOL.none, 'none', [['cleared', 'none']]);
  await signal(MOL.watch, 'watch', [['none', 'watch']]);
  await signal(MOL.likely, 'likely', [['none', 'likely']]);
  await signal(MOL.confirmed, 'confirmed', [
    ['none', 'likely'],
    ['likely', 'confirmed'],
  ]);
  await signal(MOL.clearedFromConfirmed, 'cleared', [
    ['none', 'likely'],
    ['likely', 'confirmed'],
    ['confirmed', 'cleared'],
  ]);
  // The history: probable, confirmée, levée, expiry, a new "sous surveillance", days ago.
  await db.query(`insert into public.signals (molecule_id, level, since, rule, evidence) values ($1, 'watch', now() - interval '2 days', 'test_rule', '{}')`, [
    MOL.history,
  ]);
  for (const [from, to, daysAgo] of [
    ['none', 'watch', 200],
    ['watch', 'confirmed', 120],
    ['confirmed', 'cleared', 100],
    ['cleared', 'none', 60],
    ['none', 'watch', 50],
    ['watch', 'likely', 40],
    ['likely', 'confirmed', 30],
    ['confirmed', 'cleared', 20],
    ['cleared', 'none', 10],
    ['none', 'watch', 2],
  ] as const) {
    await db.query(
      `insert into public.signal_events (molecule_id, from_level, to_level, rule, at) values ($1, $2, $3, 'test_rule', now() - make_interval(days => $4))`,
      [MOL.history, from, to, daysAgo],
    );
  }
  await signal(MOL.clearedFromLikely, 'cleared', [
    ['none', 'likely'],
    ['likely', 'cleared'],
  ]);

  await db.query(
    `insert into public.organisations (id, type, display_name, governorate_code, origin)
     values ($1, 'pharmacy', 'Pharmacie démo', 'TN-11', 'simulated'), ($2, 'prescriber', 'Cabinet démo', 'TN-11', 'simulated')`,
    [ORG.pharmacy, ORG.prescriber],
  );
  await db.query('insert into auth.users (id) values ($1), ($2)', [USER.pharmacy, USER.prescriber]);
  await db.query(`insert into public.profiles (user_id, organisation_id, role) values ($1, $2, 'pharmacist'), ($3, $4, 'prescriber')`, [
    USER.pharmacy,
    ORG.pharmacy,
    USER.prescriber,
    ORG.prescriber,
  ]);
  await db.query(
    `insert into public.reports (organisation_id, governorate_code, molecule_id, kind, ordered_at, reported_at, origin)
     values ($1, 'TN-11', $2, 'not_delivered', now() - interval '6 days', now() - interval '1 day', 'simulated')`,
    [ORG.pharmacy, MOL.confirmed],
  );
  await db.query(
    `insert into public.availability_requests (molecule_id, governorate_code, created_at, expires_at, device_hash, origin)
     values ($1, 'TN-11', now(), now() + interval '3 hours', $2, 'simulated')`,
    [MOL.confirmed, '0'.repeat(64)],
  );
});

afterAll(async () => {
  await db.close();
});

describe('public_molecule_status', () => {
  it('says "confirmée" with its date, to a visitor with no account', async () => {
    expect(await status(anon, MOL.confirmed)).toEqual([{ level: 'confirmed', since: new Date(SINCE), origins: ['simulated'], evaluated_at: new Date(EVALUATED) }]);
  });

  it('says "levée" only when the medicine was confirmed before', async () => {
    expect(await status(anon, MOL.clearedFromConfirmed)).toEqual([
      { level: 'cleared', since: new Date(SINCE), origins: ['simulated'], evaluated_at: new Date(EVALUATED) },
    ]);
    expect(await status(anon, MOL.clearedFromLikely)).toEqual([NONE]);
  });

  it('never returns "sous surveillance" or "probable", whoever asks', async () => {
    for (const caller of [anon, user('pharmacy'), user('prescriber')]) {
      for (const mol of Object.values(MOL)) {
        const rows = await status(caller, mol);
        expect(rows).toHaveLength(1);
        expect(['confirmed', 'cleared', 'none']).toContain(rows[0].level);
        // Below "confirmée", not even the time of the last evaluation.
        if (rows[0].level === 'none') expect(rows[0]).toEqual(NONE);
      }
    }
    for (const mol of [MOL.watch, MOL.likely, MOL.noRow]) expect(await status(anon, mol)).toEqual([NONE]);
  });

  it('returns the level, its date, its origins and when it was last evaluated only: no count, no rule', async () => {
    const { fields } = await as(db, anon, (tx) => tx.query('select * from public.public_molecule_status($1)', [MOL.confirmed]));
    expect(fields.map((f) => f.name)).toEqual(['level', 'since', 'origins', 'evaluated_at']);
  });
});

describe('public_molecule_history', () => {
  const history = (caller: Caller, molecule: string, days?: number) =>
    as(db, caller, async (tx) =>
      (await tx.query<{ at: Date; level: string }>('select * from public.public_molecule_history($1, $2)', [molecule, days ?? 90])).rows.map((r) => ({
        daysAgo: Math.round((Date.now() - new Date(r.at).getTime()) / 86_400_000),
        level: r.level,
      })),
    );

  it('gives only the public changes: "confirmée", "levée" after one, and back to none; the level at the window start first', async () => {
    expect(await history(anon, MOL.history)).toEqual([
      { daysAgo: 100, level: 'cleared' },
      { daysAgo: 60, level: 'none' },
      { daysAgo: 30, level: 'confirmed' },
      { daysAgo: 20, level: 'cleared' },
      { daysAgo: 10, level: 'none' },
    ]);
  });

  it('leaves no trace of a change below "confirmée", not even its time', async () => {
    for (const caller of [anon, user('pharmacy')]) {
      const rows = await history(caller, MOL.history, 365);
      expect(rows.map((r) => r.daysAgo)).not.toContain(50);
      expect(rows.map((r) => r.daysAgo)).not.toContain(40);
      expect(rows.map((r) => r.daysAgo)).not.toContain(2);
      for (const r of rows) expect(['confirmed', 'cleared', 'none']).toContain(r.level);
    }
    for (const mol of [MOL.watch, MOL.likely, MOL.clearedFromLikely, MOL.noRow]) expect(await history(anon, mol)).toEqual([]);
  });

  it('returns the time and the public level only', async () => {
    const { fields } = await as(db, anon, (tx) => tx.query('select * from public.public_molecule_history($1, 90)', [MOL.history]));
    expect(fields.map((f) => f.name)).toEqual(['at', 'level']);
  });
});

describe('the prescriber', () => {
  const counts = (caller: Caller) =>
    as(db, caller, async (tx) => (await tx.query('select * from public.governorate_counts($1)', [MOL.confirmed])).rows);

  it('receives the counts by governorate, small counts as "<3"', async () => {
    expect(await counts(user('prescriber'))).toEqual([{ governorate_code: 'TN-11', governorate_name: 'Tunis', pharmacies: '<3' }]);
  });

  it('pharmacies and visitors do not', async () => {
    expect((await errorOf(counts(user('pharmacy'))))?.message).toMatch(/not allowed/);
    expect((await errorOf(counts(anon)))?.message).toMatch(/permission denied/);
  });

  it('sees every level with its explanation, through signals_view', async () => {
    const rows = await as(db, user('prescriber'), async (tx) => (await tx.query<{ level: string }>('select level from public.signals_view(null)')).rows);
    expect(rows.map((r) => r.level).sort()).toEqual(['cleared', 'cleared', 'confirmed', 'likely', 'none', 'watch', 'watch']);
  });

  it('reads no report, no other organisation, no patient request', async () => {
    const read = (sql: string) => as(db, user('prescriber'), async (tx) => (await tx.query(sql)).rows);
    expect(await read('select * from public.reports')).toEqual([]);
    expect(await read('select id from public.organisations')).toEqual([{ id: ORG.prescriber }]);
    expect((await errorOf(read('select * from public.availability_requests')))?.message).toMatch(/permission denied/);
    expect(await read('select * from public.availability_answers')).toEqual([]);
    expect((await errorOf(read('select * from public.requests_for_my_pharmacy()')))?.message).toMatch(/pharmacies only/);
  });
});
