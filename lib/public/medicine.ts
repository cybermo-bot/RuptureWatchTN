// What the public pages read about a medicine: the molecule, its brands in the CNAM list, and
// its public status (public_molecule_status: "confirmée", "levée" after a confirmation, or
// nothing). Public reference data and a public function, so the anonymous client is enough.

import 'server-only';
import { createAnonClient } from '@/lib/db/server';
import type { Origin } from '@/lib/signal';
import type { LevelChange } from '@/lib/charts/series';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export type PublicLevel = 'confirmed' | 'cleared' | 'none';

export interface PublicStatus {
  level: PublicLevel;
  since: string | null;
  origins: Origin[];
  /** When the shown status was last evaluated; null below "confirmée" (migration 0023). */
  evaluatedAt: string | null;
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

/** A presentation is only valid in the context of its own molecule. */
export async function getPublicPresentation(moleculeId: string, medicineId: unknown): Promise<Brand | null> {
  if (!isUuid(moleculeId) || !isUuid(medicineId)) return null;
  const { data, error } = await createAnonClient()
    .from('medicines')
    .select('id, label, brand, vei_category')
    .eq('molecule_id', moleculeId)
    .eq('id', medicineId)
    .maybeSingle();
  if (error) throw new Error(`medicine: ${error.message}`);
  return data;
}
export async function getPublicStatus(moleculeId: string): Promise<PublicStatus> {
  const { data, error } = await createAnonClient().rpc('public_molecule_status', { p_molecule_id: moleculeId });
  if (error) throw new Error(`public_molecule_status: ${error.message}`);
  const row = (data as { level: PublicLevel; since: string | null; origins: Origin[] | null; evaluated_at?: string | null }[] | null)?.[0];
  return row
    ? { level: row.level, since: row.since, origins: row.origins ?? [], evaluatedAt: row.evaluated_at ?? null }
    : { level: 'none', since: null, origins: [], evaluatedAt: null };
}

/**
 * The public status over the last `days` days (public_molecule_history): only the changes of
 * the public level, "confirmée", "levée" after one, or none. For the 90-day strip.
 */
export async function getPublicHistory(moleculeId: string, days = 90): Promise<LevelChange[]> {
  const { data, error } = await createAnonClient().rpc('public_molecule_history', { p_molecule_id: moleculeId, p_days: days });
  if (error) throw new Error(`public_molecule_history: ${error.message}`);
  let previous: PublicLevel = 'none';
  return ((data ?? []) as { at: string; level: PublicLevel }[]).map((r) => {
    const change: LevelChange = { molecule_id: moleculeId, from_level: previous, to_level: r.level, at: r.at };
    previous = r.level;
    return change;
  });
}
