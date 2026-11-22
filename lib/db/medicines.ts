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

export interface MoleculeHit {
  id: string;
  name: string;
  /** Number of catalogue presentations of this molecule. */
  medicines: number;
  score: number;
}

/** Molecules whose DCI matches the query. Shown above the brands, so a DCI leads to its molecule. */
export async function searchMolecules(q: string): Promise<MoleculeHit[]> {
  const query = q.trim().slice(0, 100);
  if (query.length < 2) return [];
  const { data, error } = await createAnonClient().rpc('search_molecules', { q: query });
  if (error) throw new Error(`search_molecules failed: ${error.message}`);
  return (data ?? []) as MoleculeHit[];
}

/** Both searches at once: molecules first, then medicines. */
export async function searchCatalogue(q: string): Promise<{ molecules: MoleculeHit[]; results: MedicineHit[] }> {
  const [molecules, results] = await Promise.all([searchMolecules(q), searchMedicines(q)]);
  return { molecules, results };
}
