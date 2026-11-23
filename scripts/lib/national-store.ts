// NationalStore over Supabase with the service role, for demo:national and demo:clear.

import type { SupabaseClient } from '@supabase/supabase-js';
import { NATIONAL_IDS, type NationalStore } from '../../lib/demo/national';
import { supabaseSignalStore } from '../../lib/signals/store';

type Result<T> = { data: T; error: { message: string } | null };

export function supabaseNationalStore(client: SupabaseClient): NationalStore {
  const must = <T>(label: string, r: Result<T>): T => {
    if (r.error) throw new Error(`${label}: ${r.error.message}`);
    return r.data;
  };
  const count = async (table: string, build: (q: ReturnType<ReturnType<SupabaseClient['from']>['select']>) => unknown) => {
    const r = (await build(client.from(table).select('*', { count: 'exact', head: true }))) as { count: number | null; error: { message: string } | null };
    if (r.error) throw new Error(`${table}: ${r.error.message}`);
    return r.count ?? 0;
  };
  const notIn = (ids: string[]) => `(${ids.join(',')})`;

  return {
    async moleculeIdByName(name) {
      const data = must('molecules', await client.from('molecules').select('id').eq('name', name).maybeSingle());
      return (data?.id as string | undefined) ?? null;
    },

    async governorateNames() {
      const data = must('governorates', await client.from('governorates').select('code, name_fr'));
      return new Map((data ?? []).map((g) => [g.code as string, g.name_fr as string]));
    },

    async otherUses(moleculeId) {
      const n = await Promise.all([
        count('reports', (q) => q.eq('molecule_id', moleculeId).not('id', 'in', notIn(NATIONAL_IDS.reports))),
        count('followed_molecules', (q) => q.eq('molecule_id', moleculeId)),
        count('foreign_notices', (q) => q.eq('molecule_id', moleculeId).not('id', 'in', notIn(NATIONAL_IDS.notices))),
        count('availability_requests', (q) => q.eq('molecule_id', moleculeId).not('id', 'in', notIn(NATIONAL_IDS.requests))),
        count('allocation_decisions', (q) => q.eq('molecule_id', moleculeId).not('id', 'in', notIn(NATIONAL_IDS.decisions))),
        count('signals', (q) => q.eq('molecule_id', moleculeId)),
      ]);
      return n.reduce((a, b) => a + b, 0);
    },

    async demoRows() {
      const n = await Promise.all([
        count('organisations', (q) => q.in('id', NATIONAL_IDS.organisations)),
        count('reports', (q) => q.in('id', NATIONAL_IDS.reports)),
        count('availability_requests', (q) => q.in('id', NATIONAL_IDS.requests)),
        count('foreign_notices', (q) => q.in('id', NATIONAL_IDS.notices)),
        count('allocation_decisions', (q) => q.in('id', NATIONAL_IDS.decisions)),
      ]);
      return n.reduce((a, b) => a + b, 0);
    },

    async insert(plan) {
      must('insert organisations', await client.from('organisations').insert(plan.organisations));
      must('insert reports', await client.from('reports').insert(plan.reports));
      must('insert notices', await client.from('foreign_notices').insert(plan.notices));
      must('insert requests', await client.from('availability_requests').insert(plan.requests));
      must('insert decisions', await client.from('allocation_decisions').insert(plan.decisions));
    },

    async deleteIds(ids) {
      const del = async (table: string, column: string, values: string[]) => {
        const r = await client.from(table).delete({ count: 'exact' }).in(column, values);
        if (r.error) throw new Error(`delete ${table}: ${r.error.message}`);
        return r.count ?? 0;
      };
      const decisions = await del('allocation_decisions', 'id', ids.decisions);
      const answers = await del('availability_answers', 'request_id', ids.requests);
      const requests = await del('availability_requests', 'id', ids.requests);
      const notices = await del('foreign_notices', 'id', ids.notices);
      const reports = await del('reports', 'id', ids.reports);
      const organisations = await del('organisations', 'id', ids.organisations);
      return { decisions, answers, requests, notices, reports, organisations };
    },

    async resetSignal(moleculeId) {
      const data = must('reset_molecule_signal', await client.rpc('reset_molecule_signal', { p_molecule_id: moleculeId }));
      const row = (data as { alerts: number; events: number; signals: number }[] | null)?.[0];
      return row ?? { alerts: 0, events: 0, signals: 0 };
    },

    signalStore: supabaseSignalStore(client),
  };
}
