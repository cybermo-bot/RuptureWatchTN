// Loads the coordination view for one caller. Everything goes through the caller's own client,
// so the same loader serves the coordinator, the hospital pharmacy and the /vues panels.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DashboardData } from '@/components/coordination/SignalsDashboard';
import {
  activeNoticesFor,
  demandByGovernorate,
  governorateCounts,
  listEvents,
  listSignals,
  sortSignals,
} from '@/lib/signals/views';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function selectedParam(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v && UUID.test(v) ? v : null;
}

export async function loadDashboard(
  client: SupabaseClient,
  selectedId: string | null,
  { withEventLog }: { withEventLog: boolean },
): Promise<DashboardData> {
  const [all, events] = await Promise.all([listSignals(client), withEventLog ? listEvents(client, null, 200) : Promise.resolve(null)]);
  const signals = sortSignals(all);
  const selected = signals.find((s) => s.molecule_id === selectedId) ?? signals[0] ?? null;
  if (!selected) return { signals, selected, counts: [], demand: [], notices: [], timeline: [], events };

  const [counts, demand, notices, timeline] = await Promise.all([
    governorateCounts(client, selected.molecule_id),
    demandByGovernorate(client, selected.molecule_id),
    activeNoticesFor(client, selected.molecule_id),
    listEvents(client, selected.molecule_id, 50),
  ]);
  return { signals, selected, counts, demand, notices, timeline, events };
}
