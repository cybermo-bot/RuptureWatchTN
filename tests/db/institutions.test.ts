// Session 5, part 5: the institutions' spaces, on the real migrations.
// The centrale announces an arrival only for a medicine at "probable" or "confirmée", and the
// level never moves; the public sees it only while "confirmée". The Ordre writes to the
// pharmacies of chosen governorates, and only they read it; it reads no report and no
// pharmacy name. The network and the ministry's daily figures go to the named roles only.

import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, asCommitted, createTestDatabase } from './harness';

const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const MOL = { confirmed: id(0x301), likely: id(0x302), watch: id(0x303) };
const ORG = {
  central: id(0xf1),
  order: id(0xf2),
  coordinator: id(0xd1),
  wholesaler: id(0xb1),
  tunis1: id(0xa1),
  tunis2: id(0xa2),
  sfax: id(0xa3),
  sousse: id(0xa4),
  centralTester: id(0xf3),
};
type Key = keyof typeof ORG;
const USER = Object.fromEntries(Object.entries(ORG).map(([k, v]) => [k, v.replace(/^0{8}/, '11111111')])) as Record<Key, string>;
const user = (k: Key) => ({ kind: 'user' as const, userId: USER[k] });

let db: PGlite;

async function errorOf(p: Promise<unknown>): Promise<{ message: string; code?: string } | null> {
  try {
    await p;
    return null;
  } catch (error) {
    return error as { message: string; code?: string };
  }
}

const tunisToday = () => new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
const inDays = (d: number) => new Date(Date.now() + 3_600_000 + d * 86_400_000).toISOString().slice(0, 10);

const announce = (k: Key, molecule: string, on: string, quantity = 'one_to_three_months') =>
  asCommitted(db, user(k), (tx) => tx.query(`select public.announce_arrival($1, $2, $3)`, [molecule, on, quantity]));

const send = (k: Key, body: string, governorates: string[]) =>
  asCommitted(db, user(k), (tx) =>
    tx.query(`insert into public.order_messages (body, governorate_codes) values ($1, $2)`, [body, governorates]),
  );

const messagesFor = (k: Key) =>
  as(db, user(k), async (tx) => ({
    table: (await tx.query<{ body: string }>(`select body from public.order_messages order by sent_at`)).rows.map((r) => r.body),
    fn: (await tx.query<{ body: string; sender_name: string }>(`select body, sender_name from public.order_messages_for_me(20)`)).rows,
  }));

beforeAll(async () => {
  db = await createTestDatabase({ defaultGrants: false });
  for (const [k, m] of Object.entries(MOL)) await db.query(`insert into public.molecules (id, name) values ($1, $2)`, [m, k.toUpperCase()]);
  for (const [k, level] of [['confirmed', 'confirmed'], ['likely', 'likely'], ['watch', 'watch']] as const) {
    await db.query(
      `insert into public.signals (molecule_id, level, since, rule, evidence) values ($1, $2, now() - interval '3 days', 'confirmed_threshold', '{}'::jsonb)`,
      [MOL[k], level],
    );
  }
  const orgs: [Key, string, string, string, string][] = [
    ['central', 'central_pharmacy', 'TN-11', 'simulated', 'central_buyer'],
    ['centralTester', 'central_pharmacy', 'TN-11', 'tester', 'central_buyer'],
    ['order', 'pharmacists_order', 'TN-61', 'simulated', 'order_council'],
    ['coordinator', 'coordinator', 'TN-11', 'simulated', 'coordinator'],
    ['wholesaler', 'wholesaler', 'TN-13', 'simulated', 'wholesaler'],
    ['tunis1', 'pharmacy', 'TN-11', 'simulated', 'pharmacist'],
    ['tunis2', 'pharmacy', 'TN-11', 'tester', 'pharmacist'],
    ['sfax', 'pharmacy', 'TN-61', 'simulated', 'pharmacist'],
    ['sousse', 'pharmacy', 'TN-51', 'simulated', 'pharmacist'],
  ];
  for (const [k, type, gov, origin, role] of orgs) {
    await db.query(
      `insert into public.organisations (id, type, display_name, governorate_code, origin) values ($1, $2, $3, $4, $5)`,
      [ORG[k], type, `Organisation ${k}`, gov, origin],
    );
    await db.query(`insert into auth.users (id, last_sign_in_at) values ($1, now() - interval '2 days')`, [USER[k]]);
    await db.query(`insert into public.profiles (user_id, organisation_id, role) values ($1, $2, $3)`, [USER[k], ORG[k], role]);
  }
  // Three reports: Tunis 1 (twice) and Sfax, all on the confirmed medicine.
  for (const [k, gov] of [['tunis1', 'TN-11'], ['tunis1', 'TN-11'], ['sfax', 'TN-61']] as const) {
    await db.query(
      `insert into public.reports (organisation_id, governorate_code, molecule_id, kind, ordered_at, reported_at, origin)
       values ($1, $2, $3, 'not_delivered', now() - interval '5 days', now() - interval '1 day', 'simulated')`,
      [ORG[k], gov, MOL.confirmed],
    );
  }
});

afterAll(async () => {
  await db.close();
});

describe('arrival announcements (Pharmacie centrale)', () => {
  it('the centrale announces for "confirmée" and "probable"; organisation, level and origin come from the database', async () => {
    await announce('central', MOL.confirmed, inDays(10));
    await announce('centralTester', MOL.likely, inDays(20), 'under_one_month');
    const { rows } = await db.query<{ molecule_id: string; organisation_id: string; level_at_announcement: string; origin: string }>(
      `select molecule_id, organisation_id, level_at_announcement, origin from public.arrival_announcements order by announced_at`,
    );
    expect(rows).toEqual([
      { molecule_id: MOL.confirmed, organisation_id: ORG.central, level_at_announcement: 'confirmed', origin: 'simulated' },
      { molecule_id: MOL.likely, organisation_id: ORG.centralTester, level_at_announcement: 'likely', origin: 'tester' },
    ]);
  });

  it('never below "probable", never in the past or more than a year ahead', async () => {
    expect((await errorOf(announce('central', MOL.watch, inDays(5))))?.message).toMatch(/not at/);
    expect((await errorOf(announce('central', id(0x399), inDays(5))))?.message).toMatch(/not at/);
    expect((await errorOf(announce('central', MOL.confirmed, inDays(-2))))?.message).toMatch(/out of range/);
    expect((await errorOf(announce('central', MOL.confirmed, inDays(400))))?.message).toMatch(/out of range/);
    expect(await errorOf(announce('central', MOL.confirmed, tunisToday()))).toBeNull();
  });

  it('only the centrale announces, and nobody writes the table directly', async () => {
    for (const k of ['coordinator', 'wholesaler', 'tunis1', 'order'] as const) {
      expect((await errorOf(announce(k, MOL.confirmed, inDays(10))))?.message).toMatch(/not allowed/);
    }
    const direct = await errorOf(
      asCommitted(db, user('central'), (tx) =>
        tx.query(
          `insert into public.arrival_announcements (molecule_id, organisation_id, expected_on, quantity, level_at_announcement, origin)
           values ($1, $2, $3, 'over_three_months', 'confirmed', 'official_source')`,
          [MOL.confirmed, ORG.central, inDays(3)],
        ),
      ),
    );
    expect(direct?.message).toMatch(/permission denied/);
    expect(await errorOf(as(db, { kind: 'anon' }, (tx) => tx.query(`select * from public.arrival_announcements`)))).not.toBeNull();
  });

  it('an announcement never changes a level', async () => {
    const { rows } = await db.query<{ level: string }>(`select level from public.signals where molecule_id = $1`, [MOL.confirmed]);
    expect(rows[0].level).toBe('confirmed');
    const events = await db.query(`select 1 from public.signal_events`);
    expect(events.rows).toHaveLength(0);
  });

  it('every signed-in role reads them; the public sees only the date and origin, only while "confirmée"', async () => {
    const seen = await as(db, user('tunis1'), async (tx) => (await tx.query(`select id from public.arrival_announcements`)).rows);
    expect(seen.length).toBeGreaterThanOrEqual(3);
    const pub = (m: string) => as(db, { kind: 'anon' }, async (tx) => (await tx.query<Record<string, unknown>>(`select * from public.public_arrival($1)`, [m])).rows);
    const confirmed = await pub(MOL.confirmed);
    expect(confirmed).toHaveLength(1);
    expect(Object.keys(confirmed[0]).sort()).toEqual(['announced_at', 'expected_on', 'origin']);
    expect(await pub(MOL.likely)).toEqual([]);
  });
});

describe('messages from the Ordre des pharmaciens', () => {
  it('the Ordre writes to chosen governorates; organisation and origin come from the database', async () => {
    await send('order', 'Rupture confirmée de la molécule : merci de signaler vos commandes non livrées.', ['TN-11']);
    await send('order', 'Message aux pharmaciens de Sfax et de Sousse uniquement, pour essai.', ['TN-61', 'TN-51']);
    const { rows } = await db.query<{ organisation_id: string; origin: string }>(`select organisation_id, origin from public.order_messages`);
    expect(rows).toEqual([
      { organisation_id: ORG.order, origin: 'simulated' },
      { organisation_id: ORG.order, origin: 'simulated' },
    ]);
  });

  it('a message reaches only the pharmacies of the chosen governorates, with the sender', async () => {
    const tunis = await messagesFor('tunis1');
    expect(tunis.table).toEqual(['Rupture confirmée de la molécule : merci de signaler vos commandes non livrées.']);
    expect(tunis.fn).toEqual([{ body: tunis.table[0], sender_name: 'Organisation order' }]);
    expect((await messagesFor('tunis2')).fn).toHaveLength(1);
    expect((await messagesFor('sfax')).fn.map((m) => m.body)).toEqual(['Message aux pharmaciens de Sfax et de Sousse uniquement, pour essai.']);
    expect((await messagesFor('sousse')).fn).toHaveLength(1);
    for (const k of ['coordinator', 'wholesaler', 'central'] as const) {
      const m = await messagesFor(k);
      expect(m.table).toEqual([]);
      expect(m.fn).toEqual([]);
    }
    expect((await messagesFor('order')).table).toHaveLength(2);
  });

  it('only the Ordre writes, for itself, to real governorates, with a real message', async () => {
    for (const k of ['tunis1', 'coordinator', 'central'] as const) {
      expect((await errorOf(send(k, 'Un message qui ne devrait pas partir.', ['TN-11'])))?.message).toMatch(/row-level security/);
    }
    expect((await errorOf(send('order', 'Un gouvernorat qui n’existe pas.', ['TN-99'])))?.message).toMatch(/row-level security/);
    expect(await errorOf(send('order', 'Court', ['TN-11']))).not.toBeNull();
    expect(await errorOf(send('order', 'Aucun gouvernorat choisi pour ce message.', []))).not.toBeNull();
    const spoof = await errorOf(
      asCommitted(db, user('order'), (tx) =>
        tx.query(`insert into public.order_messages (body, governorate_codes, origin) values ('Origine officielle prétendue.', '{TN-11}', 'official_source')`),
      ),
    );
    expect(spoof?.message).toMatch(/permission denied/);
  });

  it('the Ordre reads no report, no pharmacy and no governorate count', async () => {
    const reports = await as(db, user('order'), async (tx) => (await tx.query(`select id from public.reports`)).rows);
    expect(reports).toEqual([]);
    const orgs = await as(db, user('order'), async (tx) => (await tx.query<{ id: string }>(`select id from public.organisations`)).rows);
    expect(orgs.map((o) => o.id)).toEqual([ORG.order]);
    const counts = await errorOf(as(db, user('order'), (tx) => tx.query(`select * from public.governorate_counts($1)`, [MOL.confirmed])));
    expect(counts?.message).toMatch(/not allowed/);
  });
});

describe('the network and the ministry’s daily figures', () => {
  it('the Ordre and the ministry see members by governorate, "<3" below three, origins national', async () => {
    for (const k of ['order', 'coordinator'] as const) {
      const rows = await as(db, user(k), async (tx) =>
        (await tx.query<{ governorate_code: string; members: string; active: string; origins: string[] }>(`select governorate_code, members, active, origins::text[] as origins from public.pharmacy_network(30)`)).rows,
      );
      expect(rows.map((r) => [r.governorate_code, r.members, r.active])).toEqual([
        ['TN-11', '<3', '<3'],
        ['TN-51', '<3', '<3'],
        ['TN-61', '<3', '<3'],
      ]);
      expect(rows.every((r) => JSON.stringify(r.origins) === JSON.stringify(['tester', 'simulated']))).toBe(true);
      expect(JSON.stringify(rows)).not.toContain('Organisation');
    }
  });

  it('reports per week: one row per week, counts suppressed', async () => {
    const rows = await as(db, user('order'), async (tx) =>
      (await tx.query<{ reports: string; pharmacies: string }>(`select * from public.network_weekly(4)`)).rows,
    );
    expect(rows).toHaveLength(4);
    const total = rows.filter((r) => r.reports !== '0');
    expect(total.length).toBeGreaterThanOrEqual(1);
    expect(total.every((r) => r.pharmacies === '<3')).toBe(true);
  });

  it('daily activity and demand totals go to the ministry only', async () => {
    const rows = await as(db, user('coordinator'), async (tx) =>
      (await tx.query<{ pharmacies: string }>(`select * from public.daily_activity($1, 14)`, [MOL.confirmed])).rows,
    );
    expect(rows).toHaveLength(14);
    expect(rows.filter((r) => r.pharmacies !== '0').map((r) => r.pharmacies)).toEqual(['<3']);
    const totals = await as(db, user('coordinator'), async (tx) => (await tx.query(`select * from public.demand_totals(7)`)).rows);
    expect(totals).toEqual([{ requests: '0', unanswered: '0' }]);
    for (const k of ['order', 'central', 'wholesaler', 'tunis1'] as const) {
      expect((await errorOf(as(db, user(k), (tx) => tx.query(`select * from public.daily_activity(null, 7)`))))?.message).toMatch(/not allowed/);
      expect((await errorOf(as(db, user(k), (tx) => tx.query(`select * from public.demand_totals(7)`))))?.message).toMatch(/not allowed/);
    }
    for (const k of ['central', 'wholesaler', 'tunis1'] as const) {
      expect((await errorOf(as(db, user(k), (tx) => tx.query(`select * from public.pharmacy_network(30)`))))?.message).toMatch(/not allowed/);
      expect((await errorOf(as(db, user(k), (tx) => tx.query(`select * from public.network_weekly(8)`))))?.message).toMatch(/not allowed/);
    }
  });
});
