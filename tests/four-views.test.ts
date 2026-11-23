// /vues: each panel's data must come through its own role's client. Four fake clients stand in
// for the four sessions: each records every call it receives and answers like the database
// would for that role, with data tagged by role. If a panel were loaded through another role's
// client, or one shared query were reshaped per panel, its tag or its call list would not match.
// The same check on the real database is tests/live/four-views.test.ts.

import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { loadFourViews, PROBES, type PanelKey } from '@/lib/views/four-views';

const MOLECULE = '11111111-1111-4111-8111-111111111111';
const PHARMACY_ORG = '00000000-0000-4000-8000-000000000a01';
const PHARMACY_NAME = 'Pharmacie démo A, Tunis';

type Result = { data: unknown; error: { code: string; message: string } | null; count?: number | null };
const ok = (data: unknown, count?: number): Result => ({ data, error: null, count });
const refused: Result = { data: null, error: { code: '42501', message: 'not allowed for this role' } };

const SINCE: Record<PanelKey, string> = {
  pharmacy: '2026-11-01T00:00:00.000Z',
  wholesaler: '2026-11-02T00:00:00.000Z',
  coordination: '2026-11-03T00:00:00.000Z',
  central: '2026-11-04T00:00:00.000Z',
  order: '2026-11-05T00:00:00.000Z',
  public: '',
};

const evidence = {
  pharmacies14d: '<3',
  governorates14d: null,
  pharmacies7d: '<3',
  deliveredAgainPharmacies: 0,
  ignoredTooEarly: 0,
  lastNotDeliveredAt: null,
  notices: [],
  origins: ['simulated'],
};

// What the database answers each role (as the migrations and their tests define it).
function answer(role: PanelKey, call: { rpc?: string; table?: string; ops: string[]; single: boolean }): Result {
  const signed = role !== 'public';
  if (call.rpc) {
    switch (call.rpc) {
      case 'signals_view':
        return signed
          ? ok([{ molecule_id: MOLECULE, molecule_name: 'MOLECULE TEST', level: 'likely', since: SINCE[role], rule: 'two_pharmacies_7d', evidence, updated_at: SINCE[role] }])
          : refused;
      case 'governorate_counts':
        return role === 'wholesaler' || role === 'coordination'
          ? ok([{ governorate_code: role === 'wholesaler' ? 'TN-11' : 'TN-61', governorate_name: 'x', pharmacies: '<3' }])
          : refused;
      case 'demand_by_governorate':
        return role === 'wholesaler' || role === 'coordination'
          ? ok([{ governorate_code: role === 'wholesaler' ? 'TN-12' : 'TN-62', requests: '<3', answered: '0', unanswered: '<3' }])
          : refused;
      case 'my_alerts':
        return signed
          ? ok([{ id: `alert-${role}`, sent_at: SINCE[role], read_at: null, molecule_id: MOLECULE, molecule_name: 'MOLECULE TEST', from_level: 'watch', to_level: 'likely', rule: 'two_pharmacies_7d', evidence }])
          : refused;
      case 'signal_events_view':
        return signed ? ok([{ id: `event-${role}`, molecule_id: MOLECULE, from_level: 'watch', to_level: 'likely', rule: 'two_pharmacies_7d', at: SINCE[role] }]) : refused;
      case 'public_status':
        return ok([{ confirmed: false, since: null, origins: [] }]);
      case 'pharmacy_network':
        return role === 'order' || role === 'coordination'
          ? ok([{ governorate_code: 'TN-61', governorate_name: 'Sfax', members: '<3', active: '<3', origins: ['simulated'] }])
          : refused;
    }
    throw new Error(`unexpected rpc ${call.rpc}`);
  }
  switch (call.table) {
    case 'molecules':
      return ok({ id: MOLECULE, name: 'MOLECULE TEST' });
    case 'organisations':
      // Row-level security: a member reads its own organisation only.
      return role === 'pharmacy' && call.ops.some((o) => o.includes(PHARMACY_ORG)) ? ok({ display_name: PHARMACY_NAME }) : ok(null);
    case 'followed_molecules':
      return ok(role === 'pharmacy' ? { molecule_id: MOLECULE } : null);
    case 'foreign_notices':
      return ok([]);
    case 'medicines':
      return ok(role === 'central' ? [{ molecule_id: MOLECULE, brand: 'BRAND A', vei_category: 'V' }] : []);
    case 'arrival_announcements':
      return signed
        ? ok(role === 'central' ? [{ id: 'arrival-central', molecule_id: MOLECULE, expected_on: '2026-12-01', quantity: 'one_to_three_months', level_at_announcement: 'likely', announced_at: SINCE.central, origin: 'simulated' }] : [])
        : refused;
    case 'reports': {
      if (!signed) return refused;
      const own = role === 'pharmacy' ? [{ id: 'report-own', kind: 'not_delivered', ordered_at: null, reported_at: SINCE.pharmacy, channel: 'web', origin: 'simulated' }] : [];
      return ok(own, own.length);
    }
  }
  throw new Error(`unexpected table ${call.table}`);
}

interface Recorded {
  rpc: string[];
  tables: string[];
}

function fakeClient(role: PanelKey): { client: SupabaseClient; recorded: Recorded } {
  const recorded: Recorded = { rpc: [], tables: [] };
  const client = {
    rpc(name: string) {
      recorded.rpc.push(name);
      return Promise.resolve(answer(role, { rpc: name, ops: [], single: false }));
    },
    from(table: string) {
      recorded.tables.push(table);
      const ops: string[] = [];
      const builder: unknown = new Proxy(
        {},
        {
          get(_target, prop) {
            if (prop === 'then') {
              const p = Promise.resolve(answer(role, { table, ops, single: false }));
              return p.then.bind(p);
            }
            if (prop === 'maybeSingle') return () => Promise.resolve(answer(role, { table, ops, single: true }));
            return (...args: unknown[]) => {
              ops.push(`${String(prop)}(${JSON.stringify(args)})`);
              return builder;
            };
          },
        },
      );
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, recorded };
}

async function load() {
  const fakes = {
    pharmacy: fakeClient('pharmacy'),
    wholesaler: fakeClient('wholesaler'),
    coordination: fakeClient('coordination'),
    central: fakeClient('central'),
    order: fakeClient('order'),
    public: fakeClient('public'),
  };
  const data = await loadFourViews(
    MOLECULE,
    {
      pharmacy: fakes.pharmacy.client,
      wholesaler: fakes.wholesaler.client,
      coordination: fakes.coordination.client,
      central: fakes.central.client,
      order: fakes.order.client,
      public: fakes.public.client,
    },
    PHARMACY_ORG,
  );
  return { data: data!, fakes };
}

const uniq = (xs: string[]) => [...new Set(xs)].sort();

describe('/vues loads each panel through its own role', () => {
  it('each panel holds what its own client returned, and nothing from another', async () => {
    const { data } = await load();
    expect(data.pharmacy.view.signal?.since).toBe(SINCE.pharmacy);
    expect(data.wholesaler.signal?.since).toBe(SINCE.wholesaler);
    expect(data.coordination.signal?.since).toBe(SINCE.coordination);
    expect(data.pharmacy.alerts.map((a) => a.id)).toEqual(['alert-pharmacy']);
    expect(data.wholesaler.alerts.map((a) => a.id)).toEqual(['alert-wholesaler']);
    expect(data.wholesaler.counts.map((c) => c.governorate_code)).toEqual(['TN-11']);
    expect(data.coordination.counts.map((c) => c.governorate_code)).toEqual(['TN-61']);
    expect(data.coordination.timeline.map((e) => e.id)).toEqual(['event-coordination']);
    expect(data.pharmacy.view.reports.map((r) => r.id)).toEqual(['report-own']);
    expect(data.public.status).toEqual({ confirmed: false, since: null, origins: [] });
    expect(data.central.signal?.since).toBe(SINCE.central);
    expect(data.central.facts).toEqual({ category: 'V', brands: 1, otherBrands: 0 });
    expect(data.central.arrival?.id).toBe('arrival-central');
    expect(data.order.governorates).toBe(1);
  });

  it('each client receives exactly the reads of its own panel', async () => {
    const { fakes } = await load();
    expect(uniq(fakes.pharmacy.recorded.rpc)).toEqual(['demand_by_governorate', 'governorate_counts', 'my_alerts', 'signals_view']);
    expect(uniq(fakes.pharmacy.recorded.tables)).toEqual(['followed_molecules', 'foreign_notices', 'molecules', 'organisations', 'reports']);
    expect(uniq(fakes.wholesaler.recorded.rpc)).toEqual(['demand_by_governorate', 'governorate_counts', 'my_alerts', 'signals_view']);
    expect(uniq(fakes.wholesaler.recorded.tables)).toEqual(['reports']);
    expect(uniq(fakes.coordination.recorded.rpc)).toEqual(['demand_by_governorate', 'governorate_counts', 'signal_events_view', 'signals_view']);
    expect(uniq(fakes.coordination.recorded.tables)).toEqual(['foreign_notices', 'reports']);
    // The public panel has no session: its only data read is public_status (the rest are the probes).
    expect(uniq(fakes.public.recorded.rpc)).toEqual(['demand_by_governorate', 'governorate_counts', 'my_alerts', 'public_status', 'signals_view']);
    expect(uniq(fakes.public.recorded.tables)).toEqual(['molecules', 'reports']);
    expect(uniq(fakes.central.recorded.rpc)).toEqual(['demand_by_governorate', 'governorate_counts', 'signals_view']);
    expect(uniq(fakes.central.recorded.tables)).toEqual(['arrival_announcements', 'medicines', 'reports']);
    expect(uniq(fakes.order.recorded.rpc)).toEqual(['demand_by_governorate', 'governorate_counts', 'pharmacy_network']);
    expect(uniq(fakes.order.recorded.tables)).toEqual(['reports']);
  });

  it('shows what the database refused to each role, as tried with that role', async () => {
    const { data } = await load();
    expect(data.pharmacy.probes).toEqual({ counts: 'refused', demand: 'refused' });
    expect(data.wholesaler.probes).toEqual({ reports: 'empty' });
    expect(data.coordination.probes).toEqual({ reports: 'empty' });
    expect(data.public.probes).toEqual({ signals: 'refused', counts: 'refused', demand: 'refused', alerts: 'refused', reports: 'refused' });
    expect(data.central.probes).toEqual({ counts: 'refused', demand: 'refused', reports: 'empty' });
    expect(data.order.probes).toEqual({ counts: 'refused', demand: 'refused', reports: 'empty' });
    for (const panel of Object.keys(PROBES) as PanelKey[]) expect(Object.keys(data[panel].probes)).toEqual(PROBES[panel]);
  });

  it('names a pharmacy only in its own panel', async () => {
    const { data } = await load();
    expect(data.pharmacy.organisationName).toBe(PHARMACY_NAME);
    for (const panel of ['wholesaler', 'coordination', 'central', 'order', 'public'] as const) {
      const json = JSON.stringify(data[panel]);
      expect(json).not.toContain(PHARMACY_NAME);
      expect(json).not.toMatch(/Pharmacie (démo|testeuse)/i);
    }
  });

  it('returns null for a molecule that is not in the catalogue', async () => {
    const pub = fakeClient('public');
    pub.client.from = () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ok(null) }) }) }) as never;
    const other = fakeClient('pharmacy').client;
    expect(
      await loadFourViews(MOLECULE, { pharmacy: other, wholesaler: other, coordination: other, central: other, order: other, public: pub.client }, PHARMACY_ORG),
    ).toBeNull();
  });
});
