// What the professional screens read about signals, through the caller's own client: every
// function takes the Supabase client of the person (or demo role) asking, so the database's
// access rules decide what comes back. Counts arrive already suppressed ('<3').
// Used by the coordination and hospital spaces, the export, and /vues (one client per role).

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { activeNotices, DEFAULT_PARAMS, type ForeignNotice, type Level, type Origin, type RuleId } from '@/lib/signal';
import { countingParams } from '@/lib/signals/recompute';
import type { ShownEvidence } from '@/lib/signals/shown';

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

/** A row of signal_events_view: one level change and the rule that fired. */
export interface EventRow {
  id: number;
  molecule_id: string;
  molecule_name: string;
  from_level: Level;
  to_level: Level;
  rule: RuleId;
  evidence: ShownEvidence;
  at: string;
}

/** Pharmacies reporting, per governorate, from governorate_counts ('<3' below 3). */
export interface GovernorateCount {
  governorate_code: string;
  governorate_name: string;
  pharmacies: string;
}

/** Patient requests per governorate, from demand_by_governorate ('<3' below 3). */
export interface DemandRow {
  governorate_code: string;
  requests: string;
  answered: string;
  unanswered: string;
}

export type ActiveLevel = Exclude<Level, 'none'>;

/** Most serious first: confirmed, likely, watch, then cleared. */
export const LEVEL_ORDER: ActiveLevel[] = ['confirmed', 'likely', 'watch', 'cleared'];

export function isActive(level: Level): level is ActiveLevel {
  return level !== 'none';
}

/** Molecules with an active level, confirmed first, then likely, watch, cleared; newest first within a level. */
export function sortSignals<T extends { level: Level; since: string }>(rows: T[]): T[] {
  return rows
    .filter((r) => isActive(r.level))
    .sort(
      (a, b) =>
        LEVEL_ORDER.indexOf(a.level as ActiveLevel) - LEVEL_ORDER.indexOf(b.level as ActiveLevel) ||
        b.since.localeCompare(a.since),
    );
}

export async function listSignals(client: SupabaseClient, moleculeIds?: string[]): Promise<SignalRow[]> {
  const { data, error } = await client.rpc('signals_view', moleculeIds ? { p_molecule_ids: moleculeIds } : {});
  if (error) throw new Error(`signals_view: ${error.message}`);
  return (data ?? []) as SignalRow[];
}

export async function listEvents(client: SupabaseClient, moleculeId: string | null, limit = 200): Promise<EventRow[]> {
  const { data, error } = await client.rpc('signal_events_view', { p_molecule_id: moleculeId, p_limit: limit });
  if (error) throw new Error(`signal_events_view: ${error.message}`);
  return (data ?? []) as EventRow[];
}

export async function governorateCounts(client: SupabaseClient, moleculeId: string, at: Date = new Date()): Promise<GovernorateCount[]> {
  const { data, error } = await client.rpc('governorate_counts', {
    p_molecule_id: moleculeId,
    ...countingParams(),
    p_at: at.toISOString(),
  });
  if (error) throw new Error(`governorate_counts: ${error.message}`);
  return (data ?? []) as GovernorateCount[];
}

/** Demand window shown next to a signal, in days. */
export const DEMAND_WINDOW_DAYS = 7;

export async function demandByGovernorate(client: SupabaseClient, moleculeId: string): Promise<DemandRow[]> {
  const { data, error } = await client.rpc('demand_by_governorate', {
    p_molecule_id: moleculeId,
    p_window_days: DEMAND_WINDOW_DAYS,
  });
  if (error) throw new Error(`demand_by_governorate: ${error.message}`);
  return (data ?? []) as DemandRow[];
}

/** The notices that count today for this molecule (latest per regulator, not resolved, recent). */
export async function activeNoticesFor(client: SupabaseClient, moleculeId: string, now: Date = new Date()): Promise<ForeignNotice[]> {
  const { data, error } = await client
    .from('foreign_notices')
    .select('id, molecule_id, source, status, published_at, url, origin')
    .eq('molecule_id', moleculeId);
  if (error) throw new Error(`foreign_notices: ${error.message}`);
  const all: ForeignNotice[] = (data ?? []).map((n) => ({
    id: n.id as string,
    moleculeId: n.molecule_id as string,
    source: n.source as string,
    status: n.status as ForeignNotice['status'],
    publishedAt: new Date(n.published_at as string),
    url: n.url as string,
    origin: n.origin as Origin,
  }));
  return activeNotices(moleculeId, all, now, DEFAULT_PARAMS);
}

/** What anyone may know: confirmed or not, since when, and the origins behind it (public_status). */
export interface PublicStatus {
  confirmed: boolean;
  since: string | null;
  origins: Origin[];
}

export async function publicStatus(client: SupabaseClient, moleculeId: string): Promise<PublicStatus> {
  const { data, error } = await client.rpc('public_status', { p_molecule_id: moleculeId });
  if (error) throw new Error(`public_status: ${error.message}`);
  const row = (data as PublicStatus[] | null)?.[0];
  return row ?? { confirmed: false, since: null, origins: [] };
}
