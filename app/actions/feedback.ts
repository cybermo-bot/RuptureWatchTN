'use server';

import { redirect } from 'next/navigation';
import { createUserClient } from '@/lib/db/server';
import { FEEDBACK_MAX, FEEDBACK_RATINGS, type FeedbackRating, returnPath, routePattern } from '@/lib/feedback/path';

/**
 * « Un problème ? Une idée ? » (pilot-2 item 3). Sent as the visitor: anonymous on public pages,
 * the pharmacy when signed in. submit_feedback stores the route pattern only, keeps no visitor
 * identifier, and rate-limits (5 per hour per organisation, 200 per hour for anonymous visitors).
 */
export async function submitFeedback(formData: FormData): Promise<void> {
  const page = formData.get('espace') === 'pharmacie' ? '/pharmacie/avis' : '/avis';
  const from = returnPath(formData.get('depuis'), page === '/avis' ? '/medicaments' : '/pharmacie');
  const back = (key: 'envoye' | 'erreur', value: string) => `${page}?${new URLSearchParams({ depuis: from, [key]: value })}`;

  const message = String(formData.get('message') ?? '').trim();
  if (!message) redirect(back('erreur', 'vide'));
  if (message.length > FEEDBACK_MAX) redirect(back('erreur', '1'));
  const note = formData.get('note');
  const rating: FeedbackRating | null = FEEDBACK_RATINGS.includes(note as FeedbackRating) ? (note as FeedbackRating) : null;

  const client = await createUserClient();
  const { error } = await client.rpc('submit_feedback', { p_path: routePattern(from), p_rating: rating, p_message: message });
  if (error) {
    console.error('feedback: submit failed', { code: error.code });
    redirect(back('erreur', error.code === 'RW429' ? 'limite' : '1'));
  }
  redirect(back('envoye', '1'));
}
