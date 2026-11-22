// Availability requests and answers (migration 0010), on the real migrations: who can read
// what, the 24-hour limit per device, and what the public and the coordination unit receive.

import type { PGlite, Transaction } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, asCommitted, createTestDatabase } from './harness';

const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const MOL = id(0x200);
const MOL2 = id(0x201);
const MED = id(0x300);
const MED_OTHER = id(0x301);
const ORG = {
  yesShown: id(0xa1), // Tunis: available, shows itself
  yesHidden: id(0xa2), // Tunis: available, stays hidden
  no: id(0xa3), // Tunis: unavailable, chose to show itself (must still never appear)
  silent: id(0xa4), // Tunis: does not answer
  sfax: id(0xa5), // Sfax: not routed Tunis requests
  tester: id(0xa6), // Tunis, tester origin
  coordinator: id(0xd1),
  wholesaler: id(0xb1),
  hospital: id(0xc1),
};
const NAMES: Record<string, string> = {
  [ORG.yesShown]: 'Pharmacie dispo visible',
  [ORG.yesHidden]: 'Pharmacie dispo cachée',
  [ORG.no]: 'Pharmacie pas dispo',
  [ORG.silent]: 'Pharmacie silencieuse',
  [ORG.sfax]: 'Pharmacie Sfax',
  [ORG.tester]: 'Pharmacie testeuse',
  [ORG.coordinator]: 'Coordination',
  [ORG.wholesaler]: 'Grossiste',
  [ORG.hospital]: 'Hôpital',
};
const USER: Record<keyof typeof ORG, string> = {
  yesShown: id(0x1a1),
  yesHidden: id(0x1a2),
  no: id(0x1a3),
  silent: id(0x1a4),
  sfax: id(0x1a5),
  tester: id(0x1a6),
  coordinator: id(0x1d1),
  wholesaler: id(0x1b1),
  hospital: id(0x1c1),
};
const user = (k: keyof typeof ORG) => ({ kind: 'user' as const, userId: USER[k] });
const service = { kind: 'service' as const };
const anon = { kind: 'anon' as const };
const hash = (n: number) => n.toString(16).padStart(64, '0');

let db: PGlite;

async function createRequest(
  tx: Transaction,
  { molecule = MOL, medicine = null as string | null, gov = 'TN-11', device = hash(1), origin = 'simulated' } = {},
): Promise<string> {
  const { rows } = await tx.query<{ id: string }>(
    `select public.create_availability_request($1, $2, $3, null, $4, $5::public.data_origin) as id`,
    [molecule, medicine, gov, device, origin],
  );
  return rows[0].id;
}

async function answer(k: keyof typeof ORG, request: string, value: 'available' | 'unavailable', show: boolean) {
  const origin = k === 'tester' ? 'tester' : 'simulated';
  await asCommitted(db, user(k), (tx) =>
    tx.query(
      `insert into public.availability_answers (request_id, organisation_id, answer, show_identity, origin) values ($1, $2, $3, $4, $5)`,
      [request, ORG[k], value, show, origin],
    ),
  );
}

async function errorOf(p: Promise<unknown>): Promise<{ code?: string; message: string } | null> {
  try {
    await p;
    return null;
  } catch (error) {
    return error as { code?: string; message: string };
  }
}

beforeAll(async () => {
  db = await createTestDatabase({ defaultGrants: false });
  await db.query(`insert into public.molecules (id, name) values ($1, 'LEVETIRACETAM'), ($2, 'LEVOTHYROXINE')`, [MOL, MOL2]);
  await db.query(
    `insert into public.medicines (id, code_pct, label, brand, dci, molecule_id, source)
     values ($1, '900001', 'KEPPRA 500 MG CP', 'KEPPRA', 'LEVETIRACETAM', $2, 'test'),
            ($3, '900002', 'LEVOTHYROX 50', 'LEVOTHYROX', 'LEVOTHYROXINE', $4, 'test')`,
    [MED, MOL, MED_OTHER, MOL2],
  );
  const orgs: [keyof typeof ORG, string, string, string][] = [
    ['yesShown', 'pharmacy', 'TN-11', 'simulated'],
    ['yesHidden', 'pharmacy', 'TN-11', 'simulated'],
    ['no', 'pharmacy', 'TN-11', 'simulated'],
    ['silent', 'pharmacy', 'TN-11', 'simulated'],
    ['sfax', 'pharmacy', 'TN-61', 'simulated'],
    ['tester', 'pharmacy', 'TN-11', 'tester'],
    ['coordinator', 'coordinator', 'TN-11', 'simulated'],
    ['wholesaler', 'wholesaler', 'TN-13', 'simulated'],
    ['hospital', 'hospital_pharmacy', 'TN-51', 'simulated'],
  ];
  for (const [k, type, gov, origin] of orgs) {
    await db.query(
      `insert into public.organisations (id, type, display_name, governorate_code, origin, latitude, longitude, public_address)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [ORG[k], type, NAMES[ORG[k]], gov, origin, 36.8, 10.18, `Adresse fictive ${k}`],
    );
    await db.query(`insert into auth.users (id) values ($1)`, [USER[k]]);
    await db.query(`insert into public.profiles (user_id, organisation_id, role) values ($1, $2, $3)`, [
      USER[k],
      ORG[k],
      type === 'pharmacy' ? 'pharmacist' : type === 'coordinator' ? 'coordinator' : type === 'wholesaler' ? 'wholesaler' : 'hospital_pharmacist',
    ]);
  }
});

afterAll(async () => {
  await db.close();
});

describe('creating a request', () => {
  it('only our server (service role) can create one; visitors and pharmacies cannot', async () => {
    for (const caller of [anon, user('yesShown')]) {
      const err = await errorOf(as(db, caller, (tx) => createRequest(tx)));
      expect(err?.message).toMatch(/permission denied/);
    }
    const requestId = await as(db, service, (tx) => createRequest(tx));
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('stores the molecule, presentation, governorate, time and a three-hour expiry, nothing else', async () => {
    const row = await as(db, service, async (tx) => {
      const requestId = await createRequest(tx, { medicine: MED });
      const { rows } = await tx.query<Record<string, unknown>>(`select * from public.availability_requests where id = $1`, [requestId]);
      return rows[0];
    });
    expect(Object.keys(row).sort()).toEqual(
      ['created_at', 'delegation', 'device_hash', 'expires_at', 'governorate_code', 'id', 'medicine_id', 'molecule_id', 'origin'].sort(),
    );
    expect((row.expires_at as Date).getTime() - (row.created_at as Date).getTime()).toBe(3 * 3_600_000);
  });

  it('refuses a second request for the same molecule from the same device within 24 hours', async () => {
    await asCommitted(db, service, (tx) => createRequest(tx, { device: hash(42) }));
    const err = await errorOf(as(db, service, (tx) => createRequest(tx, { device: hash(42) })));
    expect(err?.code).toBe('RW429');
    // Another molecule, or another device, is fine.
    await as(db, service, async (tx) => {
      await createRequest(tx, { device: hash(42), molecule: MOL2 });
      await createRequest(tx, { device: hash(43) });
    });
  });

  it('accepts the same device again after 24 hours', async () => {
    await as(db, service, async (tx) => {
      await tx.query(
        `insert into public.availability_requests (molecule_id, governorate_code, created_at, expires_at, device_hash, origin)
         values ($1, 'TN-11', now() - interval '25 hours', now() - interval '22 hours', $2, 'simulated')`,
        [MOL, hash(44)],
      );
      await createRequest(tx, { device: hash(44) });
    });
  });

  it('refuses a presentation of another molecule, a malformed device hash and an official origin', async () => {
    await as(db, service, async (tx) => {
      expect((await errorOf(createRequest(tx, { medicine: MED_OTHER })))?.code).toBe('22023');
    });
    await as(db, service, async (tx) => {
      expect((await errorOf(createRequest(tx, { device: 'not-a-hash' })))?.code).toBe('23514');
    });
    await as(db, service, async (tx) => {
      expect((await errorOf(createRequest(tx, { origin: 'official_source' })))?.code).toBe('22023');
    });
  });
});

describe('what a pharmacy sees', () => {
  let requestId: string;
  beforeAll(async () => {
    requestId = await asCommitted(db, service, (tx) => createRequest(tx, { device: hash(100), medicine: MED }));
  });

  it('cannot read availability_requests directly, so never a device hash', async () => {
    const err = await errorOf(as(db, user('yesShown'), (tx) => tx.query(`select device_hash from public.availability_requests`)));
    expect(err?.message).toMatch(/permission denied/);
  });

  it('requests_for_my_pharmacy lists open requests of its governorate, without any device hash', async () => {
    const rows = await as(db, user('silent'), async (tx) => (await tx.query<Record<string, unknown>>(`select * from public.requests_for_my_pharmacy()`)).rows);
    const mine = rows.find((r) => r.request_id === requestId);
    expect(mine).toMatchObject({ molecule_name: 'LEVETIRACETAM', medicine_label: 'KEPPRA 500 MG CP' });
    for (const r of rows) {
      expect(Object.keys(r)).not.toContain('device_hash');
      expect(JSON.stringify(r)).not.toContain(hash(100));
    }
  });

  it('a pharmacy of another governorate is not asked', async () => {
    const rows = await as(db, user('sfax'), async (tx) => (await tx.query<{ request_id: string }>(`select request_id from public.requests_for_my_pharmacy()`)).rows);
    expect(rows.map((r) => r.request_id)).not.toContain(requestId);
  });

  it('other roles and visitors cannot call it', async () => {
    for (const caller of [user('coordinator'), user('wholesaler')]) {
      expect((await errorOf(as(db, caller, (tx) => tx.query(`select * from public.requests_for_my_pharmacy()`))))?.code).toBe('42501');
    }
    expect((await errorOf(as(db, anon, (tx) => tx.query(`select * from public.requests_for_my_pharmacy()`))))?.message).toMatch(/permission denied/);
  });

  it('answers once, then the request leaves its list', async () => {
    await answer('silent', requestId, 'unavailable', false);
    const rows = await as(db, user('silent'), async (tx) => (await tx.query<{ request_id: string }>(`select request_id from public.requests_for_my_pharmacy()`)).rows);
    expect(rows.map((r) => r.request_id)).not.toContain(requestId);
    expect((await errorOf(answer('silent', requestId, 'available', true)))?.code).toBe('23505');
  });

  it('cannot answer for another pharmacy, for another governorate, with another origin, or set the time', async () => {
    const insert = (k: keyof typeof ORG, org: string, origin = 'simulated', extra = '') =>
      as(db, user(k), (tx) =>
        tx.query(
          `insert into public.availability_answers (request_id, organisation_id, answer, show_identity, origin${extra ? ', answered_at' : ''})
           values ($1, $2, 'available', true, $3${extra ? `, ${extra}` : ''})`,
          [requestId, org, origin],
        ),
      );
    expect((await errorOf(insert('yesHidden', ORG.no)))?.message).toMatch(/row-level security/);
    expect((await errorOf(insert('sfax', ORG.sfax)))?.message).toMatch(/row-level security/);
    expect((await errorOf(insert('tester', ORG.tester, 'simulated')))?.message).toMatch(/row-level security/);
    expect((await errorOf(insert('yesHidden', ORG.yesHidden, 'simulated', `now() - interval '1 day'`)))?.message).toMatch(/permission denied/);
    expect((await errorOf(insert('coordinator', ORG.coordinator)))?.message).toMatch(/row-level security/);
  });

  it('cannot answer an expired request', async () => {
    const expired = await asCommitted(db, service, async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.availability_requests (molecule_id, governorate_code, created_at, expires_at, device_hash, origin)
         values ($1, 'TN-11', now() - interval '4 hours', now() - interval '1 hour', $2, 'simulated') returning id`,
        [MOL, hash(101)],
      );
      return rows[0].id;
    });
    expect((await errorOf(answer('yesShown', expired, 'available', true)))?.message).toMatch(/row-level security/);
  });

  it("reads its own answers only, never another pharmacy's", async () => {
    await answer('no', requestId, 'unavailable', true);
    const rows = await as(db, user('silent'), async (tx) => (await tx.query<{ organisation_id: string }>(`select organisation_id from public.availability_answers`)).rows);
    expect(rows.map((r) => r.organisation_id)).toEqual([ORG.silent]);
  });
});

describe('what the patient sees', () => {
  let requestId: string;
  beforeAll(async () => {
    requestId = await asCommitted(db, service, (tx) => createRequest(tx, { device: hash(200) }));
    await answer('yesShown', requestId, 'available', true);
    await answer('yesHidden', requestId, 'available', false);
    await answer('no', requestId, 'unavailable', true);
    await answer('tester', requestId, 'available', true);
  });

  const publicAnswers = (caller: typeof anon | ReturnType<typeof user>, rid = requestId) =>
    as(db, caller, async (tx) => (await tx.query<{ r: Record<string, unknown> | null }>(`select public.request_answers_public($1) as r`, [rid])).rows[0].r);

  it('shows only pharmacies that said yes and chose to show themselves', async () => {
    const r = await publicAnswers(anon);
    const shown = r!.available as Record<string, unknown>[];
    expect(shown.map((a) => a.display_name).sort()).toEqual([NAMES[ORG.tester], NAMES[ORG.yesShown]].sort());
    expect(shown[0]).toEqual(
      expect.objectContaining({ latitude: 36.8, longitude: 10.18, public_address: expect.any(String), origin: expect.any(String) }),
    );
    const text = JSON.stringify(r);
    for (const hidden of [ORG.yesHidden, ORG.no, ORG.silent, ORG.sfax]) {
      expect(text).not.toContain(NAMES[hidden]);
      expect(text).not.toContain(hidden);
    }
    expect(text).not.toContain(ORG.yesShown); // names, not ids
    expect(text).not.toContain(hash(200));
  });

  it('gives how many pharmacies were asked and answered, small counts as <3', async () => {
    const r = await publicAnswers(anon);
    // Five pharmacies in Tunis were asked (Sfax was not); four answered.
    expect(r).toMatchObject({ asked: '5', answered: '4' });
    const fresh = await asCommitted(db, service, (tx) => createRequest(tx, { device: hash(201) }));
    await answer('no', fresh, 'unavailable', false);
    expect(await publicAnswers(anon, fresh)).toMatchObject({ answered: '<3', available: [] });
  });

  it('returns nothing for an unknown request', async () => {
    expect(await publicAnswers(anon, id(0xdead))).toBeNull();
  });
});

describe('demand by governorate', () => {
  beforeAll(async () => {
    // A separate molecule, so earlier tests do not change these counts.
    await asCommitted(db, service, async (tx) => {
      for (let i = 0; i < 4; i++) await createRequest(tx, { molecule: MOL2, device: hash(300 + i) });
      await createRequest(tx, { molecule: MOL2, gov: 'TN-61', device: hash(310) });
    });
    const first = await as(db, service, async (tx) =>
      (await tx.query<{ id: string }>(`select id from public.availability_requests where molecule_id = $1 and governorate_code = 'TN-11' order by created_at limit 1`, [MOL2])).rows[0].id,
    );
    await answer('yesShown', first, 'available', true);
  });

  const demand = (caller: Parameters<typeof as>[1]) =>
    as(db, caller, async (tx) => (await tx.query<Record<string, string>>(`select * from public.demand_by_governorate($1, 7)`, [MOL2])).rows);

  it('gives coordinators, wholesalers and hospital pharmacies counts, small counts as <3', async () => {
    for (const k of ['coordinator', 'wholesaler', 'hospital'] as const) {
      expect(await demand(user(k))).toEqual([
        { governorate_code: 'TN-11', requests: '4', answered: '<3', unanswered: '3' },
        { governorate_code: 'TN-61', requests: '<3', answered: '0', unanswered: '<3' },
      ]);
    }
  });

  it('is refused to pharmacies and visitors', async () => {
    expect((await errorOf(demand(user('yesShown'))))?.code).toBe('42501');
    expect((await errorOf(demand(anon)))?.message).toMatch(/permission denied/);
  });
});
