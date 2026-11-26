// Pilot-3 item 2 on the real migrations: which presentations pharmacies report.
// Professionals (coordination, centrale, hospital) see each product with a count, '<3' below 3,
// never an organisation. The public sees product names only, once « confirmée » on real data.

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { as, createTestDatabase } from './harness';

const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

const MOL = id(0x100);
const SYRUP = id(0x200);
const TABLET = id(0x201);
const UNREPORTED = id(0x202);

type Key = 'p1' | 'p2' | 'p3' | 'p4' | 'coordinator' | 'central' | 'hospital' | 'wholesaler' | 'prescriber';
const KEYS: Key[] = ['p1', 'p2', 'p3', 'p4', 'coordinator', 'central', 'hospital', 'wholesaler', 'prescriber'];
const ORG = Object.fromEntries(KEYS.map((k, i) => [k, id(0xa0 + i)])) as Record<Key, string>;
const USER = Object.fromEntries(KEYS.map((k, i) => [k, id(0x1a0 + i)])) as Record<Key, string>;
const user = (k: Key) => ({ kind: 'user' as const, userId: USER[k] });
const anon = { kind: 'anon' as const };
const service = { kind: 'service' as const };

let db: PGlite;

async function setSignal(level: string, origins: string[]) {
  await db.query(`delete from public.signals where molecule_id = $1`, [MOL]);
  await db.query(
    `insert into public.signals (molecule_id, level, since, rule, evidence) values ($1, $2, now() - interval '1 day', 'confirmed_threshold', $3)`,
    [MOL, level, JSON.stringify({ origins })],
  );
}

beforeAll(async () => {
  db = await createTestDatabase();
  await db.query(`insert into public.molecules (id, name) values ($1, 'LEVETIRACETAM')`, [MOL]);
  await db.query(
    `insert into public.medicines (id, code_pct, label, brand, dci, molecule_id, source) values
       ($1, '900001', 'EPITAM 100MG/ML SOL BUV FL 300ML', 'EPITAM', 'LEVETIRACETAM', $4, 'test'),
       ($2, '900002', 'KEPPRA 500MG COMP. PELL. BT 60', 'KEPPRA', 'LEVETIRACETAM', $4, 'test'),
       ($3, '900003', 'LEVETAM 1000MG COMP. PELL. BT 30', 'LEVETAM', 'LEVETIRACETAM', $4, 'test')`,
    [SYRUP, TABLET, UNREPORTED, MOL],
  );
  const orgs: [Key, string, string, string][] = [
    ['p1', 'pharmacy', 'TN-11', 'pharmacist'],
    ['p2', 'pharmacy', 'TN-11', 'pharmacist'],
    ['p3', 'pharmacy', 'TN-61', 'pharmacist'],
    ['p4', 'pharmacy', 'TN-61', 'pharmacist'],
    ['coordinator', 'coordinator', 'TN-11', 'coordinator'],
    ['central', 'central_pharmacy', 'TN-11', 'central_buyer'],
    ['hospital', 'hospital_pharmacy', 'TN-51', 'hospital_pharmacist'],
    ['wholesaler', 'wholesaler', 'TN-13', 'wholesaler'],
    ['prescriber', 'prescriber', 'TN-11', 'prescriber'],
  ];
  for (const [k, type, gov, role] of orgs) {
    await db.query(
      `insert into public.organisations (id, type, display_name, governorate_code, origin) values ($1, $2, $3, $4, 'tester')`,
      [ORG[k], type, `Organisation ${k}`, gov],
    );
    await db.query(`insert into auth.users (id) values ($1)`, [USER[k]]);
    await db.query(`insert into public.profiles (user_id, organisation_id, role) values ($1, $2, $3)`, [USER[k], ORG[k], role]);
  }
  const report = (org: string, gov: string, medicine: string | null, kind = 'not_delivered', daysAgo = 1) =>
    db.query(
      `insert into public.reports (organisation_id, governorate_code, molecule_id, medicine_id, kind, ordered_at, reported_at, origin)
       values ($1, $2, $3, $4, $5::public.report_kind, case when $5 = 'not_delivered' then now() - make_interval(days => $6 + 4) end,
               now() - make_interval(days => $6), 'tester')`,
      [org, gov, MOL, medicine, kind, daysAgo],
    );
  // The syrup: three pharmacies (one twice). The tablet: one pharmacy. Ignored: a report with
  // no product, a report older than 14 days, a « livré à nouveau ».
  await report(ORG.p1, 'TN-11', SYRUP);
  await report(ORG.p1, 'TN-11', SYRUP);
  await report(ORG.p2, 'TN-11', SYRUP);
  await report(ORG.p3, 'TN-61', SYRUP);
  await report(ORG.p4, 'TN-61', TABLET);
  await report(ORG.p4, 'TN-61', null);
  await report(ORG.p2, 'TN-11', UNREPORTED, 'not_delivered', 20);
  await report(ORG.p3, 'TN-61', UNREPORTED, 'delivered_again');
}, 120_000);

const reported = (who: Parameters<typeof as>[1]) =>
  as(db, who, (tx) => tx.query<Record<string, unknown>>(`select * from public.presentations_reported($1)`, [MOL]));

describe('presentations_reported (professionals)', () => {
  it('lists each reported product with its pharmacies, <3 below 3, most reported first', async () => {
    const { rows } = await reported(user('coordinator'));
    expect(rows).toEqual([
      { medicine_id: SYRUP, label: 'EPITAM 100MG/ML SOL BUV FL 300ML', brand: 'EPITAM', pharmacies: 3 },
      { medicine_id: TABLET, label: 'KEPPRA 500MG COMP. PELL. BT 60', brand: 'KEPPRA', pharmacies: '<3' },
    ]);
  });

  it('returns no organisation, governorate or time', async () => {
    const { rows } = await reported(user('central'));
    for (const row of rows) expect(Object.keys(row).sort()).toEqual(['brand', 'label', 'medicine_id', 'pharmacies']);
    expect(JSON.stringify(rows)).not.toMatch(/Organisation|TN-|0000000000a/);
  });

  it('is open to the coordination unit, the centrale, hospitals and the service role', async () => {
    for (const k of ['coordinator', 'central', 'hospital'] as const) expect((await reported(user(k))).rows).toHaveLength(2);
    expect((await reported(service)).rows).toHaveLength(2);
  });

  it('refuses pharmacies, wholesalers, prescribers and anonymous visitors', async () => {
    for (const k of ['p1', 'wholesaler', 'prescriber'] as const) await expect(reported(user(k))).rejects.toThrow(/not allowed/);
    await expect(reported(anon)).rejects.toThrow(/permission denied/);
  });
});

describe('presentations_reported_public', () => {
  const shown = () =>
    as(db, anon, (tx) => tx.query<Record<string, unknown>>(`select * from public.presentations_reported_public($1)`, [MOL]));

  it('shows nothing below « confirmée »', async () => {
    await setSignal('likely', ['tester']);
    expect((await shown()).rows).toEqual([]);
  });

  it('shows nothing when the confirmed level comes from simulated data', async () => {
    await setSignal('confirmed', ['simulated', 'tester']);
    expect((await shown()).rows).toEqual([]);
  });

  it('shows product names only, no counts, once confirmed on real data', async () => {
    await setSignal('confirmed', ['tester']);
    const { rows } = await shown();
    expect(rows).toEqual([
      { medicine_id: SYRUP, label: 'EPITAM 100MG/ML SOL BUV FL 300ML', brand: 'EPITAM' },
      { medicine_id: TABLET, label: 'KEPPRA 500MG COMP. PELL. BT 60', brand: 'KEPPRA' },
    ]);
  });
});
