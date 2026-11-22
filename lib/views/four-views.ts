// One shortage, four views (/vues/[moleculeId]): what the pharmacy, the wholesaler, the
// coordination unit and the public receive for the same molecule.
//
// Each panel is loaded with its own role's client only (lib/views/demo-clients.ts: the demo
// account's session, or no session for the public), through the same functions that role's
// screens use. Nothing is read once and reshaped per panel: if the database refuses a read to a
// role, that panel does not have it. Each panel also tries the reads the other roles get and
// records which ones the database refused, so the page can show the rules at work.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadDashboard } from '@/lib/coordination/dashboard';
import { getAlerts, getMoleculeView, type AlertView, type MoleculeView } from '@/lib/pharmacy/data';
import type { ForeignNotice } from '@/lib/signal';
import { countingParams } from '@/lib/signals/recompute';
import {
  demandByGovernorate,
  governorateCounts,
  listEvents,
  listSignals,
  publicStatus,
  type DemandRow,
  type EventRow,
  type GovernorateCount,
  type PublicStatus,
  type SignalRow,
} from '@/lib/signals/views';

export type PanelKey = 'pharmacy' | 'wholesaler' | 'coordination' | 'public';
export type ViewClients = Record<PanelKey, SupabaseClient>;

/** Reads tried on a role's behalf to show what the database withholds from it. */
export type ProbeKey = 'signals' | 'counts' | 'demand' | 'alerts' | 'reports';
/** refused: the database returned an error. empty: it answered with no rows. returned: it gave rows. */
export type ProbeResult = 'refused' | 'empty' | 'returned';
export type Probes = Partial<Record<ProbeKey, ProbeResult>>;

/** For each panel, the reads it does not use itself, tried with its own client. */
export const PROBES: Record<PanelKey, ProbeKey[]> = {
  pharmacy: ['counts', 'demand'],
  wholesaler: ['reports'],
  coordination: ['reports'],
  public: ['signals', 'counts', 'demand', 'alerts', 'reports'],
};

export async function probe(client: SupabaseClient, key: ProbeKey, moleculeId: string): Promise<ProbeResult> {
  if (key === 'reports') {
    const { error, count } = await client.from('reports').select('id', { count: 'exact', head: true }).eq('molecule_id', moleculeId);
    if (error) return 'refused';
    return (count ?? 0) === 0 ? 'empty' : 'returned';
  }
  const call =
    key === 'signals'
      ? client.rpc('signals_view', { p_molecule_ids: [moleculeId] })
      : key === 'counts'
        ? client.rpc('governorate_counts', { p_molecule_id: moleculeId, ...countingParams(), p_at: new Date().toISOString() })
        : key === 'demand'
          ? client.rpc('demand_by_governorate', { p_molecule_id: moleculeId, p_window_days: 7 })
          : client.rpc('my_alerts', { p_limit: 1 });
  const { data, error } = await call;
  if (error) return 'refused';
  return Array.isArray(data) && data.length > 0 ? 'returned' : 'empty';
}

async function probes(client: SupabaseClient, panel: PanelKey, moleculeId: string): Promise<Probes> {
  const keys = PROBES[panel];
  const results = await Promise.all(keys.map((k) => probe(client, k, moleculeId)));
  return Object.fromEntries(keys.map((k, i) => [k, results[i]]));
}

export interface PharmacyPanel {
  /** The pharmacy's own name: the only pharmacy name on the page. */
  organisationName: string | null;
  view: MoleculeView;
  alerts: AlertView[];
  probes: Probes;
}

export interface WholesalerPanel {
  signal: SignalRow | null;
  counts: GovernorateCount[];
  demand: DemandRow[];
  alerts: AlertView[];
  probes: Probes;
}

export interface CoordinationPanel {
  signal: SignalRow | null;
  counts: GovernorateCount[];
  demand: DemandRow[];
  notices: ForeignNotice[];
  timeline: EventRow[];
  probes: Probes;
}

export interface PublicPanel {
  status: PublicStatus;
  probes: Probes;
}

export interface FourViews {
  molecule: { id: string; name: string };
  pharmacy: PharmacyPanel;
  wholesaler: WholesalerPanel;
  coordination: CoordinationPanel;
  public: PublicPanel;
}

async function pharmacyPanel(client: SupabaseClient, moleculeId: string, organisationId: string): Promise<PharmacyPanel | null> {
  const [view, alerts, org, p] = await Promise.all([
    getMoleculeView(moleculeId, client),
    getAlerts(client),
    // Row-level security: a member reads its own organisation only.
    client.from('organisations').select('display_name').eq('id', organisationId).maybeSingle(),
    probes(client, 'pharmacy', moleculeId),
  ]);
  if (!view) return null;
  return {
    organisationName: (org.data?.display_name as string | undefined) ?? null,
    view,
    alerts: alerts.filter((a) => a.moleculeId === moleculeId),
    probes: p,
  };
}

async function wholesalerPanel(client: SupabaseClient, moleculeId: string): Promise<WholesalerPanel> {
  const [signals, counts, demand, alerts, p] = await Promise.all([
    listSignals(client, [moleculeId]),
    governorateCounts(client, moleculeId),
    demandByGovernorate(client, moleculeId),
    getAlerts(client),
    probes(client, 'wholesaler', moleculeId),
  ]);
  return {
    signal: signals.find((s) => s.molecule_id === moleculeId) ?? null,
    counts,
    demand,
    alerts: alerts.filter((a) => a.moleculeId === moleculeId),
    probes: p,
  };
}

async function coordinationPanel(client: SupabaseClient, moleculeId: string): Promise<CoordinationPanel> {
  // The coordinator's own loader. It selects the most serious signal when this molecule has
  // none; then this panel shows no signal rather than another molecule's.
  const [data, p] = await Promise.all([loadDashboard(client, moleculeId, { withEventLog: false }), probes(client, 'coordination', moleculeId)]);
  if (data.selected?.molecule_id === moleculeId) {
    return { signal: data.selected, counts: data.counts, demand: data.demand, notices: data.notices, timeline: data.timeline, probes: p };
  }
  const [counts, demand, timeline] = await Promise.all([
    governorateCounts(client, moleculeId),
    demandByGovernorate(client, moleculeId),
    listEvents(client, moleculeId, 50),
  ]);
  return { signal: null, counts, demand, notices: [], timeline, probes: p };
}

async function publicPanel(client: SupabaseClient, moleculeId: string): Promise<PublicPanel> {
  const [status, p] = await Promise.all([publicStatus(client, moleculeId), probes(client, 'public', moleculeId)]);
  return { status, probes: p };
}

/**
 * Loads the four panels for one molecule. `clients` maps each panel to its role's client;
 * `pharmacyOrganisationId` is the demo pharmacy's organisation. Null when the molecule is unknown.
 */
export async function loadFourViews(
  moleculeId: string,
  clients: ViewClients,
  pharmacyOrganisationId: string,
): Promise<FourViews | null> {
  const { data: molecule } = await clients.public.from('molecules').select('id, name').eq('id', moleculeId).maybeSingle();
  if (!molecule) return null;
  const [pharmacy, wholesaler, coordination, pub] = await Promise.all([
    pharmacyPanel(clients.pharmacy, moleculeId, pharmacyOrganisationId),
    wholesalerPanel(clients.wholesaler, moleculeId),
    coordinationPanel(clients.coordination, moleculeId),
    publicPanel(clients.public, moleculeId),
  ]);
  if (!pharmacy) return null;
  return { molecule: { id: molecule.id as string, name: molecule.name as string }, pharmacy, wholesaler, coordination, public: pub };
}
