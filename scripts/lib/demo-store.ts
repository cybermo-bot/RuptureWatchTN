// DemoStore over Supabase with the service role, for demo:shortage and demo:clear.

import type { SupabaseClient } from '@supabase/supabase-js';
import { DEMO_IDS, type DemoStore } from '../../lib/demo/shortage';
import { supabaseSignalStore } from '../../lib/signals/store';

type Result<T> = { data: T; error: { message: string } | null };
type CountResult = { count: number | null; error: { message: string } | null };

export function supabaseDemoStore(client: SupabaseClient): DemoStore {
  const must = <T>(label: string, r: Result<T>): T => {
    if (r.error) throw new Error(`${label}: ${r.error.message}`);
    return r.data;
  };
  const countOf = async (label: string, q: PromiseLike<CountResult>) => {
    const r = await q;
    if (r.error) throw new Error(`${label}: ${r.error.message}`);
    return r.count ?? 0;
  };

  return {
    async moleculeIdByName(name) {
      const data = must('molecules', await client.from('molecules').select('id').eq('name', name).maybeSingle());
      return (data?.id as string | undefined) ?? null;
    },

    async governorateNames() {
      const data = must('governorates', await client.from('governorates').select('code, name_fr'));
      return new Map((data ?? []).map((g) => [g.code as string, g.name_fr as string]));
    },

    async state(moleculeId) {
      const ids = DEMO_IDS.reports;
      const otherReports = await countOf(
        'reports',
        client
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('molecule_id', moleculeId)
          .not('id', 'in', `(${ids.join(',')})`),
      );
      const signals = await countOf(
        'signals',
        client.from('signals').select('molecule_id', { count: 'exact', head: true }).eq('molecule_id', moleculeId),
      );
      const demoRows =
        (await countOf('demo reports', client.from('reports').select('id', { count: 'exact', head: true }).in('id', ids))) +
        (await countOf(
          'demo organisations',
          client.from('organisations').select('id', { count: 'exact', head: true }).in('id', DEMO_IDS.organisations),
        )) +
        (await countOf(
          'demo requests',
          client.from('availability_requests').select('id', { count: 'exact', head: true }).in('id', DEMO_IDS.requests),
        ));
      return { otherReports, hasSignal: signals > 0, demoRows };
    },

    async insert(plan) {
      must('insert organisations', await client.from('organisations').insert(plan.organisations));
      must('insert reports', await client.from('reports').insert(plan.reports));
      must('insert requests', await client.from('availability_requests').insert(plan.requests));
    },

    async deleteIds(ids) {
      const del = async (table: string, column: string, values: string[]) => {
        const r = await client.from(table).delete({ count: 'exact' }).in(column, values);
        if (r.error) throw new Error(`delete ${table}: ${r.error.message}`);
        return r.count ?? 0;
      };
      const answers = await del('availability_answers', 'request_id', ids.requests);
      const requests = await del('availability_requests', 'id', ids.requests);
      const reports = await del('reports', 'id', ids.reports);
      const organisations = await del('organisations', 'id', ids.organisations);
      return { answers, requests, reports, organisations };
    },

    async resetSignal(moleculeId) {
      const data = must('reset_molecule_signal', await client.rpc('reset_molecule_signal', { p_molecule_id: moleculeId }));
      const row = (data as { alerts: number; events: number; signals: number }[] | null)?.[0];
      return row ?? { alerts: 0, events: 0, signals: 0 };
    },

    signalStore: supabaseSignalStore(client),
  };
}
