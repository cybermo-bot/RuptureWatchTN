// A deterministic, clearly simulated week of reports for one molecule.
// Used by the "Run a scenario" button and the demo video. Every row has origin "simulated".

import type { ForeignNotice, PharmacyReport } from './types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export interface DemoPharmacy {
  id: string;
  governorateCode: string;
}

export interface ScenarioStep {
  /** Offset from the scenario start, in hours. */
  atHours: number;
  /** Short label for the timeline, as an i18n key the interface translates. */
  labelKey: string;
  report?: PharmacyReport;
  notice?: ForeignNotice;
}

export interface ScenarioOptions {
  moleculeId: string;
  start: Date;
  /** At least 6 demo pharmacies, in at least 2 governorates. */
  pharmacies: DemoPharmacy[];
  /** Optional foreign notice that opens the scenario. */
  notice?: { source: string; url: string };
}

/**
 * The story the scenario tells:
 * day 0 a foreign notice (watch: foreign evidence alone never goes further),
 * day 2 one pharmacy reports (likely: local report plus foreign notice; without a notice it stays watch),
 * days 3 to 4 two more pharmacies in the same governorate (likely: one governorate cannot confirm alone),
 * day 5 a pharmacy in a second governorate (confirmed: four pharmacies, two governorates),
 * day 6 a fifth report (confirmed, held),
 * days 21 to 22 two pharmacies report the medicine delivered again (cleared, after 14 quiet days).
 */
export function buildScenario(opts: ScenarioOptions): ScenarioStep[] {
  const { moleculeId, start, pharmacies } = opts;
  const govs = new Set(pharmacies.map((p) => p.governorateCode));
  if (pharmacies.length < 6 || govs.size < 2) {
    throw new Error('buildScenario needs at least 6 demo pharmacies in at least 2 governorates');
  }

  // Three reporters in the first governorate, then two in other governorates.
  const firstGov = pharmacies[0].governorateCode;
  const inFirst = pharmacies.filter((p) => p.governorateCode === firstGov);
  const elsewhere = pharmacies.filter((p) => p.governorateCode !== firstGov);
  if (inFirst.length < 3 || elsewhere.length < 2) {
    throw new Error('buildScenario needs 3 pharmacies in the first governorate and 2 elsewhere');
  }
  const order = [...inFirst.slice(0, 3), ...elsewhere.slice(0, 2)];

  const at = (h: number) => new Date(start.getTime() + h * HOUR);
  let n = 0;
  const id = () => `sim-${moleculeId}-${++n}`;

  const notDelivered = (p: DemoPharmacy, reportHour: number): PharmacyReport => ({
    id: id(),
    pharmacyId: p.id,
    governorateCode: p.governorateCode,
    moleculeId,
    kind: 'not_delivered',
    orderedAt: at(reportHour - 80), // ordered 80 hours before the report, past the 72-hour rule
    reportedAt: at(reportHour),
    origin: 'simulated',
  });

  const delivered = (p: DemoPharmacy, reportHour: number): PharmacyReport => ({
    id: id(),
    pharmacyId: p.id,
    governorateCode: p.governorateCode,
    moleculeId,
    kind: 'delivered_again',
    orderedAt: null,
    reportedAt: at(reportHour),
    origin: 'simulated',
  });

  const steps: ScenarioStep[] = [];
  if (opts.notice) {
    steps.push({
      atHours: 0,
      labelKey: 'scenario.foreignNotice',
      notice: {
        id: id(),
        moleculeId,
        source: opts.notice.source,
        status: 'shortage',
        publishedAt: at(0),
        url: opts.notice.url,
        origin: 'simulated',
      },
    });
  }
  steps.push({ atHours: 2 * 24, labelKey: 'scenario.firstReport', report: notDelivered(order[0], 2 * 24) });
  steps.push({ atHours: 3 * 24, labelKey: 'scenario.secondReport', report: notDelivered(order[1], 3 * 24) });
  steps.push({ atHours: 4 * 24, labelKey: 'scenario.thirdReport', report: notDelivered(order[2], 4 * 24) });
  steps.push({ atHours: 5 * 24, labelKey: 'scenario.otherGovernorate', report: notDelivered(order[3], 5 * 24) });
  steps.push({ atHours: 6 * 24, labelKey: 'scenario.fifthReport', report: notDelivered(order[4], 6 * 24) });
  steps.push({ atHours: 21 * 24, labelKey: 'scenario.deliveredAgain', report: delivered(order[0], 21 * 24) });
  steps.push({ atHours: 22 * 24, labelKey: 'scenario.deliveredAgain', report: delivered(order[3], 22 * 24) });
  return steps;
}

export const SCENARIO_LENGTH_DAYS = 22;
export { DAY as SCENARIO_DAY_MS };

export interface FalseAlarmOptions {
  moleculeId: string;
  start: Date;
  /** At least 4 demo pharmacies, all in the same governorate. */
  pharmacies: DemoPharmacy[];
}

/**
 * The false alarms the thresholds are there to stop, both in one governorate:
 * one confused pharmacy reports the same medicine every day from day 1 to day 14,
 * and on days 4 to 6 three other pharmacies of the same governorate report (one wholesaler late).
 * With the default values neither confirms: one pharmacy counts once, one governorate stops at
 * "probable". With low settings (one governorate, or fewer pharmacies) they do.
 */
export function buildFalseAlarmScenario(opts: FalseAlarmOptions): ScenarioStep[] {
  const { moleculeId, start, pharmacies } = opts;
  const gov = pharmacies[0]?.governorateCode;
  if (pharmacies.length < 4 || pharmacies.some((p) => p.governorateCode !== gov)) {
    throw new Error('buildFalseAlarmScenario needs at least 4 demo pharmacies in one governorate');
  }
  const at = (h: number) => new Date(start.getTime() + h * HOUR);
  let n = 0;
  const report = (p: DemoPharmacy, h: number): PharmacyReport => ({
    id: `sim-fa-${moleculeId}-${++n}`,
    pharmacyId: p.id,
    governorateCode: p.governorateCode,
    moleculeId,
    kind: 'not_delivered',
    orderedAt: at(h - 80), // past the 72-hour rule, like the main scenario
    reportedAt: at(h),
    origin: 'simulated',
  });
  const steps: ScenarioStep[] = [];
  for (let day = 1; day <= 14; day++) steps.push({ atHours: day * 24 + 9, labelKey: 'scenario.dailyReport', report: report(pharmacies[0], day * 24 + 9) });
  for (const [i, day] of [4, 5, 6].entries()) {
    steps.push({ atHours: day * 24 + 15, labelKey: 'scenario.regionalReport', report: report(pharmacies[i + 1], day * 24 + 15) });
  }
  return steps.sort((a, b) => a.atHours - b.atHours);
}
