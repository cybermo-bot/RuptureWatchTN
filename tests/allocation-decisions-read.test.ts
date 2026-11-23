import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listDecisions, parseStock } from '@/lib/allocation/decisions';

// A fake client whose query resolves to the given result, whatever is chained on it.
function client(result: { data: unknown; error: { code?: string; message: string } | null }): SupabaseClient {
  const query: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'limit', 'eq']) query[m] = () => query;
  query.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return { from: () => query } as unknown as SupabaseClient;
}

describe('reading decisions', () => {
  it('returns null, not an error, while the table does not exist yet', async () => {
    const missing = { code: 'PGRST205', message: "Could not find the table 'public.allocation_decisions' in the schema cache" };
    expect(await listDecisions(client({ data: null, error: missing }), null)).toBeNull();
  });

  it('still throws on any other error', async () => {
    await expect(listDecisions(client({ data: null, error: { code: '42501', message: 'permission denied' } }), null)).rejects.toThrow(/permission denied/);
  });

  it('flattens the molecule name', async () => {
    const rows = [{ id: '1', molecule_id: 'm', stock: 10, applied: true, deviation_reason: null, decided_at: 'x', origin: 'simulated', molecules: { name: 'LEVETIRACETAM' } }];
    expect((await listDecisions(client({ data: rows, error: null }), null))?.[0].molecule_name).toBe('LEVETIRACETAM');
  });
});

describe('the typed stock', () => {
  it('accepts whole numbers with spaces, refuses anything else', () => {
    expect(parseStock('2 500')).toBe(2500);
    expect(parseStock('0')).toBeNull();
    expect(parseStock('12.5')).toBeNull();
    expect(parseStock('-3')).toBeNull();
    expect(parseStock('abc')).toBeNull();
  });
});
