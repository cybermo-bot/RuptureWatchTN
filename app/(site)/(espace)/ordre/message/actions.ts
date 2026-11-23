'use server';

import { redirect } from 'next/navigation';
import { GOVERNORATE_CODES } from '@/lib/public/governorates';
import { getCurrentSession } from '@/lib/auth/session';
import { createUserClient } from '@/lib/db/server';

/**
 * "Message aux pharmaciens": the Ordre's own session inserts the message; row-level security
 * checks the role and the governorates, and the database sets the sender, the time and the origin.
 */
export async function sendOrderMessage(formData: FormData): Promise<void> {
  const session = await getCurrentSession();
  if (session?.organisation.type !== 'pharmacists_order') redirect('/#roles');

  const body = String(formData.get('body') ?? '').replace(/\s+/g, ' ').trim();
  const governorates = [...new Set(formData.getAll('governorates').map(String))].filter((g) => GOVERNORATE_CODES.has(g));
  if (body.length < 10 || body.length > 600) redirect('/ordre/message?erreur=texte');
  if (governorates.length === 0) redirect('/ordre/message?erreur=gouvernorats');

  const supabase = await createUserClient();
  const { error } = await supabase.from('order_messages').insert({ body, governorate_codes: governorates });
  if (error) {
    console.error('order message failed', error.code, error.message);
    redirect('/ordre/message?erreur=autre');
  }
  redirect('/ordre/message?envoye=1#envoyes');
}
