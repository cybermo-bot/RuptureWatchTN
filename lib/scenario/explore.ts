// The threshold explorer: replays a simulated scenario through evaluate() with other thresholds,
// in memory (in the browser on the methods page). Writes nothing. Pure.

import {
  buildFalseAlarmScenario,
  buildScenario,
  DEFAULT_PARAMS,
  evaluate,
  type ForeignNotice,
  type Level,
  type PharmacyReport,
  type ScenarioStep,
  type SignalParams,
} from '@/lib/signal';
import { SCENARIO_MOLECULE, SCENARIO_PHARMACIES } from './frames';

const DAY = 86_400_000;

export interface Replay {
  /** The level at the end of each day, day 0 to the last. */
  days: Level[];
  /** The first day each level was reached. */
  firstDay: Partial<Record<Level, number>>;
}

/** Evaluates at every step and at the end of every day, in time order, carrying the previous level. */
export function replay(steps: ScenarioStep[], start: Date, lengthDays: number, params: Partial<SignalParams> = {}): Replay {
  const p: SignalParams = { ...DEFAULT_PARAMS, ...params };
  const moments = [
    ...steps.map((s) => ({ at: s.atHours * 3_600_000, step: s as ScenarioStep | null })),
    ...Array.from({ length: lengthDays + 1 }, (_, d) => ({ at: (d + 1) * DAY - 1, step: null })),
  ].sort((a, b) => a.at - b.at || (a.step ? -1 : 1));
  const reports: PharmacyReport[] = [];
  const notices: ForeignNotice[] = [];
  const moleculeId = steps.find((s) => s.report)?.report?.moleculeId ?? steps[0]?.notice?.moleculeId ?? 'scenario';
  let previous = { level: 'none' as Level, since: start };
  const days: Level[] = [];
  const firstDay: Partial<Record<Level, number>> = {};
  for (const m of moments) {
    if (m.step?.report) reports.push(m.step.report);
    if (m.step?.notice) notices.push(m.step.notice);
    const now = new Date(start.getTime() + m.at);
    const e = evaluate({ moleculeId, reports, notices, now, previous, params: p });
    previous = { level: e.level, since: e.since };
    const day = Math.floor(m.at / DAY);
    if (e.level !== 'none' && firstDay[e.level] === undefined) firstDay[e.level] = day;
    if (!m.step && day <= lengthDays) days[day] = e.level;
  }
  return { days, firstDay };
}

/** The settings the explorer moves, with their ranges. */
export const EXPLORER_SETTINGS = {
  confirmMinPharmacies: { min: 2, max: 12, step: 1 },
  confirmMinGovernorates: { min: 1, max: 5, step: 1 },
  likelyMinPharmacies: { min: 1, max: 5, step: 1 },
  minUndeliveredHours: { min: 24, max: 120, step: 12 },
} as const;

export type ExplorerSetting = keyof typeof EXPLORER_SETTINGS;
export type ExplorerValues = Record<ExplorerSetting, number>;

export const EXPLORER_DEFAULTS: ExplorerValues = {
  confirmMinPharmacies: DEFAULT_PARAMS.confirmMinPharmacies,
  confirmMinGovernorates: DEFAULT_PARAMS.confirmMinGovernorates,
  likelyMinPharmacies: DEFAULT_PARAMS.likelyMinPharmacies,
  minUndeliveredHours: DEFAULT_PARAMS.minUndeliveredHours,
};

export const EXPLORER_START = new Date('2026-01-05T08:00:00Z');
export const EXPLORER_DAYS = 22;

/** Fictional pharmacies of the false alarms, all in Kairouan. */
const FALSE_ALARM_PHARMACIES = [1, 2, 3, 4].map((i) => ({ id: `demo-kairouan-${i}`, governorateCode: 'TN-41' }));

/** The two simulated scenarios: a real shortage (the /scenario story) and two false alarms. */
export function explorerScenarios(noticeSource: string, noticeUrl: string): { real: ScenarioStep[]; falseAlarm: ScenarioStep[] } {
  return {
    real: buildScenario({ moleculeId: SCENARIO_MOLECULE, start: EXPLORER_START, pharmacies: SCENARIO_PHARMACIES, notice: { source: noticeSource, url: noticeUrl } }),
    falseAlarm: buildFalseAlarmScenario({ moleculeId: `${SCENARIO_MOLECULE}-fausse-alerte`, start: EXPLORER_START, pharmacies: FALSE_ALARM_PHARMACIES }),
  };
}
