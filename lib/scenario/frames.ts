// The scenario, computed in memory: buildScenario() from lib/signal gives the steps, evaluate()
// gives the level after each one. Nothing is read from or written to the database.
// Runs in the browser (the /scenario page) and in tests.

import {
  buildScenario,
  countByGovernorate,
  DEFAULT_PARAMS,
  evaluate,
  SCENARIO_DAY_MS,
  type DemoPharmacy,
  type ForeignNotice,
  type Level,
  type PharmacyReport,
  type PreviousState,
  type RuleId,
} from '@/lib/signal';
import type { MissingEvidence } from '@/lib/signals/missing';
import { shownEvidence, type ShownEvidence } from '@/lib/signals/shown';

export const SCENARIO_MOLECULE = 'scenario-demo';

// Fictional pharmacies: three in Tunis, two in Sfax, one in Sousse.
export const SCENARIO_PHARMACIES: DemoPharmacy[] = [
  { id: 'demo-tunis-1', governorateCode: 'TN-11' },
  { id: 'demo-tunis-2', governorateCode: 'TN-11' },
  { id: 'demo-tunis-3', governorateCode: 'TN-11' },
  { id: 'demo-sfax-1', governorateCode: 'TN-61' },
  { id: 'demo-sfax-2', governorateCode: 'TN-61' },
  { id: 'demo-sousse-1', governorateCode: 'TN-51' },
];

/** Who is alerted when a level changes (lib/signals: every change but cleared_expired). */
export type AlertRecipient = 'followers' | 'wholesalers' | 'hospitals' | 'coordination';

export interface ScenarioFrame {
  index: number;
  /** Days since the start of the scenario. */
  day: number;
  /** i18n key of the step, without the "core." prefix; null for the starting frame. */
  labelKey: string | null;
  /** Governorate of the pharmacy behind the step, if any. */
  governorateCode: string | null;
  previous: Level;
  level: Level;
  rule: RuleId;
  evidence: ShownEvidence;
  /** The same evidence with exact counts: the scenario is fictional, so "Ce qui manque" may count. */
  exact: MissingEvidence;
  /** The evaluation time of the frame (ISO). */
  at: string;
  changed: boolean;
  standDown: boolean;
  /** Pharmacies reporting, by governorate, as displayed ('<3' below 3). */
  counts: { governorateCode: string; display: string }[];
  alerted: AlertRecipient[];
}

const START = new Date('2026-01-05T08:00:00Z');

export function scenarioFrames(noticeSource: string, noticeUrl: string): ScenarioFrame[] {
  const steps = buildScenario({
    moleculeId: SCENARIO_MOLECULE,
    start: START,
    pharmacies: SCENARIO_PHARMACIES,
    notice: { source: noticeSource, url: noticeUrl },
  });

  const reports: PharmacyReport[] = [];
  const notices: ForeignNotice[] = [];
  let previous: PreviousState = { level: 'none', since: START };
  const frames: ScenarioFrame[] = [
    {
      index: 0,
      day: 0,
      labelKey: null,
      governorateCode: null,
      previous: 'none',
      level: 'none',
      rule: 'no_evidence',
      evidence: shownEvidence(evaluate({ moleculeId: SCENARIO_MOLECULE, reports, notices, now: START }).evidence),
      exact: { pharmacies14d: 0, governorates14d: 0, pharmacies7d: 0, deliveredAgainPharmacies: 0, lastNotDeliveredAt: null },
      at: START.toISOString(),
      changed: false,
      standDown: false,
      counts: [],
      alerted: [],
    },
  ];

  for (const step of steps) {
    if (step.report) reports.push(step.report);
    if (step.notice) notices.push(step.notice);
    const now = new Date(START.getTime() + step.atHours * 3_600_000);
    const e = evaluate({ moleculeId: SCENARIO_MOLECULE, reports, notices, now, previous, params: DEFAULT_PARAMS });
    const alerted: AlertRecipient[] =
      e.changed && e.rule !== 'cleared_expired' ? ['followers', 'wholesalers', 'hospitals', 'coordination'] : [];
    frames.push({
      index: frames.length,
      day: Math.round((now.getTime() - START.getTime()) / SCENARIO_DAY_MS),
      labelKey: step.labelKey,
      governorateCode: step.report?.governorateCode ?? null,
      previous: previous.level,
      level: e.level,
      rule: e.rule,
      evidence: shownEvidence(e.evidence, ['simulated']),
      exact: {
        pharmacies14d: e.evidence.pharmacies14d,
        governorates14d: e.evidence.governorates14d,
        pharmacies7d: e.evidence.pharmacies7d,
        deliveredAgainPharmacies: e.evidence.deliveredAgainPharmacies,
        lastNotDeliveredAt: e.evidence.lastNotDeliveredAt,
      },
      at: now.toISOString(),
      changed: e.changed,
      standDown: e.standDown,
      counts: countByGovernorate(reports, SCENARIO_MOLECULE, now, DEFAULT_PARAMS).map((c) => ({
        governorateCode: c.governorateCode,
        display: c.display,
      })),
      alerted,
    });
    previous = { level: e.level, since: e.since, clearedAt: e.clearedAt };
  }
  return frames;
}

/** The home page's frozen moment: the step where the scenario first reaches "confirmée". */
export function frozenFrame(frames: ScenarioFrame[]): ScenarioFrame {
  return frames.find((f) => f.changed && f.level === 'confirmed') ?? frames[frames.length - 1];
}
