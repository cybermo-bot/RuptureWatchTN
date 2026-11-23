// The wholesaler's split, as computed and recorded. The simulated figures come from
// supabase/seed/allocation-demo.json; decisions are read and written through the caller's client,
// so the database's access rules decide who sees what (migration ..._track_d_allocation_decisions).

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import seed from '@/supabase/seed/allocation-demo.json';
import { fairSplit, type GovernorateNeed, type Split } from './split';

export const MAX_STOCK = 10_000_000;
/** "Ne pas appliquer" needs at least this many characters of reason (the database checks it too). */
export const MIN_REASON_LENGTH = 15;

/** The simulated figures for the demonstration (every value marked simulated in the seed file). */
export const DEMO_NEEDS: GovernorateNeed[] = seed.governorates.map(({ code, monthlyUse, coverDays }) => ({ code, monthlyUse, coverDays }));
export const DEMO_ORIGIN = seed.origin as 'simulated';

/** A typed stock, or null when it is not a whole number of boxes in range. */
export function parseStock(value: unknown): number | null {
  const s = String(value ?? '').replace(/[\s  ]/g, '');
  if (!/^\d{1,8}$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 && n <= MAX_STOCK ? n : null;
}

export function demoSplit(stock: number): Split {
  return fairSplit(stock, DEMO_NEEDS);
}

/** What is stored in allocation_decisions.recommended: enough to read the decision later. */
export function recommendedJson(split: Split) {
  return {
    reserve: split.reserve,
    allocated: split.allocated,
    unallocated: split.unallocated,
    params: split.params,
    figuresOrigin: DEMO_ORIGIN,
    byGovernorate: Object.fromEntries(
      split.rows.map((r) => [
        r.code,
        {
          boxes: r.boxes,
          coverBefore: r.coverBefore === null ? null : Math.round(r.coverBefore * 10) / 10,
          coverAfter: r.coverAfter === null ? null : Math.round(r.coverAfter * 10) / 10,
        },
      ]),
    ),
  };
}

export interface DecisionRow {
  id: string;
  molecule_id: string;
  molecule_name: string | null;
  stock: number;
  applied: boolean;
  deviation_reason: string | null;
  decided_at: string;
  origin: 'official_source' | 'tester' | 'simulated';
}

/** The table does not exist yet (migration not applied): PostgREST PGRST205, Postgres 42P01. */
function isMissingTable(error: { code?: string; message: string }): boolean {
  return error.code === 'PGRST205' || error.code === '42P01' || (/allocation_decisions/.test(error.message) && /not find|does not exist/.test(error.message));
}

/**
 * The caller's decisions (a coordinator's: all of them), newest first. Null when the table does not
 * exist yet: the rest of the wholesaler space keeps working until the migration is applied.
 */
export async function listDecisions(client: SupabaseClient, moleculeId: string | null, limit = 20): Promise<DecisionRow[] | null> {
  let q = client
    .from('allocation_decisions')
    .select('id, molecule_id, stock, applied, deviation_reason, decided_at, origin, molecules ( name )')
    .order('decided_at', { ascending: false })
    .limit(limit);
  if (moleculeId) q = q.eq('molecule_id', moleculeId);
  const { data, error } = await q;
  if (error) {
    if (isMissingTable(error)) return null;
    throw new Error(`allocation_decisions: ${error.message}`);
  }
  return (data ?? []).map((r) => {
    const mol = (r as { molecules?: { name: string } | { name: string }[] | null }).molecules;
    return {
      ...(r as unknown as Omit<DecisionRow, 'molecule_name'>),
      molecule_name: Array.isArray(mol) ? (mol[0]?.name ?? null) : (mol?.name ?? null),
    };
  });
}
