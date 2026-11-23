import 'server-only';
import { createAnonClient } from '@/lib/db/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A molecule of the national catalogue by id (public reference data). Null when unknown. */
export async function getMolecule(id: string): Promise<{ id: string; name: string } | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await createAnonClient().from('molecules').select('id, name').eq('id', id).maybeSingle();
  if (error) throw new Error(`molecule ${id}: ${error.message}`);
  return data;
}
