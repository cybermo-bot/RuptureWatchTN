'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentSession } from '@/lib/auth/session';
import { createUserClient } from '@/lib/db/server';
import { isUuid } from '@/lib/public/medicine';

// One tap: the pharmacy answers a patient's request through its own session. Row-level
// security checks that the request is open and in its governorate, and that the origin is the
// pharmacy's own. "Me montrer" is the only way a pharmacy's name reaches anyone (rule 1).

export type Choice = 'show' | 'anonymous' | 'no';
export type AnswerResult = { ok: true; choice: Choice } | { ok: false; error: 'expired' | 'already' | 'failed' };

export async function answerRequest(requestId: unknown, choice: unknown): Promise<AnswerResult> {
  if (!isUuid(requestId) || (choice !== 'show' && choice !== 'anonymous' && choice !== 'no')) return { ok: false, error: 'failed' };
  const session = await getCurrentSession();
  if (!session || session.organisation.type !== 'pharmacy') return { ok: false, error: 'failed' };

  const supabase = await createUserClient();
  const { error } = await supabase.from('availability_answers').insert({
    request_id: requestId,
    organisation_id: session.organisation.id,
    answer: choice === 'no' ? 'unavailable' : 'available',
    show_identity: choice === 'show',
    origin: session.organisation.origin,
  });
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'already' };
    // 42501: the policy refused it, the request has expired since the page was drawn.
    if (error.code === '42501') return { ok: false, error: 'expired' };
    console.error('availability answer failed', error.code);
    return { ok: false, error: 'failed' };
  }
  revalidatePath('/pharmacie', 'layout');
  return { ok: true, choice };
}
