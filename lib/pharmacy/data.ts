// What a pharmacy's screens read. Everything goes through the visitor's own session, so
// row-level security applies: a pharmacy reads its own reports, follows and alerts, the
// public catalogue, and signals as display counts (signals_view, my_alerts: counts under 3
// read '<3'). Nothing here uses the service role.

import 'server-only';
import { createUserClient } from '@/lib/db/server';
import { activeNotices, DEFAULT_PARAMS, type ForeignNotice, type Level, type Origin, type RuleId } from '@/lib/signal';
import { countingParams } from '@/lib/signals/recompute';
import type { ShownEvidence } from '@/lib/signals/shown';
import type { Impact } from './impact-text';

export type { Impact };

export interface SignalView {
  level: Level;
  since: string;
  rule: RuleId;
  evidence: ShownEvidence;
}

export interface FollowedMolecule {
  moleculeId: string;
  name: string;
  signal: SignalView | null;
}

/** A row of signals_view (migration 0011). */
export interface SignalRow {
  molecule_id: string;
  molecule_name: string;
  level: Level;
  since: string;
  rule: RuleId;
  evidence: ShownEvidence;
  updated_at: string;
}

const RANK: Record<Level, number> = { confirmed: 4, likely: 3, watch: 2, cleared: 1, none: 0 };

export async function signalsFor(moleculeIds: string[]): Promise<Map<string, SignalView>> {
  if (moleculeIds.length === 0) return new Map();
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc('signals_view', { p_molecule_ids: moleculeIds });
  if (error) throw new Error(`signals_view: ${error.message}`);
  return new Map(
    ((data ?? []) as SignalRow[]).map((s) => [
      s.molecule_id,
      { level: s.level, since: s.since, rule: s.rule, evidence: s.evidence },
    ]),
  );
}

/** The pharmacy's followed molecules, the most serious level first. */
export async function getFollowed(): Promise<FollowedMolecule[]> {
  const supabase = await createUserClient();
  const { data, error } = await supabase.from('followed_molecules').select('molecule_id, molecules ( name )');
  if (error) throw new Error(`followed_molecules: ${error.message}`);
  const rows = (data ?? []).map((r) => ({
    moleculeId: r.molecule_id as string,
    name: (r.molecules as unknown as { name: string } | null)?.name ?? '',
  }));
  const signals = await signalsFor(rows.map((r) => r.moleculeId));
  return rows
    .map((r) => ({ ...r, signal: signals.get(r.moleculeId) ?? null }))
    .sort(
      (a, b) =>
        RANK[b.signal?.level ?? 'none'] - RANK[a.signal?.level ?? 'none'] || a.name.localeCompare(b.name, 'fr'),
    );
}

export interface OwnReport {
  id: string;
  kind: 'not_delivered' | 'delivered_again';
  orderedAt: string | null;
  reportedAt: string;
  channel: 'web' | 'whatsapp';
  origin: Origin;
}

export interface MoleculeView {
  id: string;
  name: string;
  signal: SignalView | null;
  notices: ForeignNotice[];
  reports: OwnReport[];
  followed: boolean;
}

export async function getMoleculeView(moleculeId: string): Promise<MoleculeView | null> {
  const supabase = await createUserClient();
  const { data: molecule } = await supabase.from('molecules').select('id, name').eq('id', moleculeId).maybeSingle();
  if (!molecule) return null;

  const [signals, notices, reports, follow] = await Promise.all([
    signalsFor([moleculeId]),
    supabase
      .from('foreign_notices')
      .select('id, molecule_id, source, status, published_at, url, origin')
      .eq('molecule_id', moleculeId),
    supabase
      .from('reports')
      .select('id, kind, ordered_at, reported_at, channel, origin')
      .eq('molecule_id', moleculeId)
      .order('reported_at', { ascending: false })
      .limit(20),
    supabase.from('followed_molecules').select('molecule_id').eq('molecule_id', moleculeId).maybeSingle(),
  ]);
  if (notices.error) throw new Error(`foreign_notices: ${notices.error.message}`);
  if (reports.error) throw new Error(`reports: ${reports.error.message}`);

  const allNotices: ForeignNotice[] = (notices.data ?? []).map((n) => ({
    id: n.id,
    moleculeId: n.molecule_id,
    source: n.source,
    status: n.status,
    publishedAt: new Date(n.published_at),
    url: n.url,
    origin: n.origin,
  }));

  return {
    id: molecule.id,
    name: molecule.name,
    signal: signals.get(moleculeId) ?? null,
    notices: activeNotices(moleculeId, allNotices, new Date(), DEFAULT_PARAMS),
    reports: (reports.data ?? []).map((r) => ({
      id: r.id,
      kind: r.kind,
      orderedAt: r.ordered_at,
      reportedAt: r.reported_at,
      channel: r.channel,
      origin: r.origin,
    })),
    followed: Boolean(follow.data),
  };
}

export interface AlertView {
  id: string;
  sentAt: string;
  readAt: string | null;
  moleculeId: string;
  moleculeName: string;
  from: Level;
  to: Level;
  rule: RuleId;
  evidence: ShownEvidence;
}

interface AlertRow {
  id: string;
  sent_at: string;
  read_at: string | null;
  molecule_id: string;
  molecule_name: string;
  from_level: Level;
  to_level: Level;
  rule: RuleId;
  evidence: ShownEvidence;
}

export async function getAlerts(): Promise<AlertView[]> {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc('my_alerts', { p_limit: 50 });
  if (error) throw new Error(`my_alerts: ${error.message}`);
  return ((data ?? []) as AlertRow[]).map((a) => ({
    id: a.id,
    sentAt: a.sent_at,
    readAt: a.read_at,
    moleculeId: a.molecule_id,
    moleculeName: a.molecule_name,
    from: a.from_level,
    to: a.to_level,
    rule: a.rule,
    evidence: a.evidence,
  }));
}

export async function countUnreadAlerts(): Promise<number> {
  const supabase = await createUserClient();
  const { count, error } = await supabase.from('alerts').select('id', { count: 'exact', head: true }).is('read_at', null);
  if (error) throw new Error(`alerts count: ${error.message}`);
  return count ?? 0;
}


/**
 * What the pharmacy's report added to, nationally: counts only (report_impact).
 * The time is passed from this server, whose clock also stamped the report's reported_at:
 * with the database's own now(), a report stamped a few seconds ahead would not count yet.
 */
export async function getImpact(moleculeId: string, at: Date = new Date()): Promise<Impact | null> {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc('report_impact', {
    p_molecule_id: moleculeId,
    ...countingParams(),
    p_at: at.toISOString(),
  });
  if (error) {
    console.error('report_impact failed', error.message);
    return null;
  }
  const row = (data as { pharmacies: string; governorates: number | null }[] | null)?.[0];
  return row ? { ...row, windowDays: DEFAULT_PARAMS.confirmWindowDays } : null;
}

/** Whether this pharmacy has ever reported the molecule as not delivered. */
export async function hasReportedNotDelivered(moleculeId: string): Promise<boolean> {
  const supabase = await createUserClient();
  const { data } = await supabase
    .from('reports')
    .select('id')
    .eq('molecule_id', moleculeId)
    .eq('kind', 'not_delivered')
    .limit(1);
  return (data ?? []).length > 0;
}
