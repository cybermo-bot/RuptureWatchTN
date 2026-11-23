'use server';

import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth/session';
import { createUserClient } from '@/lib/db/server';
import { ARRIVAL_QUANTITIES, type ArrivalQuantity } from '@/lib/institutions/data';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * "Arrivage annoncé": the database checks the role, the level (probable or confirmée now) and the
 * date, and sets the organisation and the origin (announce_arrival). It never changes a level.
 */
export async function announceArrival(formData: FormData): Promise<void> {
  const session = await getCurrentSession();
  if (session?.organisation.type !== 'central_pharmacy') redirect('/#roles');

  const moleculeId = String(formData.get('molecule_id') ?? '');
  const expectedOn = String(formData.get('expected_on') ?? '');
  const quantity = String(formData.get('quantity') ?? '') as ArrivalQuantity;
  if (!UUID.test(moleculeId)) redirect('/centrale?erreur=autre');
  const back = (q: string) => `/centrale?${q}&m=${moleculeId}#m-${moleculeId}`;
  if (!DAY.test(expectedOn) || !ARRIVAL_QUANTITIES.includes(quantity)) redirect(back('erreur=date'));

  const supabase = await createUserClient();
  const { error } = await supabase.rpc('announce_arrival', { p_molecule_id: moleculeId, p_expected_on: expectedOn, p_quantity: quantity });
  if (error) {
    const kind = /not at/.test(error.message) ? 'niveau' : /out of range/.test(error.message) ? 'date' : 'autre';
    if (kind === 'autre') console.error('announce_arrival failed', error.code, error.message);
    redirect(back(`erreur=${kind}`));
  }
  redirect(back('annonce=ok'));
}
