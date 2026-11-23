// The warning logic: turns pharmacy reports and foreign notices into a level per molecule.
// Pure function. Same code for the web app, the WhatsApp bot, the simulator and the replay.

import { DEFAULT_PARAMS, type SignalParams } from './params';
import type {
  Evaluation,
  Evidence,
  ForeignNotice,
  Level,
  PharmacyReport,
  PreviousState,
  RuleId,
} from './types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const RANK: Record<Level, number> = { none: 0, cleared: 0, watch: 1, likely: 2, confirmed: 3 };

export function isActiveLevel(level: Level): boolean {
  return level === 'watch' || level === 'likely' || level === 'confirmed';
}

export interface EvaluateInput {
  moleculeId: string;
  reports: PharmacyReport[];
  notices: ForeignNotice[];
  now: Date;
  previous?: PreviousState;
  params?: Partial<SignalParams>;
  /**
   * Member pharmacies active recently (a report or a sign-in), simulated accounts excluded.
   * Raises the "confirmed" bar on a large network. Missing: the floor applies.
   */
  activeMemberPharmacies?: number | null;
}

/**
 * Distinct pharmacies needed for "confirmed": confirmMinPharmacies, or the network share of
 * the active member pharmacies when that is larger. Without a member count, the floor.
 */
export function confirmPharmaciesNeeded(params: SignalParams, activeMemberPharmacies?: number | null): number {
  const floor = params.confirmMinPharmacies;
  if (activeMemberPharmacies === undefined || activeMemberPharmacies === null) return floor;
  if (!Number.isFinite(activeMemberPharmacies) || activeMemberPharmacies <= 0) return floor;
  return Math.max(floor, Math.ceil(params.confirmMemberShare * activeMemberPharmacies));
}

/** Collects the facts the rules need. Exported so screens can explain a level. */
export function collectEvidence(
  moleculeId: string,
  reports: PharmacyReport[],
  notices: ForeignNotice[],
  now: Date,
  params: SignalParams,
): Evidence {
  const t = now.getTime();
  const mine = reports.filter((r) => r.moleculeId === moleculeId && r.reportedAt.getTime() <= t);

  const notDelivered = mine.filter((r) => r.kind === 'not_delivered');
  const valid = notDelivered.filter(
    (r) =>
      r.orderedAt !== null &&
      r.orderedAt.getTime() <= r.reportedAt.getTime() &&
      r.reportedAt.getTime() - r.orderedAt.getTime() >= params.minUndeliveredHours * HOUR,
  );

  const within = (r: PharmacyReport, days: number) => t - r.reportedAt.getTime() < days * DAY;
  const inConfirm = valid.filter((r) => within(r, params.confirmWindowDays));
  const inLikely = valid.filter((r) => within(r, params.likelyWindowDays));

  const lastNotDeliveredAt = valid.length
    ? new Date(Math.max(...valid.map((r) => r.reportedAt.getTime())))
    : null;

  const deliveredAgain = mine.filter(
    (r) =>
      r.kind === 'delivered_again' &&
      (lastNotDeliveredAt === null || r.reportedAt.getTime() > lastNotDeliveredAt.getTime()),
  );

  return {
    pharmacies14d: new Set(inConfirm.map((r) => r.pharmacyId)).size,
    governorates14d: new Set(inConfirm.map((r) => r.governorateCode)).size,
    pharmacies7d: new Set(inLikely.map((r) => r.pharmacyId)).size,
    activeNotices: activeNotices(moleculeId, notices, now, params),
    deliveredAgainPharmacies: new Set(deliveredAgain.map((r) => r.pharmacyId)).size,
    lastNotDeliveredAt,
    ignoredTooEarly: notDelivered.length - valid.length,
  };
}

/** Latest notice per source; active if it is not "resolved" and recent enough. */
export function activeNotices(
  moleculeId: string,
  notices: ForeignNotice[],
  now: Date,
  params: SignalParams,
): ForeignNotice[] {
  const t = now.getTime();
  const latestBySource = new Map<string, ForeignNotice>();
  for (const n of notices) {
    if (n.moleculeId !== moleculeId || n.publishedAt.getTime() > t) continue;
    const prev = latestBySource.get(n.source);
    if (!prev || n.publishedAt.getTime() > prev.publishedAt.getTime()) latestBySource.set(n.source, n);
  }
  return [...latestBySource.values()].filter(
    (n) => n.status !== 'resolved' && t - n.publishedAt.getTime() <= params.noticeActiveDays * DAY,
  );
}

/**
 * The level the current evidence supports, before any hold or clearing rule.
 * `clearedAt`: a notice published before the last levée does not count alone (it may still
 * accompany a new Tunisian report).
 */
function rawLevel(e: Evidence, p: SignalParams, confirmNeeded: number, clearedAt: Date | null): { level: Level; rule: RuleId } {
  if (e.pharmacies14d >= confirmNeeded && e.governorates14d >= p.confirmMinGovernorates) {
    return { level: 'confirmed', rule: 'confirmed_threshold' };
  }
  if (e.pharmacies14d >= confirmNeeded) {
    return { level: 'likely', rule: 'single_governorate_cap' };
  }
  if (e.pharmacies7d >= p.likelyMinPharmacies) {
    return { level: 'likely', rule: 'two_pharmacies_7d' };
  }
  if (e.pharmacies14d >= 1 && e.activeNotices.length > 0) {
    return { level: 'likely', rule: 'local_report_plus_foreign_notice' };
  }
  if (e.pharmacies14d >= 1) {
    return { level: 'watch', rule: 'local_reports_below_threshold' };
  }
  const sinceLevee = clearedAt
    ? e.activeNotices.filter((n) => n.publishedAt.getTime() > clearedAt.getTime())
    : e.activeNotices;
  if (sinceLevee.length > 0) {
    return { level: 'watch', rule: 'foreign_notice_only' };
  }
  return { level: 'none', rule: 'no_evidence' };
}

export function evaluate(input: EvaluateInput): Evaluation {
  const p: SignalParams = { ...DEFAULT_PARAMS, ...input.params };
  const { moleculeId, now } = input;
  const previous: PreviousState = input.previous ?? { level: 'none', since: new Date(0) };
  const t = now.getTime();

  const previousClearedAt = previous.clearedAt ?? (previous.level === 'cleared' ? previous.since : null);

  const evidence = collectEvidence(moleculeId, input.reports, input.notices, now, p);
  let { level, rule } = rawLevel(evidence, p, confirmPharmaciesNeeded(p, input.activeMemberPharmacies), previousClearedAt);

  // A shown "cleared" stays for a few days, then returns to "none".
  if (previous.level === 'cleared' && level === 'none') {
    if (t - previous.since.getTime() >= p.clearedDisplayDays * DAY) {
      rule = 'cleared_expired';
    } else {
      level = 'cleared';
      rule = 'delivered_again_cleared';
    }
  }

  // Likely and confirmed do not fall just because reporting slows down.
  // They end when the medicine is delivered again, or after a long quiet period.
  if (
    (previous.level === 'likely' || previous.level === 'confirmed') &&
    RANK[level] < RANK[previous.level]
  ) {
    const quiet = evidence.lastNotDeliveredAt
      ? t - evidence.lastNotDeliveredAt.getTime()
      : Number.POSITIVE_INFINITY;

    if (quiet >= p.quietDays * DAY && evidence.deliveredAgainPharmacies >= p.clearMinDeliveredPharmacies) {
      level = 'cleared';
      rule = 'delivered_again_cleared';
    } else if (quiet >= p.staleDays * DAY) {
      rule = 'quiet_period_downgrade'; // keep the raw level
    } else {
      level = previous.level;
      rule = 'hold_until_delivered';
    }
  }

  const changed = level !== previous.level;
  const direction: Evaluation['direction'] =
    !changed ? 'same' : RANK[level] > RANK[previous.level] ? 'up' : 'down';
  const standDown = changed && isActiveLevel(previous.level) && !isActiveLevel(level);

  return {
    moleculeId,
    level,
    rule,
    evidence,
    changed,
    direction,
    standDown,
    since: changed ? now : previous.since,
    clearedAt: changed && level === 'cleared' ? now : previousClearedAt,
  };
}
