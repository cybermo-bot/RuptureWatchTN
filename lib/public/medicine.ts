// What the public pages read about a medicine: the molecule, its brands in the CNAM list, and
// its public status (public_molecule_status: "confirmée", "levée" after a confirmation, or
// nothing). Public reference data and a public function, so the anonymous client is enough.

import 'server-only';
import { createAnonClient } from '@/lib/db/server';
import type { Origin } from '@/lib/signal';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export type PublicLevel = 'confirmed' | 'cleared' | 'none';

export interface PublicStatus {
  level: PublicLevel;
  since: string | null;
  origins: Origin[];
}

export interface Brand {
  id: string;
  label: string;
  brand: string;
  vei_category: 'V' | 'E' | 'I' | null;
}

export async function getPublicMolecule(id: string): Promise<{ id: string; name: string } | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await createAnonClient().from('molecules').select('id, name').eq('id', id).maybeSingle();
  if (error) throw new Error(`molecule: ${error.message}`);
  return data;
}

/** Every presentation of the molecule in the CNAM list, by brand then label. Same molecule only. */
export async function getBrands(moleculeId: string): Promise<Brand[]> {
  const { data, error } = await createAnonClient()
    .from('medicines')
    .select('id, label, brand, vei_category')
    .eq('molecule_id', moleculeId)
    .order('brand')
    .order('label');
  if (error) throw new Error(`medicines: ${error.message}`);
  return (data ?? []) as Brand[];
}

export async function getPublicStatus(moleculeId: string): Promise<PublicStatus> {
  const { data, error } = await createAnonClient().rpc('public_molecule_status', { p_molecule_id: moleculeId });
  if (error) throw new Error(`public_molecule_status: ${error.message}`);
  const row = (data as { level: PublicLevel; since: string | null; origins: Origin[] | null }[] | null)?.[0];
  return row ? { level: row.level, since: row.since, origins: row.origins ?? [] } : { level: 'none', since: null, origins: [] };
}
