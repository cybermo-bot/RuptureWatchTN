// Loads the coordination view for one caller. Everything goes through the caller's own client,
// so the same loader serves the coordinator, the hospital pharmacy, the wholesaler and /vues.

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
  // The full history feeds the key figures' 14-day series; the log shows its newest 200 rows.
  const [all, history] = await Promise.all([listSignals(client), listEvents(client, null, 1000)]);
  const events = withEventLog ? history.slice(0, 200) : null;
  const signals = sortSignals(all);
  const selected = signals.find((s) => s.molecule_id === selectedId) ?? signals[0] ?? null;
  if (!selected) return { signals, selected, counts: [], demand: [], notices: [], timeline: [], history, events };

  const [counts, demand, notices] = await Promise.all([
    governorateCounts(client, selected.molecule_id),
    demandByGovernorate(client, selected.molecule_id),
    activeNoticesFor(client, selected.molecule_id),
  ]);
  const timeline = history.filter((e) => e.molecule_id === selected.molecule_id).slice(0, 50);
  return { signals, selected, counts, demand, notices, timeline, history, events };
}
