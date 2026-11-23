// The ministry's space (the coordinator role, /coordination): the shared dashboard in the
// ministry's order, plus its key figures, the national map by level and the daily charts.
// Everything through the coordinator's own client; every figure computed.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DashboardData } from '@/components/coordination/SignalsDashboard';
import { listDecisions } from '@/lib/allocation/decisions';
import { moleculesAtLevelPerDay } from '@/lib/charts/series';
import { loadDashboard } from '@/lib/coordination/dashboard';
import { combineByGovernorate } from '@/lib/home/national';
import { byLevelCategoryBrands, type CatalogueFacts } from '@/lib/institutions/catalogue';
import {
  dailyActivity,
  demandTotals,
  listArrivals,
  loadCatalogueFacts,
  upcomingArrivals,
  type Arrival,
  type DayActivity,
} from '@/lib/institutions/data';
import { governorateCounts, LEVEL_ORDER, type ActiveLevel, type SignalRow } from '@/lib/signals/views';

export const CHART_DAYS = 30;
export const DEMAND_FIGURE_DAYS = 7;

export function levelParam(value: string | string[] | undefined): ActiveLevel | null {
  const v = Array.isArray(value) ? value[0] : value;
  return LEVEL_ORDER.find((l) => l === v) ?? null;
}

export interface MinistryData {
  dashboard: DashboardData;
  facts: Map<string, CatalogueFacts>;
  /** Governorate code -> its most serious level, among the medicines at the chosen level (or all). */
  map: Record<string, ActiveLevel>;
  /** Governorates with pharmacies reporting a medicine that has a level. */
  governoratesAffected: number;
  vitalConfirmed: number;
  vitalConfirmedSeries: number[];
  demand: { requests: string; unanswered: string } | null;
  activity: DayActivity[] | null;
  arrival: Arrival | null;
}

async function safe<T>(label: string, p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (error) {
    console.error(`ministry: ${label} failed`, error instanceof Error ? error.message : error);
    return null;
  }
}

export async function loadMinistry(client: SupabaseClient, selectedId: string | null, mapLevel: ActiveLevel | null): Promise<MinistryData> {
  let facts = new Map<string, CatalogueFacts>();
  const dashboard = await loadDashboard(client, selectedId, {
    withEventLog: true,
    order: async (rows) => {
      facts = await loadCatalogueFacts(client, rows.map((r) => r.molecule_id));
      return byLevelCategoryBrands(rows, facts);
    },
  });
  const { signals, history, selected } = dashboard;

  // Facts for molecules that only appear in the history (the vital series looks back 14 days).
  const missing = [...new Set(history.map((e) => e.molecule_id))].filter((id) => !facts.has(id));
  const [moreFacts, perMolecule, decisions, arrivals, demand, activity, upcoming] = await Promise.all([
    loadCatalogueFacts(client, missing),
    Promise.all(
      signals.map(async (s: SignalRow) => ({
        level: s.level as ActiveLevel,
        governorates: (await governorateCounts(client, s.molecule_id)).map((c) => c.governorate_code),
      })),
    ),
    safe('decisions', listDecisions(client, null, 50)).then((d) => d ?? null),
    safe('arrivals', listArrivals(client, 50)),
    safe('demand totals', demandTotals(client, DEMAND_FIGURE_DAYS)),
    selected ? safe('daily activity', dailyActivity(client, selected.molecule_id, CHART_DAYS)) : Promise.resolve(null),
    selected ? safe('upcoming arrival', upcomingArrivals(client, [selected.molecule_id])) : Promise.resolve(null),
  ]);
  for (const [id, f] of moreFacts) facts.set(id, f);

  const vital = new Set([...facts].filter(([, f]) => f.category === 'V').map(([id]) => id));
  const affected = new Set(perMolecule.flatMap((m) => m.governorates));
  return {
    dashboard: { ...dashboard, decisions, arrivals },
    facts,
    map: combineByGovernorate(mapLevel ? perMolecule.filter((m) => m.level === mapLevel) : perMolecule),
    governoratesAffected: affected.size,
    vitalConfirmed: signals.filter((s) => s.level === 'confirmed' && vital.has(s.molecule_id)).length,
    vitalConfirmedSeries: moleculesAtLevelPerDay(
      history.filter((e) => vital.has(e.molecule_id)),
      'confirmed',
      14,
    ),
    demand,
    activity,
    arrival: selected ? (upcoming?.get(selected.molecule_id) ?? null) : null,
  };
}
