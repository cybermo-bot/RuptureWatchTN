// Done check 2, on the real Supabase project with the real demo accounts: /vues loads each panel
// through its own role (lib/views/demo-clients.ts, the page's own wiring), and no pharmacy name
// appears in any panel but the pharmacy's own.
// Needs .env.local. Inserts two simulated reports through the service role (no recompute, so no
// signal, event or alert is created) and deletes them afterwards.

import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_ROLES } from '@/lib/demo/roles';
import { viewClients, viewPharmacyOrganisationId } from '@/lib/views/demo-clients';
import { loadFourViews, type FourViews } from '@/lib/views/four-views';
import { loadLocalEnv } from '../../scripts/lib/script-env';

loadLocalEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const configured = Boolean(url && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && serviceKey && process.env.DEMO_ACCOUNT_PASSWORD);

const role = (key: string) => DEMO_ROLES.find((r) => r.key === key)!;
const TUNIS = role('pharmacie-tunis');
const SFAX = role('pharmacie-sfax');

describe.skipIf(!configured)('/vues on the live project', () => {
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const inserted: string[] = [];
  let pharmacyNames: string[] = [];
  let views: FourViews;

  beforeAll(async () => {
    const { data: mol, error } = await service.from('molecules').select('id').order('name', { ascending: false }).limit(1).single();
    if (error || !mol) throw new Error('No molecule in the database: import the catalogue first.');
    const now = Date.now();
    const rows = [
      { organisation_id: TUNIS.organisationId, governorate_code: 'TN-11' },
      { organisation_id: SFAX.organisationId, governorate_code: 'TN-61' },
    ].map((r) => ({
      ...r,
      molecule_id: mol.id,
      kind: 'not_delivered',
      ordered_at: new Date(now - 80 * 3_600_000).toISOString(),
      reported_at: new Date(now - 60_000).toISOString(),
      channel: 'web',
      origin: 'simulated',
    }));
    const { data, error: insertError } = await service.from('reports').insert(rows).select('id');
    if (insertError) throw new Error(`setup insert failed: ${insertError.message}`);
    inserted.push(...data.map((r) => r.id as string));

    const { data: orgs } = await service.from('organisations').select('display_name').eq('type', 'pharmacy');
    pharmacyNames = (orgs ?? []).map((o) => o.display_name as string).filter(Boolean);

    views = (await loadFourViews(mol.id, await viewClients(), viewPharmacyOrganisationId()))!;
  });

  afterAll(async () => {
    if (inserted.length) await service.from('reports').delete().in('id', inserted);
  });

  it('the pharmacy panel shows its own name and its own report only', () => {
    expect(pharmacyNames.length).toBeGreaterThan(1);
    expect(views.pharmacy.organisationName).toBeTruthy();
    const json = JSON.stringify(views.pharmacy);
    for (const name of pharmacyNames.filter((n) => n !== views.pharmacy.organisationName)) expect(json).not.toContain(name);
    const ids = views.pharmacy.view.reports.map((r) => r.id);
    expect(ids).toContain(inserted[0]);
    expect(ids).not.toContain(inserted[1]);
  });

  it('no pharmacy name in the wholesaler, coordination or public panel', () => {
    for (const panel of ['wholesaler', 'coordination', 'public'] as const) {
      const json = JSON.stringify(views[panel]);
      for (const name of pharmacyNames) expect(json, `${panel} contains ${name}`).not.toContain(name);
    }
  });

  it('wholesaler and coordination get counts by governorate, small ones as <3', () => {
    for (const panel of [views.wholesaler, views.coordination]) {
      const byCode = Object.fromEntries(panel.counts.map((c) => [c.governorate_code, c.pharmacies]));
      expect(byCode['TN-11']).toBe('<3');
      expect(byCode['TN-61']).toBe('<3');
    }
  });

  it('the database refuses each role what it should not have, tried with that role', () => {
    expect(views.pharmacy.probes).toEqual({ counts: 'refused', demand: 'refused' });
    expect(views.wholesaler.probes).toEqual({ reports: 'empty' });
    expect(views.coordination.probes).toEqual({ reports: 'empty' });
    expect(views.public.probes).toEqual({ signals: 'refused', counts: 'refused', demand: 'refused', alerts: 'refused', reports: 'refused' });
    expect(views.public.status.confirmed).toBe(false);
  });
});
