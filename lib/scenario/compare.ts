// "Comparer les cas" (part 7, handoff C): the same four fictional pharmacies report on the same
// days in both cases; only the governorate of the fourth changes. "Signal réparti": Tunis then
// Sfax, so gate two is met and the level reaches "confirmée". "Signal concentré": all four in
// Tunis, so it stays "probable" (single_governorate_cap). Then the same recovery in both: an
// arrival announced upstream, which changes no level, then two pharmacies report the medicine
// delivered again, which lifts it. evaluate() from lib/signal, in memory, deterministic: nothing
// is read from or written to the database.

import {
  countByGovernorate,
  DEFAULT_PARAMS,
  evaluate,
  type DemoPharmacy,
  type Level,
  type PharmacyReport,
  type PreviousState,
  type RuleId,
} from '@/lib/signal';
import type { MissingEvidence } from '@/lib/signals/missing';
import { shownEvidence, type ShownEvidence } from '@/lib/signals/shown';

export type CompareCase = 'spread' | 'concentrated';
export const COMPARE_CASES: CompareCase[] = ['spread', 'concentrated'];

export type CompareStepKind = 'start' | 'report' | 'arrival' | 'delivered';

export interface CompareFrame {
  index: number;
  day: number;
  at: string;
  kind: CompareStepKind;
  /** 1 to 4 for the four "not delivered" reports, 1 or 2 for "delivered again". */
  ordinal: number | null;
  governorateCode: string | null;
  /** The one step where the two cases differ: the fourth report's governorate. */
  differs: boolean;
  previous: Level;
  level: Level;
  rule: RuleId;
  changed: boolean;
  /** As the scenario shows it ('<3' below 3), for the explanation. */
  evidence: ShownEvidence;
  /** Exact counts, for "Ce qui manque": the cases are fictional, nothing to protect. */
  exact: MissingEvidence;
  counts: { governorateCode: string; display: string }[];
}

const MOLECULE = 'compare-demo';
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
export const COMPARE_START = new Date('2026-01-05T08:00:00Z');

const TUNIS = 'TN-11';
const SFAX = 'TN-61';

/** Fictional pharmacies. The fourth is the only difference between the cases. */
export function comparePharmacies(c: CompareCase): DemoPharmacy[] {
  return [
    { id: 'demo-tunis-1', governorateCode: TUNIS },
    { id: 'demo-tunis-2', governorateCode: TUNIS },
    { id: 'demo-tunis-3', governorateCode: TUNIS },
    c === 'spread' ? { id: 'demo-sfax-1', governorateCode: SFAX } : { id: 'demo-tunis-4', governorateCode: TUNIS },
  ];
}

interface Step {
  day: number;
  kind: Exclude<CompareStepKind, 'start'>;
  ordinal: number | null;
  pharmacy: number | null;
}

// Days: four reports on days 1 to 4; the arrival announced on day 10; "delivered again" on days
// 19 and 20 by two Tunis pharmacies in both cases, once the quiet period after the last report
// (quietDays) has passed.
const STEPS: Step[] = [
  { day: 1, kind: 'report', ordinal: 1, pharmacy: 0 },
  { day: 2, kind: 'report', ordinal: 2, pharmacy: 1 },
  { day: 3, kind: 'report', ordinal: 3, pharmacy: 2 },
  { day: 4, kind: 'report', ordinal: 4, pharmacy: 3 },
  { day: 10, kind: 'arrival', ordinal: null, pharmacy: null },
  { day: 4 + DEFAULT_PARAMS.quietDays + 1, kind: 'delivered', ordinal: 1, pharmacy: 0 },
  { day: 4 + DEFAULT_PARAMS.quietDays + 2, kind: 'delivered', ordinal: 2, pharmacy: 1 },
];

function exactEvidence(e: ReturnType<typeof evaluate>['evidence']): MissingEvidence {
  return {
    pharmacies14d: e.pharmacies14d,
    governorates14d: e.governorates14d,
    pharmacies7d: e.pharmacies7d,
    deliveredAgainPharmacies: e.deliveredAgainPharmacies,
    lastNotDeliveredAt: e.lastNotDeliveredAt,
  };
}

export function compareFrames(c: CompareCase): CompareFrame[] {
  const pharmacies = comparePharmacies(c);
  const reports: PharmacyReport[] = [];
  let previous: PreviousState = { level: 'none', since: COMPARE_START };
  const first = evaluate({ moleculeId: MOLECULE, reports, notices: [], now: COMPARE_START, params: DEFAULT_PARAMS });
  const frames: CompareFrame[] = [
    {
      index: 0,
      day: 0,
      at: COMPARE_START.toISOString(),
      kind: 'start',
      ordinal: null,
      governorateCode: null,
      differs: false,
      previous: 'none',
      level: first.level,
      rule: first.rule,
      changed: false,
      evidence: shownEvidence(first.evidence, ['simulated']),
      exact: exactEvidence(first.evidence),
      counts: [],
    },
  ];

  for (const step of STEPS) {
    const now = new Date(COMPARE_START.getTime() + step.day * DAY);
    const p = step.pharmacy === null ? null : pharmacies[step.pharmacy];
    if (p && step.kind === 'report') {
      reports.push({
        id: `sim-${MOLECULE}-${c}-${reports.length + 1}`,
        pharmacyId: p.id,
        governorateCode: p.governorateCode,
        moleculeId: MOLECULE,
        kind: 'not_delivered',
        orderedAt: new Date(now.getTime() - 80 * HOUR), // past the 72-hour rule, as in the scenario
        reportedAt: now,
        origin: 'simulated',
      });
    }
    if (p && step.kind === 'delivered') {
      reports.push({
        id: `sim-${MOLECULE}-${c}-${reports.length + 1}`,
        pharmacyId: p.id,
        governorateCode: p.governorateCode,
        moleculeId: MOLECULE,
        kind: 'delivered_again',
        orderedAt: null,
        reportedAt: now,
        origin: 'simulated',
      });
    }
    // An announced arrival is not an input of evaluate(): the level is evaluated again, unchanged.
    const e = evaluate({ moleculeId: MOLECULE, reports, notices: [], now, previous, params: DEFAULT_PARAMS });
    frames.push({
      index: frames.length,
      day: step.day,
      at: now.toISOString(),
      kind: step.kind,
      ordinal: step.ordinal,
      governorateCode: p?.governorateCode ?? null,
      differs: step.kind === 'report' && step.ordinal === 4,
      previous: previous.level,
      level: e.level,
      rule: e.rule,
      changed: e.changed,
      evidence: shownEvidence(e.evidence, ['simulated']),
      exact: exactEvidence(e.evidence),
      counts: countByGovernorate(reports, MOLECULE, now, DEFAULT_PARAMS).map((g) => ({ governorateCode: g.governorateCode, display: g.display })),
    });
    previous = { level: e.level, since: e.since, clearedAt: e.clearedAt };
  }
  return frames;
}

/** Active member pharmacies up to which the floor of 4 is the bar ("à l'échelle d'un pilote"). */
export function pilotScaleMembers(params = DEFAULT_PARAMS): number {
  return Math.floor(params.confirmMinPharmacies / params.confirmMemberShare);
}
