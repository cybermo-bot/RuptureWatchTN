// Table and function privileges must come from the migrations alone, whatever the
// project's default exposure setting. Newer Supabase projects grant nothing on new
// tables; older ones grant everything. Both must end with exactly this matrix.

import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, createTestDatabase } from './harness';

type Priv = 'select' | 'insert' | 'update' | 'delete';
const ALL: Priv[] = ['select', 'insert', 'update', 'delete'];

// role -> privileges, for each table. Absent role: no privilege.
const TABLES: Record<string, { anon?: Priv[]; authenticated?: Priv[]; service_role: Priv[] }> = {
  system_meta: { anon: ['select'], authenticated: ['select'], service_role: ALL },
  governorates: { anon: ['select'], authenticated: ['select'], service_role: ALL },
  molecules: { anon: ['select'], authenticated: ['select'], service_role: ALL },
  medicines: { anon: ['select'], authenticated: ['select'], service_role: ALL },
  foreign_notices: { anon: ['select'], authenticated: ['select'], service_role: ALL },
  organisations: { authenticated: ['select'], service_role: ALL },
  profiles: { authenticated: ['select'], service_role: ALL },
  followed_molecules: { authenticated: ['select', 'insert', 'delete'], service_role: ALL },
  reports: { authenticated: ['select', 'insert'], service_role: ALL },
  // signals and signal_events: select on the columns without counts only (see below).
  signals: { service_role: ALL },
  signal_events: { service_role: ['select', 'insert', 'delete'] },
  alerts: { authenticated: ['select'], service_role: ALL },
  wa_inbound: { service_role: ALL },
  wa_links: { service_role: ALL },
  wa_link_codes: { service_role: ALL },
  // Requests: no direct access but the service role (functions only).
  availability_requests: { service_role: ALL },
  // Answers: insert is granted on columns only (id and answered_at are set by the database).
  availability_answers: { authenticated: ['select'], service_role: ALL },
  // Track D: insert is granted on columns only (organisation, time and origin come from the database).
  allocation_decisions: { authenticated: ['select'], service_role: ALL },
};

const FUNCTIONS: Record<string, { anon: boolean; authenticated: boolean }> = {
  'public.search_medicines(text)': { anon: true, authenticated: true },
  'public.governorate_counts(uuid, integer, integer, timestamptz)': { anon: false, authenticated: true },
  'public.search_molecules(text)': { anon: true, authenticated: true },
  'public.report_impact(uuid, integer, integer, timestamptz)': { anon: false, authenticated: true },
  'public.apply_signal_evaluation(uuid, signal_level, timestamptz, signal_level, timestamptz, text, jsonb, timestamptz, boolean)': {
    anon: false,
    authenticated: false,
  },
  'public.apply_signal_evaluation(uuid, signal_level, timestamptz, signal_level, timestamptz, text, jsonb, timestamptz, boolean, timestamptz)': {
    anon: false,
    authenticated: false,
  },
  'public.create_tester_pharmacy(uuid, text, text)': { anon: false, authenticated: false },
  'public.reset_molecule_signal(uuid)': { anon: false, authenticated: false },
  'public.create_availability_request(uuid, uuid, text, text, text, data_origin)': { anon: false, authenticated: false },
  'public.requests_for_my_pharmacy()': { anon: false, authenticated: true },
  'public.request_answers_public(uuid)': { anon: true, authenticated: true },
  'public.demand_by_governorate(uuid, integer)': { anon: false, authenticated: true },
  'public.signals_view(uuid[])': { anon: false, authenticated: true },
  'public.signal_events_view(uuid, integer)': { anon: false, authenticated: true },
  'public.my_alerts(integer)': { anon: false, authenticated: true },
  'public.reset_tester_numbering()': { anon: false, authenticated: false },
  'public.public_status(uuid)': { anon: true, authenticated: true },
  'public.active_member_pharmacies(integer)': { anon: false, authenticated: false },
  'public.public_molecule_status(uuid)': { anon: true, authenticated: true },
  'public.requests_for_pharmacy(uuid)': { anon: false, authenticated: false },
  'public.answer_request_as(uuid, uuid, availability_answer, boolean)': { anon: false, authenticated: false },
};

const ROLES = ['anon', 'authenticated', 'service_role'] as const;

describe.each([
  { label: 'project without default grants', defaultGrants: false },
  { label: 'project with default grants', defaultGrants: true },
])('privileges, $label', ({ defaultGrants }) => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createTestDatabase({ defaultGrants });
  });
  afterAll(async () => {
    await db.close();
  });

  it('every public table is listed in this test', async () => {
    const { rows } = await db.query<{ name: string }>(
      `select tablename as name from pg_tables where schemaname = 'public' order by 1`,
    );
    expect(rows.map((r) => r.name)).toEqual(Object.keys(TABLES).sort());
  });

  it.each(Object.entries(TABLES))('%s gives each role exactly its privileges', async (table, expected) => {
    for (const role of ROLES) {
      const { rows } = await db.query<{ priv: Priv }>(
        `select p as priv from unnest($3::text[]) p where has_table_privilege($1, $2, p) order by 1`,
        [role, `public.${table}`, ALL],
      );
      expect({ role, privileges: rows.map((r) => r.priv) }).toEqual({
        role,
        privileges: [...(expected[role] ?? [])].sort(),
      });
    }
  });

  it.each(Object.entries(FUNCTIONS))('%s is callable by the right roles', async (fn, expected) => {
    for (const role of ['anon', 'authenticated'] as const) {
      const { rows } = await db.query<{ ok: boolean }>(`select has_function_privilege($1, $2, 'execute') as ok`, [
        role,
        fn,
      ]);
      expect({ role, callable: rows[0].ok }).toEqual({ role, callable: expected[role] });
    }
  });

  it.each([
    ['signals', ['molecule_id', 'level', 'since', 'rule', 'evidence', 'updated_at']],
    ['signal_events', ['id', 'molecule_id', 'from_level', 'to_level', 'rule', 'evidence', 'at']],
  ])('a signed-in user may select every column of %s but evidence', async (table, columns) => {
    const { rows } = await db.query<{ col: string }>(
      `select c as col from unnest($1::text[]) c where has_column_privilege('authenticated', $2, c, 'select') order by 1`,
      [columns, `public.${table}`],
    );
    expect(rows.map((r) => r.col)).toEqual(columns.filter((c) => c !== 'evidence').sort());
    const anon = await db.query<{ ok: boolean }>(`select has_any_column_privilege('anon', $1, 'select') as ok`, [`public.${table}`]);
    expect(anon.rows[0].ok).toBe(false);
  });

  it('a signed-in user may insert into availability_answers only the columns a pharmacy fills', async () => {
    const { rows } = await db.query<{ col: string }>(
      `select c as col from unnest(array['id', 'request_id', 'organisation_id', 'answer', 'show_identity', 'answered_at', 'origin']) c
       where has_column_privilege('authenticated', 'public.availability_answers', c, 'insert') order by 1`,
    );
    expect(rows.map((r) => r.col)).toEqual(['answer', 'organisation_id', 'origin', 'request_id', 'show_identity']);
  });

  it('a signed-in user may insert into allocation_decisions only the decision itself', async () => {
    const { rows } = await db.query<{ col: string }>(
      `select c as col from unnest(array['id', 'molecule_id', 'organisation_id', 'stock', 'recommended', 'applied', 'deviation_reason', 'decided_at', 'origin']) c
       where has_column_privilege('authenticated', 'public.allocation_decisions', c, 'insert') order by 1`,
    );
    expect(rows.map((r) => r.col)).toEqual(['applied', 'deviation_reason', 'molecule_id', 'recommended', 'stock']);
  });
});

// What each role can and cannot read or write, one test per table, on rows that exist: the
// privileges above say which statements may run; the row-level rules decide which rows they reach.
describe('each table, by role, on real rows', () => {
  const uid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
  const M = uid(0x900);
  const ORG = { p1: uid(0x901), p2: uid(0x902), coord: uid(0x903), wholesaler: uid(0x904) };
  const USER = { p1: uid(0x911), p2: uid(0x912), coord: uid(0x913), wholesaler: uid(0x914) };
  const HEX = 'a'.repeat(64);
  const ids: Record<string, string> = {};
  let db: PGlite;
  const anon = { kind: 'anon' as const };
  const service = { kind: 'service' as const };
  const user = (userId: string) => ({ kind: 'user' as const, userId });
  type Caller = typeof anon | typeof service | ReturnType<typeof user>;

  const rows = (caller: Caller, sql: string, params: unknown[] = []) =>
    as(db, caller, async (tx) => (await tx.query<Record<string, unknown>>(sql, params)).rows);
  const count = (caller: Caller, sql: string, params: unknown[] = []) =>
    as(db, caller, async (tx) => (await tx.query(sql, params)).affectedRows ?? 0);
  const denied = (caller: Caller, sql: string, params: unknown[] = []) =>
    expect(rows(caller, sql, params)).rejects.toThrow(/permission denied|row-level security/);

  beforeAll(async () => {
    db = await createTestDatabase({ defaultGrants: true });
    const q = (sql: string, params: unknown[] = []) => db.query<{ id: string }>(sql, params);
    await q(`insert into public.molecules (id, name) values ($1, 'MOLECULE TEST')`, [M]);
    for (const [oid, type, gov] of [
      [ORG.p1, 'pharmacy', 'TN-11'],
      [ORG.p2, 'pharmacy', 'TN-11'],
      [ORG.coord, 'coordinator', 'TN-11'],
      [ORG.wholesaler, 'wholesaler', 'TN-13'],
    ]) {
      await q(
        `insert into public.organisations (id, type, display_name, governorate_code, origin) values ($1, $2, $4, $3, 'simulated')`,
        [oid, type, gov, `Organisation test ${type}`],
      );
    }
    for (const [u, o, role] of [
      [USER.p1, ORG.p1, 'pharmacist'],
      [USER.p2, ORG.p2, 'pharmacist'],
      [USER.coord, ORG.coord, 'coordinator'],
      [USER.wholesaler, ORG.wholesaler, 'wholesaler'],
    ]) {
      await q(`insert into auth.users (id) values ($1)`, [u]);
      await q(`insert into public.profiles (user_id, organisation_id, role) values ($1, $2, $3)`, [u, o, role]);
    }
    for (const o of [ORG.p1, ORG.p2]) {
      await q(
        `insert into public.reports (organisation_id, governorate_code, molecule_id, kind, ordered_at, reported_at, origin)
         values ($1, 'TN-11', $2, 'not_delivered', now() - interval '80 hours', now() - interval '1 hour', 'simulated')`,
        [o, M],
      );
    }
    await q(`insert into public.followed_molecules (organisation_id, molecule_id) values ($1, $2)`, [ORG.p2, M]);
    await q(
      `insert into public.foreign_notices (molecule_id, source, status, published_at, url, origin)
       values ($1, 'ANSM', 'shortage', now(), 'https://example.org', 'simulated')`,
      [M],
    );
    const evidence = JSON.stringify({ pharmacies14d: 2 });
    await q(
      `insert into public.signals (molecule_id, level, since, rule, evidence) values ($1, 'watch', now(), 'local_reports_below_threshold', $2)`,
      [M, evidence],
    );
    ids.event = (
      await q(
        `insert into public.signal_events (molecule_id, from_level, to_level, rule, evidence)
         values ($1, 'none', 'watch', 'local_reports_below_threshold', $2) returning id::text as id`,
        [M, evidence],
      )
    ).rows[0].id;
    await q(`insert into public.alerts (organisation_id, signal_event_id, channel) values ($1, $2, 'web')`, [ORG.p2, ids.event]);
    ids.request = (
      await q(
        `insert into public.availability_requests (molecule_id, governorate_code, expires_at, device_hash, origin)
         values ($1, 'TN-11', now() + interval '3 hours', $2, 'simulated') returning id`,
        [M, HEX],
      )
    ).rows[0].id;
    await q(
      `insert into public.availability_answers (request_id, organisation_id, answer, origin) values ($1, $2, 'available', 'simulated')`,
      [ids.request, ORG.p2],
    );
    await q(
      `insert into public.allocation_decisions (molecule_id, organisation_id, stock, recommended, applied, origin)
       values ($1, $2, 10, '{}', true, 'simulated')`,
      [M, ORG.wholesaler],
    );
    await q(`insert into public.wa_links (organisation_id, phone_hash, reply_to) values ($1, $2, '21650000000')`, [ORG.p2, HEX]);
    await q(
      `insert into public.wa_link_codes (organisation_id, phone_hash, reply_to, code_hash, expires_at)
       values ($1, $2, '21650000000', $2, now() + interval '5 minutes')`,
      [ORG.p2, HEX],
    );
  }, 60_000);

  afterAll(async () => {
    await db.close();
  });

  it('system_meta: anyone reads the schema version; nobody but the service role changes it', async () => {
    expect(await rows(anon, 'select schema_version from public.system_meta')).toHaveLength(1);
    await denied(user(USER.coord), 'update public.system_meta set schema_version = 0');
  });

  it('governorates: anyone reads; no user writes', async () => {
    expect(await rows(anon, 'select code from public.governorates')).toHaveLength(24);
    await denied(user(USER.coord), `insert into public.governorates (code) values ('TN-99')`);
  });

  it('molecules: anyone reads; no user adds one', async () => {
    expect(await rows(anon, 'select id from public.molecules where id = $1', [M])).toHaveLength(1);
    await denied(user(USER.p1), `insert into public.molecules (name) values ('X')`);
  });

  it('medicines: anyone reads; no user changes the catalogue', async () => {
    await expect(rows(anon, 'select id from public.medicines limit 1')).resolves.toBeDefined();
    await denied(user(USER.p1), `update public.medicines set brand = 'X'`);
  });

  it('foreign_notices: anyone reads; no user adds one', async () => {
    expect(await rows(anon, 'select source from public.foreign_notices where molecule_id = $1', [M])).toEqual([{ source: 'ANSM' }]);
    await denied(
      user(USER.coord),
      `insert into public.foreign_notices (molecule_id, source, status, published_at, url, origin)
       values ($1, 'X', 'shortage', now(), 'https://x.org', 'tester')`,
      [M],
    );
  });

  it('organisations: a member reads its own organisation only; nobody renames it', async () => {
    expect(await rows(user(USER.p1), 'select id from public.organisations')).toEqual([{ id: ORG.p1 }]);
    expect(await rows(user(USER.coord), 'select id from public.organisations')).toEqual([{ id: ORG.coord }]);
    await denied(anon, 'select id from public.organisations');
    await denied(user(USER.p1), `update public.organisations set display_name = 'X'`);
  });

  it('profiles: a user reads their own profile only and cannot change their role', async () => {
    expect(await rows(user(USER.p1), 'select user_id from public.profiles')).toEqual([{ user_id: USER.p1 }]);
    await denied(user(USER.p1), `update public.profiles set role = 'coordinator'`);
    await denied(anon, 'select user_id from public.profiles');
  });

  it('followed_molecules: a pharmacy reads, adds and removes its own follows only', async () => {
    expect(await rows(user(USER.p1), 'select organisation_id from public.followed_molecules')).toEqual([]);
    expect(await rows(user(USER.p2), 'select organisation_id from public.followed_molecules')).toEqual([{ organisation_id: ORG.p2 }]);
    await denied(user(USER.p1), 'insert into public.followed_molecules (organisation_id, molecule_id) values ($1, $2)', [ORG.p2, M]);
    expect(await count(user(USER.p1), 'insert into public.followed_molecules (organisation_id, molecule_id) values ($1, $2)', [ORG.p1, M])).toBe(1);
    expect(await count(user(USER.p1), 'delete from public.followed_molecules where organisation_id = $1', [ORG.p2])).toBe(0);
    await denied(anon, 'select molecule_id from public.followed_molecules');
  });

  it('reports: a pharmacy reads its own only; nobody edits or deletes one; visitors see none', async () => {
    expect(await rows(user(USER.p1), 'select organisation_id from public.reports')).toEqual([{ organisation_id: ORG.p1 }]);
    expect(await rows(user(USER.coord), 'select organisation_id from public.reports')).toEqual([]);
    await denied(user(USER.p1), `update public.reports set kind = 'delivered_again'`);
    await denied(user(USER.p1), 'delete from public.reports');
    await denied(anon, 'select id from public.reports');
  });

  it('signals: signed-in users read the level, never the evidence; only the service role writes', async () => {
    expect(await rows(user(USER.p1), 'select level from public.signals where molecule_id = $1', [M])).toEqual([{ level: 'watch' }]);
    await denied(user(USER.coord), 'select evidence from public.signals');
    await denied(anon, 'select level from public.signals');
    await denied(user(USER.coord), `update public.signals set level = 'confirmed'`);
  });

  it('signal_events: signed-in users read the change, never the evidence; no user writes', async () => {
    expect(await rows(user(USER.p1), 'select to_level from public.signal_events where molecule_id = $1', [M])).toEqual([{ to_level: 'watch' }]);
    await denied(user(USER.coord), 'select evidence from public.signal_events');
    await denied(anon, 'select to_level from public.signal_events');
    await denied(
      user(USER.coord),
      `insert into public.signal_events (molecule_id, from_level, to_level, rule, evidence) values ($1, 'watch', 'confirmed', 'x', '{}')`,
      [M],
    );
  });

  it('alerts: an organisation reads its own alerts only and cannot create one', async () => {
    expect(await rows(user(USER.p1), 'select id from public.alerts')).toEqual([]);
    expect(await rows(user(USER.p2), 'select organisation_id from public.alerts')).toEqual([{ organisation_id: ORG.p2 }]);
    await denied(user(USER.p1), `insert into public.alerts (organisation_id, signal_event_id, channel) values ($1, $2, 'web')`, [ORG.p1, ids.event]);
    expect(await count(user(USER.p1), 'update public.alerts set read_at = now()')).toBe(0);
    await denied(anon, 'select id from public.alerts');
  });

  it('availability_requests: no direct access for visitors or users (functions only)', async () => {
    await denied(anon, 'select id from public.availability_requests');
    await denied(user(USER.p1), 'select id from public.availability_requests');
    await denied(
      anon,
      `insert into public.availability_requests (molecule_id, governorate_code, expires_at, device_hash, origin) values ($1, 'TN-11', now(), $2, 'tester')`,
      [M, HEX],
    );
  });

  it('availability_answers: a pharmacy reads its own answers only; visitors read none directly', async () => {
    expect(await rows(user(USER.p1), 'select id from public.availability_answers')).toEqual([]);
    expect(await rows(user(USER.p2), 'select organisation_id from public.availability_answers')).toEqual([{ organisation_id: ORG.p2 }]);
    expect(await rows(user(USER.coord), 'select id from public.availability_answers')).toEqual([]);
    await denied(anon, 'select id from public.availability_answers');
  });

  it('allocation_decisions: the wholesaler and coordinators read them; pharmacies and visitors do not', async () => {
    expect(await rows(user(USER.wholesaler), 'select organisation_id from public.allocation_decisions')).toEqual([{ organisation_id: ORG.wholesaler }]);
    expect(await rows(user(USER.coord), 'select applied from public.allocation_decisions')).toEqual([{ applied: true }]);
    expect(await rows(user(USER.p1), 'select id from public.allocation_decisions')).toEqual([]);
    await denied(anon, 'select id from public.allocation_decisions');
  });

  it.each(['wa_inbound', 'wa_links', 'wa_link_codes'])('%s: closed to visitors and users, even the linked pharmacy', async (table) => {
    for (const caller of [anon, user(USER.p2), user(USER.coord)]) await denied(caller, `select * from public.${table}`);
    expect(await rows(service, `select count(*)::int as n from public.${table}`)).toHaveLength(1);
  });
});
