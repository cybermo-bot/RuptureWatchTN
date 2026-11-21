// Done check 3, on the real Supabase project with the real demo accounts:
// a demo pharmacy cannot read another organisation's reports; a coordinator cannot select from reports at all.
// Needs .env.local (URL, anon key, service role key, DEMO_ACCOUNT_PASSWORD). Inserts two simulated
// reports through the service role and deletes them afterwards.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_ROLES } from '@/lib/demo/roles';
import { DEFAULT_PARAMS } from '@/lib/signal';
import { loadLocalEnv } from '../../scripts/lib/script-env';

loadLocalEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const password = process.env.DEMO_ACCOUNT_PASSWORD ?? '';
const configured = Boolean(url && anonKey && serviceKey && password);

const role = (key: string) => DEMO_ROLES.find((r) => r.key === key)!;
const TUNIS = role('pharmacie-tunis');
const SFAX = role('pharmacie-sfax');
const COORD = role('coordination');

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign in failed for ${email}: ${error.message}`);
  return client;
}

describe.skipIf(!configured)('access rules on the live project', () => {
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const inserted: string[] = [];
  let moleculeId = '';

  beforeAll(async () => {
    const { data: mol, error } = await service.from('molecules').select('id').limit(1).single();
    if (error || !mol) throw new Error('No molecule in the database: import the catalogue first.');
    moleculeId = mol.id;
    const now = Date.now();
    const rows = [
      { organisation_id: TUNIS.organisationId, governorate_code: 'TN-11' },
      { organisation_id: SFAX.organisationId, governorate_code: 'TN-61' },
    ].map((r) => ({
      ...r,
      molecule_id: moleculeId,
      kind: 'not_delivered',
      ordered_at: new Date(now - 80 * 3_600_000).toISOString(),
      reported_at: new Date(now - 60_000).toISOString(),
      channel: 'web',
      origin: 'simulated',
    }));
    const { data, error: insertError } = await service.from('reports').insert(rows).select('id');
    if (insertError) throw new Error(`setup insert failed: ${insertError.message}`);
    inserted.push(...data.map((r) => r.id as string));
  });

  afterAll(async () => {
    if (inserted.length) await service.from('reports').delete().in('id', inserted);
  });

  it('the Tunis demo pharmacy sees its own report and not the Sfax one', async () => {
    const client = await signIn(TUNIS.email);
    const { data, error } = await client.from('reports').select('id, organisation_id');
    expect(error).toBeNull();
    expect(data!.every((r) => r.organisation_id === TUNIS.organisationId)).toBe(true);
    expect(data!.map((r) => r.id)).toContain(inserted[0]);
    expect(data!.map((r) => r.id)).not.toContain(inserted[1]);
  });

  it('the Sfax demo pharmacy cannot read the Tunis report, even by id', async () => {
    const client = await signIn(SFAX.email);
    const { data, error } = await client.from('reports').select('*').eq('id', inserted[0]);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('the coordinator cannot select from reports at all', async () => {
    const client = await signIn(COORD.email);
    const { data, error, count } = await client.from('reports').select('*', { count: 'exact' });
    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(count).toBe(0);
  });

  it('the coordinator gets counts by governorate, with <3, and no identifiers', async () => {
    const client = await signIn(COORD.email);
    const { data, error } = await client.rpc('governorate_counts', {
      p_molecule_id: moleculeId,
      p_window_days: DEFAULT_PARAMS.confirmWindowDays,
      p_min_undelivered_hours: DEFAULT_PARAMS.minUndeliveredHours,
    });
    expect(error).toBeNull();
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ governorate_code: 'TN-11', pharmacies: '<3' }),
        expect.objectContaining({ governorate_code: 'TN-61', pharmacies: '<3' }),
      ]),
    );
    const text = JSON.stringify(data);
    expect(text).not.toContain(TUNIS.organisationId);
    expect(text).not.toMatch(/Pharmacie démo/);
  });

  it('a demo pharmacy cannot call governorate_counts', async () => {
    const client = await signIn(TUNIS.email);
    const { error } = await client.rpc('governorate_counts', { p_molecule_id: moleculeId });
    expect(error?.message).toMatch(/not allowed/);
  });

  it('an anonymous visitor cannot read reports or organisations', async () => {
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const reports = await anon.from('reports').select('id');
    expect(reports.data ?? []).toEqual([]);
    const orgs = await anon.from('organisations').select('id');
    expect(orgs.data ?? []).toEqual([]);
  });
});

it.runIf(!configured)('live access tests skipped: .env.local is not configured', () => {
  expect(configured).toBe(false);
});
