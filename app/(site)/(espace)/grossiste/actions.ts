'use server';

import { redirect } from 'next/navigation';
import { demoSplit, MIN_REASON_LENGTH, parseStock, recommendedJson } from '@/lib/allocation/decisions';
import { getCurrentSession } from '@/lib/auth/session';
import { createUserClient } from '@/lib/db/server';
import { listSignals } from '@/lib/signals/views';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DecisionState = { status: 'idle' } | { status: 'reason_missing' } | { status: 'error' };

/**
 * Records the wholesaler's decision on a split. The split is computed again here from the stock:
 * what is stored is always what the platform proposed, never a figure sent by the browser.
 */
export async function recordDecision(_prev: DecisionState, formData: FormData): Promise<DecisionState> {
  const session = await getCurrentSession();
  if (session?.organisation.type !== 'wholesaler') redirect('/#roles');

  const moleculeId = String(formData.get('molecule_id') ?? '');
  const stock = parseStock(formData.get('stock'));
  const applied = formData.get('decision') === 'apply';
  const reason = String(formData.get('reason') ?? '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  if (!UUID.test(moleculeId) || stock === null) return { status: 'error' };
  if (!applied && reason.length < MIN_REASON_LENGTH) return { status: 'reason_missing' };

  const supabase = await createUserClient();
  const [signal] = await listSignals(supabase, [moleculeId]);
  if (!signal || (signal.level !== 'likely' && signal.level !== 'confirmed')) return { status: 'error' };

  const { error } = await supabase.from('allocation_decisions').insert({
    molecule_id: moleculeId,
    stock,
    recommended: recommendedJson(demoSplit(stock)),
    applied,
    deviation_reason: applied ? (reason || null) : reason,
  });
  if (error) {
    console.error('allocation decision failed', error.message);
    return { status: 'error' };
  }
  redirect(`/grossiste/repartition/${moleculeId}?stock=${stock}&enregistre=${applied ? 'applique' : 'ecart'}#decision`);
}
