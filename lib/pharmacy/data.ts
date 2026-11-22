// What a pharmacy's screens read. Everything goes through the visitor's own session, so
// row-level security applies: a pharmacy reads its own reports, follows and alerts, the
// public catalogue, and signals as counts. Nothing here uses the service role.

import 'server-only';
import { createUserClient } from '@/lib/db/server';
import { activeNotices, DEFAULT_PARAMS, type ForeignNotice, type Level, type Origin, type RuleId } from '@/lib/signal';
import { countingParams, type StoredEvidence } from '@/lib/signals/recompute';

export interface SignalView {
  level: Level;
  since: string;
  rule: RuleId;
  evidence: StoredEvidence;
}

export interface FollowedMolecule {
  moleculeId: string;
  name: string;
  signal: SignalView | null;
}

const RANK: Record<Level, number> = { confirmed: 4, likely: 3, watch: 2, cleared: 1, none: 0 };

export async function signalsFor(moleculeIds: string[]): Promise<Map<string, SignalView>> {
  if (moleculeIds.length === 0) return new Map();
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('signals')
    .select('molecule_id, level, since, rule, evidence')
    .in('molecule_id', moleculeIds);
  if (error) throw new Error(`signals: ${error.message}`);
  return new Map(
    (data ?? []).map((s) => [
      s.molecule_id as string,
      { level: s.level as Level, since: s.since as string, rule: s.rule as RuleId, evidence: s.evidence as StoredEvidence },
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
  evidence: StoredEvidence;
}

interface AlertEventRow {
  from_level: Level;
  to_level: Level;
  rule: RuleId;
  evidence: StoredEvidence;
  molecule_id: string;
  molecules: { name: string } | null;
}

export async function getAlerts(): Promise<AlertView[]> {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('alerts')
    .select('id, sent_at, read_at, signal_events ( from_level, to_level, rule, evidence, molecule_id, molecules ( name ) )')
    .order('sent_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(`alerts: ${error.message}`);
  return (data ?? []).flatMap((a) => {
    const e = a.signal_events as unknown as AlertEventRow | null;
    if (!e) return [];
    return [
      {
        id: a.id as string,
        sentAt: a.sent_at as string,
        readAt: a.read_at as string | null,
        moleculeId: e.molecule_id,
        moleculeName: e.molecules?.name ?? '',
        from: e.from_level,
        to: e.to_level,
        rule: e.rule,
        evidence: e.evidence,
      },
    ];
  });
}

export async function countUnreadAlerts(): Promise<number> {
  const supabase = await createUserClient();
  const { count, error } = await supabase.from('alerts').select('id', { count: 'exact', head: true }).is('read_at', null);
  if (error) throw new Error(`alerts count: ${error.message}`);
  return count ?? 0;
}

export interface Impact {
  /** "<3" below 3 pharmacies, otherwise the number. */
  pharmacies: string;
  /** Withheld (null) below 3 pharmacies. */
  governorates: number | null;
  windowDays: number;
}

/** What the pharmacy's report added to, nationally: counts only (report_impact). */
export async function getImpact(moleculeId: string): Promise<Impact | null> {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc('report_impact', { p_molecule_id: moleculeId, ...countingParams() });
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
