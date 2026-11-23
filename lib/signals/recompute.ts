// The signal service: loads a molecule's evidence, calls evaluate() from lib/signal, and stores
// the result. No rule lives here; this file only moves data in and out of the warning logic.
//
// Data access is injected (SignalStore) so the service is unit tested without a network and
// run against the real migrations in PGlite. The Supabase store is in ./store.ts.

import 'server-only';
import {
  DEFAULT_PARAMS,
  evaluate,
  type Evaluation,
  type Evidence,
  type ForeignNotice,
  type Level,
  type Origin,
  type PharmacyReport,
  type RuleId,
  type SignalParams,
} from '@/lib/signal';

const DAY = 86_400_000;

/** How far back reports and notices are loaded. Covers every window in params.ts. */
export const LOOKBACK_DAYS = 120;

export { ACTIVE_MEMBER_DAYS } from './members';

export interface CurrentSignal {
  level: Level;
  since: Date;
  /** Exactly as stored (text, microseconds kept), for the compare-and-set. */
  updatedAt: string;
}

/** Evidence as stored in signals and signal_events: counts and public notices only. */
export interface StoredEvidence {
  pharmacies14d: number;
  governorates14d: number;
  pharmacies7d: number;
  deliveredAgainPharmacies: number;
  ignoredTooEarly: number;
  lastNotDeliveredAt: string | null;
  notices: { source: string; status: ForeignNotice['status']; publishedAt: string; url: string }[];
  /** Distinct origins of the reports and notices the evaluation read, for the origin badges. */
  origins: Origin[];
}

export interface ApplyInput {
  moleculeId: string;
  expected: Pick<CurrentSignal, 'level' | 'updatedAt'> | null;
  level: Level;
  since: Date;
  rule: RuleId;
  evidence: StoredEvidence;
  at: Date;
  /** Create alerts for the organisations concerned (when the level changes). */
  alert: boolean;
}

export interface SignalStore {
  load(
    moleculeId: string,
    from: Date,
    to: Date,
  ): Promise<{ reports: PharmacyReport[]; notices: ForeignNotice[]; current: CurrentSignal | null }>;
  /** Compare-and-set: writes only if the row is still `expected`. */
  apply(input: ApplyInput): Promise<{ applied: boolean; eventId: number | null }>;
  /** Molecules that have a signal row, for the daily re-evaluation. */
  moleculesWithSignal(): Promise<string[]>;
  /**
   * Member pharmacies active in the last ACTIVE_MEMBER_DAYS days, simulated accounts excluded.
   * Optional: without it, or when it returns null, the floor of the "confirmed" bar applies.
   */
  activeMemberPharmacies?(): Promise<number | null>;
}

export interface RecomputeResult {
  moleculeId: string;
  previous: Level;
  evaluation: Evaluation;
  /** The signal_events row written, when the level changed. */
  eventId: number | null;
  /** True when nothing needed storing (no row and no evidence). */
  skipped: boolean;
  attempts: number;
}

export class RecomputeConflictError extends Error {
  constructor(moleculeId: string, attempts: number) {
    super(`recomputeSignal: signal row for ${moleculeId} kept changing (${attempts} attempts)`);
    this.name = 'RecomputeConflictError';
  }
}

const ORIGIN_ORDER: Origin[] = ['official_source', 'tester', 'simulated'];

/** Distinct origins of the data an evaluation read, in a fixed order. */
export function originsOf(reports: { origin: Origin }[], notices: { origin: Origin }[]): Origin[] {
  const seen = new Set<Origin>([...reports, ...notices].map((x) => x.origin));
  return ORIGIN_ORDER.filter((o) => seen.has(o));
}

export function toStoredEvidence(e: Evidence, origins: Origin[] = []): StoredEvidence {
  return {
    pharmacies14d: e.pharmacies14d,
    governorates14d: e.governorates14d,
    pharmacies7d: e.pharmacies7d,
    deliveredAgainPharmacies: e.deliveredAgainPharmacies,
    ignoredTooEarly: e.ignoredTooEarly,
    lastNotDeliveredAt: e.lastNotDeliveredAt ? e.lastNotDeliveredAt.toISOString() : null,
    notices: e.activeNotices.map((n) => ({
      source: n.source,
      status: n.status,
      publishedAt: n.publishedAt.toISOString(),
      url: n.url,
    })),
    origins,
  };
}

/**
 * Re-evaluates one molecule at `now` and stores the result.
 * If another recompute changed the row in between, reloads and evaluates again, so two
 * reports arriving together never produce a duplicate or a skipped event.
 */
export async function recomputeSignal(
  store: SignalStore,
  moleculeId: string,
  now: Date,
  options: { params?: Partial<SignalParams>; maxAttempts?: number } = {},
): Promise<RecomputeResult> {
  const params = { ...DEFAULT_PARAMS, ...options.params };
  const maxAttempts = options.maxAttempts ?? 5;
  const from = new Date(now.getTime() - LOOKBACK_DAYS * DAY);

  const activeMemberPharmacies = store.activeMemberPharmacies ? await store.activeMemberPharmacies() : null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { reports, notices, current } = await store.load(moleculeId, from, now);
    const evaluation = evaluate({
      moleculeId,
      reports,
      notices,
      now,
      previous: current ? { level: current.level, since: current.since } : undefined,
      params,
      activeMemberPharmacies,
    });
    const previous = current?.level ?? 'none';

    // Nothing to store: no row yet and nothing to say.
    if (!current && evaluation.level === 'none') {
      return { moleculeId, previous, evaluation, eventId: null, skipped: true, attempts: attempt };
    }

    const { applied, eventId } = await store.apply({
      moleculeId,
      expected: current ? { level: current.level, updatedAt: current.updatedAt } : null,
      level: evaluation.level,
      since: evaluation.since,
      rule: evaluation.rule,
      evidence: toStoredEvidence(evaluation.evidence, originsOf(reports, notices)),
      at: now,
      // A shown "levée" fading back to "none" is logged, but nobody is alerted for it.
      alert: evaluation.changed && evaluation.rule !== 'cleared_expired',
    });
    if (applied) {
      return { moleculeId, previous, evaluation, eventId, skipped: false, attempts: attempt };
    }
  }
  throw new RecomputeConflictError(moleculeId, maxAttempts);
}

/** Daily re-evaluation: time-based rules (quiet period, stale, cleared expiry) apply without new reports. */
export async function recomputeAll(
  store: SignalStore,
  now: Date,
  options: { params?: Partial<SignalParams> } = {},
): Promise<{ checked: number; changed: number; failed: number }> {
  const ids = await store.moleculesWithSignal();
  let changed = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      const result = await recomputeSignal(store, id, now, options);
      if (result.evaluation.changed) changed++;
    } catch (error) {
      failed++;
      console.error('recomputeAll: molecule failed', id, error instanceof Error ? error.message : error);
    }
  }
  return { checked: ids.length, changed, failed };
}

/** Params passed to SQL functions that count reports, so SQL never decides a threshold. */
export function countingParams(params: SignalParams = DEFAULT_PARAMS) {
  return {
    p_window_days: params.confirmWindowDays,
    p_min_undelivered_hours: params.minUndeliveredHours,
  };
}
