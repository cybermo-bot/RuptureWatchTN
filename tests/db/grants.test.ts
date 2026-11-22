// Table and function privileges must come from the migrations alone, whatever the
// project's default exposure setting. Newer Supabase projects grant nothing on new
// tables; older ones grant everything. Both must end with exactly this matrix.

import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from './harness';

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
  signals: { authenticated: ['select'], service_role: ALL },
  signal_events: { authenticated: ['select'], service_role: ['select', 'insert', 'delete'] },
  alerts: { authenticated: ['select'], service_role: ALL },
  wa_inbound: { service_role: ALL },
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
  'public.create_tester_pharmacy(uuid, text, text)': { anon: false, authenticated: false },
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
});
