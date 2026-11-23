// The demo shortage: a simulated shortage of one real molecule, spreading over eleven days
// through twenty-three simulated pharmacies in thirteen governorates, for the video and the
// other tracks' screens. Every row is origin = simulated and has a fixed id, so
// `npm run demo:clear` removes exactly what `npm run demo:shortage` created and nothing else.
//
// The molecule is amlodipine: thirteen brands on the CNAM list, no tester reports or follows,
// no past episode in data/reference/episodes.csv and no foreign notice, so the simulated
// shortage cannot be mistaken for, or mixed with, real data. The run
// refuses to start if anyone else has reported it or it already has a signal, so clearing
// returns the database to exactly where it was.
//
// Data access is injected (DemoStore): scripts/demo-shortage.ts uses Supabase, the test PGlite.

import { createHash } from 'node:crypto';
import { recomputeSignal, type RecomputeResult, type SignalStore } from '@/lib/signals/recompute';

export const DEMO_SHORTAGE_MOLECULE = 'AMLODIPINE';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Days between the order and the report: above the 72-hour minimum, like a real late order. */
const ORDER_DELAY_DAYS = 5;

const fixedId = (prefix: string, n: number) => `00000000-0000-4000-8000-${prefix}${n.toString(16).padStart(12 - prefix.length, '0')}`;

/**
 * Who reports, in order: a seed pharmacy (its id) or a new simulated one (null). It starts in
 * Sfax and Sousse, reaches Tunis, then spreads. Sfax, Tunis and Sousse end with 3 or more
 * reporters, so the coordination map shows counts there and "<3" elsewhere. The one-click
 * pharmacies (Tunis A, Sfax F) stay free for a live report during the demo.
 */
const REPORTERS: { seedId: string | null; governorateCode: string }[] = [
  { seedId: '00000000-0000-4000-8000-000000000a07', governorateCode: 'TN-61' },
  { seedId: '00000000-0000-4000-8000-000000000a08', governorateCode: 'TN-61' },
  { seedId: '00000000-0000-4000-8000-000000000a09', governorateCode: 'TN-51' },
  { seedId: null, governorateCode: 'TN-61' },
  { seedId: '00000000-0000-4000-8000-000000000a02', governorateCode: 'TN-11' },
  { seedId: '00000000-0000-4000-8000-000000000a10', governorateCode: 'TN-51' },
  { seedId: null, governorateCode: 'TN-61' },
  { seedId: '00000000-0000-4000-8000-000000000a03', governorateCode: 'TN-11' },
  { seedId: '00000000-0000-4000-8000-000000000a04', governorateCode: 'TN-12' },
  { seedId: null, governorateCode: 'TN-11' },
  { seedId: '00000000-0000-4000-8000-000000000a11', governorateCode: 'TN-41' },
  { seedId: null, governorateCode: 'TN-51' },
  { seedId: null, governorateCode: 'TN-52' },
  { seedId: '00000000-0000-4000-8000-000000000a05', governorateCode: 'TN-12' },
  { seedId: null, governorateCode: 'TN-21' },
  { seedId: null, governorateCode: 'TN-11' },
  { seedId: '00000000-0000-4000-8000-000000000a12', governorateCode: 'TN-41' },
  { seedId: null, governorateCode: 'TN-23' },
  { seedId: null, governorateCode: 'TN-53' },
  { seedId: null, governorateCode: 'TN-81' },
  { seedId: null, governorateCode: 'TN-71' },
  { seedId: null, governorateCode: 'TN-82' },
  { seedId: null, governorateCode: 'TN-42' },
];
const NEW_PHARMACIES = REPORTERS.filter((r) => r.seedId === null).length;

export interface DemoOrganisation {
  id: string;
  type: 'pharmacy';
  display_name: string;
  governorate_code: string;
  origin: 'simulated';
}

export interface DemoReport {
  id: string;
  organisation_id: string;
  governorate_code: string;
  molecule_id: string;
  kind: 'not_delivered';
  ordered_at: string;
  reported_at: string;
  channel: 'web';
  origin: 'simulated';
}

export interface DemoRequest {
  id: string;
  molecule_id: string;
  governorate_code: string;
  created_at: string;
  expires_at: string;
  device_hash: string;
  origin: 'simulated';
}

export interface DemoPlan {
  organisations: DemoOrganisation[];
  reports: DemoReport[];
  requests: DemoRequest[];
}

/** Every id this demo can create: what demo:clear removes. Independent of the molecule and the time. */
export const DEMO_IDS = {
  organisations: Array.from({ length: NEW_PHARMACIES }, (_, i) => fixedId('de1', i + 1)),
  reports: REPORTERS.map((_, i) => fixedId('de2', i + 1)),
  requests: Array.from({ length: 8 }, (_, i) => fixedId('de3', i + 1)),
};

/** Patient requests over the last days: governorate and days ago. Four in Tunis so a count reads 4, not "<3". */
const REQUESTS: [string, number][] = [
  ['TN-11', 0.2],
  ['TN-11', 1.1],
  ['TN-11', 2.4],
  ['TN-11', 3.6],
  ['TN-61', 0.8],
  ['TN-61', 2.9],
  ['TN-51', 1.7],
  ['TN-23', 0.5],
];

/** The rows to insert, dated back from `now`: a report about every eleven hours, spreading outwards. */
export function buildDemoShortage(moleculeId: string, now: Date, governorateNames: Map<string, string>): DemoPlan {
  const organisations: DemoOrganisation[] = [];
  const reporters = REPORTERS.map((r) => {
    if (r.seedId) return { id: r.seedId, governorateCode: r.governorateCode };
    const n = organisations.length;
    organisations.push({
      id: DEMO_IDS.organisations[n],
      type: 'pharmacy',
      // Numbered after the seed's twelve demo pharmacies (A to L).
      display_name: `Pharmacie démo ${String(13 + n).padStart(2, '0')}, ${governorateNames.get(r.governorateCode) ?? r.governorateCode}`,
      governorate_code: r.governorateCode,
      origin: 'simulated',
    });
    return { id: DEMO_IDS.organisations[n], governorateCode: r.governorateCode };
  });
  // First report eleven days ago, last one about a day ago: within the 14-day confirm window.
  const step = 10 / (reporters.length - 1);
  const reports: DemoReport[] = reporters.map((r, i) => {
    const reportedAt = new Date(now.getTime() - (11 - i * step) * DAY + (i % 3) * 2 * HOUR);
    return {
      id: DEMO_IDS.reports[i],
      organisation_id: r.id,
      governorate_code: r.governorateCode,
      molecule_id: moleculeId,
      kind: 'not_delivered',
      ordered_at: new Date(reportedAt.getTime() - ORDER_DELAY_DAYS * DAY).toISOString(),
      reported_at: reportedAt.toISOString(),
      channel: 'web',
      origin: 'simulated',
    };
  });
  const requests: DemoRequest[] = REQUESTS.map(([code, daysAgo], i) => {
    const created = new Date(now.getTime() - daysAgo * DAY);
    return {
      id: DEMO_IDS.requests[i],
      molecule_id: moleculeId,
      governorate_code: code,
      created_at: created.toISOString(),
      expires_at: new Date(created.getTime() + 3 * HOUR).toISOString(),
      // A fixed, recognisable hash: no device ever produced it.
      device_hash: createHash('sha256').update(`rupturewatch-demo-shortage-${i + 1}`).digest('hex'),
      origin: 'simulated',
    };
  });
  return { organisations, reports, requests };
}

export interface DemoStore {
  moleculeIdByName(name: string): Promise<string | null>;
  governorateNames(): Promise<Map<string, string>>;
  /** Reports on the molecule that are not this demo's, whether it has a signal row, and how many demo rows exist. */
  state(moleculeId: string): Promise<{ otherReports: number; hasSignal: boolean; demoRows: number }>;
  insert(plan: DemoPlan): Promise<void>;
  /** Deletes the answers to the demo requests, the requests, the reports, then the organisations, by id. */
  deleteIds(ids: typeof DEMO_IDS): Promise<{ answers: number; requests: number; reports: number; organisations: number }>;
  resetSignal(moleculeId: string): Promise<{ alerts: number; events: number; signals: number }>;
  signalStore: SignalStore;
}

export type DemoRunResult =
  | { status: 'created'; moleculeId: string; plan: DemoPlan; final: RecomputeResult; changes: RecomputeResult[] }
  | { status: 'already'; moleculeId: string }
  | { status: 'refused'; reason: string };

/**
 * Inserts the demo shortage and replays the signal service at each report's time, so the
 * molecule's history shows the climb (watch, likely, confirmed) on the days it happened.
 */
export async function runDemoShortage(store: DemoStore, now: Date = new Date()): Promise<DemoRunResult> {
  const moleculeId = await store.moleculeIdByName(DEMO_SHORTAGE_MOLECULE);
  if (!moleculeId) return { status: 'refused', reason: `molecule "${DEMO_SHORTAGE_MOLECULE}" is not in the catalogue` };
  const before = await store.state(moleculeId);
  if (before.demoRows > 0) return { status: 'already', moleculeId };
  if (before.otherReports > 0 || before.hasSignal) {
    return { status: 'refused', reason: 'someone else has reported this molecule or it has a signal: the demo would mix with real data' };
  }
  const plan = buildDemoShortage(moleculeId, now, await store.governorateNames());
  await store.insert(plan);
  const changes: RecomputeResult[] = [];
  for (const r of plan.reports) {
    const result = await recomputeSignal(store.signalStore, moleculeId, new Date(r.reported_at));
    if (result.evaluation.changed) changes.push(result);
  }
  const final = await recomputeSignal(store.signalStore, moleculeId, now);
  return { status: 'created', moleculeId, plan, final, changes };
}

/** Resets the molecule's signal, removes exactly the demo rows, and recomputes from what remains. */
export async function runDemoClear(store: DemoStore, now: Date = new Date()) {
  const moleculeId = await store.moleculeIdByName(DEMO_SHORTAGE_MOLECULE);
  // The signal first: its alerts and events refer to the demo, never the other way round.
  const reset = moleculeId ? await store.resetSignal(moleculeId) : null;
  const deleted = await store.deleteIds(DEMO_IDS);
  if (!moleculeId) return { deleted, reset, recomputed: null };
  // If anyone else reported the molecule meanwhile, their evidence gets its level back.
  const recomputed = await recomputeSignal(store.signalStore, moleculeId, now);
  return { deleted, reset, recomputed };
}
