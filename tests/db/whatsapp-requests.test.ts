// Patients' requests over WhatsApp (migration 0020), on the real migrations. The bot runs with
// the service role, so requests_for_pharmacy and answer_request_as must apply the web's rule
// themselves: the pharmacy's own governorate, an open request, one answer, its own origin.

import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, asCommitted, createTestDatabase } from './harness';

const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const MOL = id(0x400);
const ORG = { tunis: id(0xa1), tunisTester: id(0xa2), sfax: id(0xa3), wholesaler: id(0xb1) };
const USER = { tunis: id(0x1a1) };
const REQ = { open: id(0x501), openOther: id(0x502), expired: id(0x503), sfax: id(0x504) };
const service = { kind: 'service' as const };
const anon = { kind: 'anon' as const };
const pharmacist = { kind: 'user' as const, userId: USER.tunis };
type Caller = typeof service | typeof anon | typeof pharmacist;

let db: PGlite;

async function errorOf(p: Promise<unknown>) {
  try {
    await p;
    return null;
  } catch (error) {
    return error as { code?: string; message: string };
  }
}

const requestsFor = (caller: Caller, org: string) =>
  as(db, caller, async (tx) => (await tx.query<{ request_id: string }>('select * from public.requests_for_pharmacy($1)', [org])).rows);

const answer = (org: string, request: string, value: 'available' | 'unavailable', show: boolean, caller: Caller = service) =>
  asCommitted(db, caller, async (tx) => {
    const { rows } = await tx.query<{ r: string }>('select public.answer_request_as($1, $2, $3::public.availability_answer, $4) as r', [
      org,
      request,
      value,
      show,
    ]);
    const stored = await tx.query(
      'select answer, show_identity, origin from public.availability_answers where request_id = $1 and organisation_id = $2',
      [request, org],
    );
    return { result: rows[0].r, stored: stored.rows };
  });

beforeAll(async () => {
  db = await createTestDatabase({ defaultGrants: false });
  await db.query(`insert into public.molecules (id, name) values ($1, 'AMLODIPINE')`, [MOL]);
  await db.query(
    `insert into public.organisations (id, type, display_name, governorate_code, origin) values
       ($1, 'pharmacy', 'Pharmacie démo Tunis', 'TN-11', 'simulated'),
       ($2, 'pharmacy', 'Pharmacie testeuse Tunis', 'TN-11', 'tester'),
       ($3, 'pharmacy', 'Pharmacie démo Sfax', 'TN-61', 'simulated'),
       ($4, 'wholesaler', 'Grossiste démo', 'TN-11', 'simulated')`,
    [ORG.tunis, ORG.tunisTester, ORG.sfax, ORG.wholesaler],
  );
  await db.query('insert into auth.users (id) values ($1)', [USER.tunis]);
  await db.query(`insert into public.profiles (user_id, organisation_id, role) values ($1, $2, 'pharmacist')`, [USER.tunis, ORG.tunis]);
  const request = (rid: string, gov: string, created: string, expires: string, n: number) =>
    db.query(
      `insert into public.availability_requests (id, molecule_id, governorate_code, created_at, expires_at, device_hash, origin)
       values ($1, $2, $3, now() + $4::interval, now() + $4::interval + interval '3 hours', $5, 'simulated')`,
      [rid, MOL, gov, created, n.toString(16).padStart(64, '0')],
    );
  await request(REQ.open, 'TN-11', '-30 minutes', '', 1);
  await request(REQ.openOther, 'TN-11', '-10 minutes', '', 2);
  await request(REQ.expired, 'TN-11', '-4 hours', '', 3);
  await request(REQ.sfax, 'TN-61', '-5 minutes', '', 4);
});

afterAll(async () => {
  await db.close();
});

describe('requests_for_pharmacy', () => {
  it("lists the open requests of the pharmacy's governorate, oldest first", async () => {
    expect((await requestsFor(service, ORG.tunis)).map((r) => r.request_id)).toEqual([REQ.open, REQ.openOther]);
    expect((await requestsFor(service, ORG.sfax)).map((r) => r.request_id)).toEqual([REQ.sfax]);
  });

  it('never returns the device hash', async () => {
    const { fields } = await as(db, service, (tx) => tx.query('select * from public.requests_for_pharmacy($1)', [ORG.tunis]));
    expect(fields.map((f) => f.name)).not.toContain('device_hash');
  });

  it('refuses an organisation that is not a pharmacy', async () => {
    expect((await errorOf(requestsFor(service, ORG.wholesaler)))?.message).toMatch(/pharmacies only/);
  });

  it('is for the service role only', async () => {
    expect((await errorOf(requestsFor(anon, ORG.tunis)))?.message).toMatch(/permission denied/);
    expect((await errorOf(requestsFor(pharmacist, ORG.tunis)))?.message).toMatch(/permission denied/);
  });
});

describe('answer_request_as', () => {
  it("records the answer with the pharmacy's own origin, once", async () => {
    expect(await answer(ORG.tunis, REQ.open, 'available', true)).toEqual({
      result: 'answered',
      stored: [{ answer: 'available', show_identity: true, origin: 'simulated' }],
    });
    expect((await answer(ORG.tunis, REQ.open, 'unavailable', false)).result).toBe('already');
    expect((await answer(ORG.tunisTester, REQ.open, 'available', false)).stored).toEqual([
      { answer: 'available', show_identity: false, origin: 'tester' },
    ]);
  });

  it('never shows a pharmacy that answered "pas disponible"', async () => {
    expect((await answer(ORG.tunis, REQ.openOther, 'unavailable', true)).stored).toEqual([
      { answer: 'unavailable', show_identity: false, origin: 'simulated' },
    ]);
  });

  it('says when the request has closed, and stores nothing', async () => {
    expect(await answer(ORG.tunis, REQ.expired, 'available', true)).toEqual({ result: 'expired', stored: [] });
  });

  it('refuses a request from another governorate, and a non-pharmacy', async () => {
    expect((await errorOf(answer(ORG.tunis, REQ.sfax, 'available', true)))?.message).toMatch(/not routed/);
    expect((await errorOf(answer(ORG.wholesaler, REQ.open, 'available', true)))?.message).toMatch(/pharmacies only/);
  });

  it('is for the service role only', async () => {
    expect((await errorOf(answer(ORG.tunis, REQ.openOther, 'available', true, anon)))?.message).toMatch(/permission denied/);
    expect((await errorOf(answer(ORG.tunis, REQ.openOther, 'available', true, pharmacist)))?.message).toMatch(/permission denied/);
  });

  it('the web list (requests_for_my_pharmacy) reads through the same rule', async () => {
    // Tunis has answered both open requests above; Sfax and the expired one were never listed.
    const rows = await as(
      db,
      pharmacist,
      async (tx) => (await tx.query<{ request_id: string }>('select * from public.requests_for_my_pharmacy()')).rows,
    );
    expect(rows).toEqual([]);
  });
});
