import 'server-only';
import { createAnonClient } from '@/lib/db/server';

export interface MedicineHit {
  id: string;
  code_pct: string;
  label: string;
  brand: string;
  dci: string;
  vei_category: 'V' | 'E' | 'I' | null;
  molecule_id: string;
  molecule_name: string;
  score: number;
}

/** Fuzzy search in the national catalogue. Public data, so the anonymous client is enough. */
export async function searchMedicines(q: string): Promise<MedicineHit[]> {
  const query = q.trim().slice(0, 100);
  if (query.length < 2) return [];
  const { data, error } = await createAnonClient().rpc('search_medicines', { q: query });
  if (error) throw new Error(`search_medicines failed: ${error.message}`);
  return (data ?? []) as MedicineHit[];
}
