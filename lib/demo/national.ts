// The national demo picture: around the demo shortage (amlodipine, "confirmée"), four more
// simulated situations, each showing one rule at work, with their history over the last 30 days:
//
//   TAMOXIFENE      "probable"            five pharmacies, all in Sfax: gate two holds it below
//                                         "confirmée" (single_governorate_cap). Patient requests,
//                                         and a wholesaler split not applied, with its reason.
//   METFORMINE      "sous surveillance"   one pharmacy in Gabès (local_reports_below_threshold).
//   AZATHIOPRINE    "sous surveillance"   a foreign notice alone: gate one (foreign_notice_only).
//   CIPROFLOXACINE  "levée"               confirmed three weeks ago in Tunis and Sousse, then
//                                         delivered again by two pharmacies (delivered_again_cleared).
//
// All five come from the CNAM list, each with several brands; tamoxifen and azathioprine are
// vital ("V"). None has a report, follow, notice, request or past episode of its own: the run
// refuses to start otherwise, so clearing returns the database to exactly where it was.
// Every row is origin = simulated and has a fixed id; `npm run demo:clear` removes exactly these.
//
// Data access is injected (NationalStore): scripts use Supabase, the test PGlite.

import { createHash } from 'node:crypto';
import { demoSplit, recommendedJson } from '@/lib/allocation/decisions';
import { recomputeSignal, type RecomputeResult, type SignalStore } from '@/lib/signals/recompute';
import { DEMO_ROLES } from './roles';
import { DEMO_SHORTAGE_MOLECULE } from './shortage';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ORDER_DELAY_DAYS = 5;

const fixedId = (prefix: string, n: number) => `00000000-0000-4000-8000-${prefix}${n.toString(16).padStart(12 - prefix.length, '0')}`;

export const NATIONAL_MOLECULES = {
  probable: 'TAMOXIFENE',
  watchLocal: 'METFORMINE',
  watchForeign: 'AZATHIOPRINE',
  cleared: 'CIPROFLOXACINE',
} as const;
type Situation = keyof typeof NATIONAL_MOLECULES;

/** The demo wholesaler (one-click role), author of the two simulated decisions. */
export const DEMO_WHOLESALER_ID = DEMO_ROLES.find((r) => r.key === 'grossiste')!.organisationId;

/** Seed demo pharmacies used as reporters (never the one-click ones, A in Tunis and F in Sfax). */
const SEED = {
  sfax1: '00000000-0000-4000-8000-000000000a07',
  sfax2: '00000000-0000-4000-8000-000000000a08',
  tunis2: '00000000-0000-4000-8000-000000000a02',
  tunis3: '00000000-0000-4000-8000-000000000a03',
  sousse1: '00000000-0000-4000-8000-000000000a09',
  sousse2: '00000000-0000-4000-8000-000000000a10',
};

/** New simulated pharmacies: governorate. Numbered after the demo shortage's (13 to 23). */
const NEW_PHARMACIES = ['TN-61', 'TN-61', 'TN-61', 'TN-81'] as const;

/** Every id this demo can create: what demo:clear removes. */
export const NATIONAL_IDS = {
  organisations: NEW_PHARMACIES.map((_, i) => fixedId('de4', i + 1)),
  reports: Array.from({ length: 13 }, (_, i) => fixedId('de5', i + 1)),
  requests: Array.from({ length: 6 }, (_, i) => fixedId('de6', i + 1)),
  notices: [fixedId('de7', 1)],
  decisions: [fixedId('de8', 1), fixedId('de8', 2)],
};

const newPharmacy = (n: number) => NATIONAL_IDS.organisations[n];

/** Reports: situation, pharmacy, governorate, kind, days ago. */
const REPORTS: [Situation, string, string, 'not_delivered' | 'delivered_again', number][] = [
  // Tamoxifen: five pharmacies, all in Sfax, over ten days.
  ['probable', SEED.sfax1, 'TN-61', 'not_delivered', 10.2],
  ['probable', newPharmacy(0), 'TN-61', 'not_delivered', 8.4],
  ['probable', SEED.sfax2, 'TN-61', 'not_delivered', 6.1],
  ['probable', newPharmacy(1), 'TN-61', 'not_delivered', 4.3],
  ['probable', newPharmacy(2), 'TN-61', 'not_delivered', 1.6],
  // Metformin: one pharmacy in Gabès.
  ['watchLocal', newPharmacy(3), 'TN-81', 'not_delivered', 3.2],
  // Ciprofloxacin: confirmed in Tunis and Sousse 26 to 21 days ago, then delivered again.
  ['cleared', SEED.tunis2, 'TN-11', 'not_delivered', 26.3],
  ['cleared', SEED.sousse1, 'TN-51', 'not_delivered', 25.1],
  ['cleared', SEED.tunis3, 'TN-11', 'not_delivered', 23.8],
  ['cleared', SEED.sousse2, 'TN-51', 'not_delivered', 22.4],
  ['cleared', SEED.tunis2, 'TN-11', 'not_delivered', 21.2],
  ['cleared', SEED.sousse1, 'TN-51', 'delivered_again', 5.3],
  ['cleared', SEED.tunis3, 'TN-11', 'delivered_again', 4.1],
];

/** Patient requests on tamoxifen: governorate, days ago. Four in Sfax so the count reads 4. */
const REQUESTS: [string, number][] = [
  ['TN-61', 0.3],
  ['TN-61', 1.2],
  ['TN-61', 2.5],
  ['TN-61', 3.9],
  ['TN-11', 0.9],
  ['TN-51', 2.1],
];

/**
 * Answers from demo pharmacies of the request's own governorate (never a one-click pharmacy,
 * so the video's answer stays free): request index, pharmacy, answer, shows itself, minutes
 * after the request. Tunis: one shows itself, one stays anonymous. Sousse and Sfax: no.
 * The other Sfax requests stay unanswered, as the coordination unit's demand figures show.
 */
const ANSWERS: [number, string, 'available' | 'unavailable', boolean, number][] = [
  [4, SEED.tunis2, 'available', true, 20],
  [4, SEED.tunis3, 'available', false, 45],
  [5, SEED.sousse1, 'unavailable', false, 30],
  [1, SEED.sfax1, 'unavailable', false, 50],
];

/** The foreign notice: a fictional regulator, linked to the page that says what simulated data is. */
export const DEMO_NOTICE_SOURCE = 'Régulateur fictif (démonstration)';
export const DEMO_NOTICE_URL = 'https://rupturewatch-tn.vercel.app/methode#origine';
const NOTICE_DAYS_AGO = 12.5;

/** The two wholesaler decisions: on the confirmed medicine applied, on the probable one not. */
export const DECISION_REASON = 'Livraison partielle annoncée par le fournisseur : la répartition attend son arrivage.';

export interface NationalPlan {
  organisations: { id: string; type: 'pharmacy'; display_name: string; governorate_code: string; origin: 'simulated' }[];
  reports: {
    id: string;
    organisation_id: string;
    governorate_code: string;
    molecule_id: string;
    kind: 'not_delivered' | 'delivered_again';
    ordered_at: string | null;
    reported_at: string;
    channel: 'web';
    origin: 'simulated';
  }[];
  requests: {
    id: string;
    molecule_id: string;
    governorate_code: string;
    created_at: string;
    expires_at: string;
    device_hash: string;
    origin: 'simulated';
  }[];
  answers: {
    request_id: string;
    organisation_id: string;
    answer: 'available' | 'unavailable';
    show_identity: boolean;
    answered_at: string;
    origin: 'simulated';
  }[];
  notices: { id: string; molecule_id: string; source: string; status: 'shortage'; published_at: string; url: string; origin: 'simulated' }[];
  decisions: {
    id: string;
    molecule_id: string;
    organisation_id: string;
    stock: number;
    recommended: ReturnType<typeof recommendedJson>;
    applied: boolean;
    deviation_reason: string | null;
    decided_at: string;
    origin: 'simulated';
  }[];
}

const iso = (now: Date, daysAgo: number) => new Date(now.getTime() - daysAgo * DAY).toISOString();

export function buildDemoNational(
  ids: Record<Situation, string> & { confirmed: string },
  now: Date,
  governorateNames: Map<string, string>,
): NationalPlan {
  const organisations = NEW_PHARMACIES.map((code, i) => ({
    id: NATIONAL_IDS.organisations[i],
    type: 'pharmacy' as const,
    display_name: `Pharmacie démo ${24 + i}, ${governorateNames.get(code) ?? code}`,
    governorate_code: code,
    origin: 'simulated' as const,
  }));
  const reports = REPORTS.map(([situation, organisation, code, kind, daysAgo], i) => {
    const reportedAt = new Date(now.getTime() - daysAgo * DAY);
    return {
      id: NATIONAL_IDS.reports[i],
      organisation_id: organisation,
      governorate_code: code,
      molecule_id: ids[situation],
      kind,
      ordered_at: kind === 'not_delivered' ? new Date(reportedAt.getTime() - ORDER_DELAY_DAYS * DAY).toISOString() : null,
      reported_at: reportedAt.toISOString(),
      channel: 'web' as const,
      origin: 'simulated' as const,
    };
  });
  const requests = REQUESTS.map(([code, daysAgo], i) => {
    const created = new Date(now.getTime() - daysAgo * DAY);
    return {
      id: NATIONAL_IDS.requests[i],
      molecule_id: ids.probable,
      governorate_code: code,
      created_at: created.toISOString(),
      expires_at: new Date(created.getTime() + 3 * HOUR).toISOString(),
      // A fixed, recognisable hash: no device ever produced it.
      device_hash: createHash('sha256').update(`rupturewatch-demo-national-${i + 1}`).digest('hex'),
      origin: 'simulated' as const,
    };
  });
  const answers = ANSWERS.map(([index, organisation, answer, show, minutes]) => ({
    request_id: requests[index].id,
    organisation_id: organisation,
    answer,
    show_identity: show,
    answered_at: new Date(Date.parse(requests[index].created_at) + minutes * 60_000).toISOString(),
    origin: 'simulated' as const,
  }));
  const notices = [
    {
      id: NATIONAL_IDS.notices[0],
      molecule_id: ids.watchForeign,
      source: DEMO_NOTICE_SOURCE,
      status: 'shortage' as const,
      published_at: iso(now, NOTICE_DAYS_AGO),
      url: DEMO_NOTICE_URL,
      origin: 'simulated' as const,
    },
  ];
  const decisions = [
    { id: NATIONAL_IDS.decisions[0], molecule: ids.confirmed, stock: 1200, applied: true, reason: null, daysAgo: 1.8 },
    { id: NATIONAL_IDS.decisions[1], molecule: ids.probable, stock: 300, applied: false, reason: DECISION_REASON, daysAgo: 0.7 },
  ].map((d) => ({
    id: d.id,
    molecule_id: d.molecule,
    organisation_id: DEMO_WHOLESALER_ID,
    stock: d.stock,
    recommended: recommendedJson(demoSplit(d.stock)),
    applied: d.applied,
    deviation_reason: d.reason,
    decided_at: iso(now, d.daysAgo),
    origin: 'simulated' as const,
  }));
  return { organisations, reports, requests, answers, notices, decisions };
}

export interface NationalStore {
  moleculeIdByName(name: string): Promise<string | null>;
  governorateNames(): Promise<Map<string, string>>;
  /** Rows on the molecule that are not this demo's: reports, follows, notices, requests, decisions, a signal. */
  otherUses(moleculeId: string): Promise<number>;
  /** How many of this demo's rows exist. */
  demoRows(): Promise<number>;
  insert(plan: NationalPlan): Promise<void>;
  /** Deletes the demo rows by id, children first. */
  deleteIds(ids: typeof NATIONAL_IDS): Promise<Record<'decisions' | 'answers' | 'requests' | 'notices' | 'reports' | 'organisations', number>>;
  resetSignal(moleculeId: string): Promise<{ alerts: number; events: number; signals: number }>;
  signalStore: SignalStore;
}

export type NationalRunResult =
  | { status: 'created'; molecules: Record<Situation, string>; plan: NationalPlan; final: Record<Situation, RecomputeResult>; changes: RecomputeResult[] }
  | { status: 'already' }
  | { status: 'refused'; reason: string };

/**
 * Inserts the national picture (the demo shortage must already be in place: it is the confirmed
 * medicine) and replays the signal service at each report's and notice's time, so every
 * medicine's history shows its levels on the days they happened.
 */
export async function runDemoNational(store: NationalStore, now: Date = new Date()): Promise<NationalRunResult> {
  if ((await store.demoRows()) > 0) return { status: 'already' };
  const confirmed = await store.moleculeIdByName(DEMO_SHORTAGE_MOLECULE);
  if (!confirmed) return { status: 'refused', reason: `molecule "${DEMO_SHORTAGE_MOLECULE}" is not in the catalogue` };
  const molecules = {} as Record<Situation, string>;
  for (const [situation, name] of Object.entries(NATIONAL_MOLECULES) as [Situation, string][]) {
    const id = await store.moleculeIdByName(name);
    if (!id) return { status: 'refused', reason: `molecule "${name}" is not in the catalogue` };
    if ((await store.otherUses(id)) > 0) {
      return { status: 'refused', reason: `"${name}" already has data of its own: the demo would mix with it` };
    }
    molecules[situation] = id;
  }
  const plan = buildDemoNational({ ...molecules, confirmed }, now, await store.governorateNames());
  await store.insert(plan);

  // Replay in time order: each report and the notice, at its own time.
  const moments = [
    ...plan.reports.map((r) => ({ molecule: r.molecule_id, at: r.reported_at })),
    ...plan.notices.map((n) => ({ molecule: n.molecule_id, at: n.published_at })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const changes: RecomputeResult[] = [];
  for (const m of moments) {
    const result = await recomputeSignal(store.signalStore, m.molecule, new Date(m.at));
    if (result.evaluation.changed) changes.push(result);
  }
  const final = {} as Record<Situation, RecomputeResult>;
  for (const [situation, id] of Object.entries(molecules) as [Situation, string][]) {
    final[situation] = await recomputeSignal(store.signalStore, id, now);
  }
  return { status: 'created', molecules, plan, final, changes };
}

/** Resets the four molecules' signals, removes exactly the demo rows, and recomputes from what remains. */
export async function runNationalClear(store: NationalStore, now: Date = new Date()) {
  const ids: string[] = [];
  for (const name of Object.values(NATIONAL_MOLECULES)) {
    const id = await store.moleculeIdByName(name);
    if (id) ids.push(id);
  }
  const resets = [];
  for (const id of ids) resets.push(await store.resetSignal(id));
  const deleted = await store.deleteIds(NATIONAL_IDS);
  // If anyone else reported one of them meanwhile, their evidence gets its level back.
  for (const id of ids) await recomputeSignal(store.signalStore, id, now);
  const reset = resets.reduce((a, r) => ({ alerts: a.alerts + r.alerts, events: a.events + r.events, signals: a.signals + r.signals }), {
    alerts: 0,
    events: 0,
    signals: 0,
  });
  return { deleted, reset };
}
