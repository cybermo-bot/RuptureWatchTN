import type { Metadata } from 'next';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { PageHeader } from '@/components/PageHeader';
import { PublicMain } from '@/components/public/PublicChrome';
import { getTranslator } from '@/lib/i18n-server';
import { returnPath } from '@/lib/feedback/path';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('public.feedback.title') };
}

// « Un problème ? Une idée ? » (pilot-2 item 3), for any visitor: anonymous,
// in French or Arabic. Linked from the public footer with the page it was opened from.
export default async function FeedbackPage({ searchParams }: PageProps<'/avis'>) {
  const { t } = await getTranslator();
  const query = await searchParams;
  const depuis = returnPath(query.depuis, '/medicaments');
  const error = typeof query.erreur === 'string' ? query.erreur : null;
  return (
    <PublicMain narrow>
      <PageHeader title={t('public.feedback.title')} description={t('public.feedback.intro')} />
      <FeedbackForm
        espace="public"
        depuis={depuis}
        sent={query.envoye === '1'}
        error={error}
        texts={{
          messageLabel: t('public.feedback.messageLabel'),
          noPatient: t('public.feedback.noPatient'),
          limit: t('public.feedback.limit'),
          ratingLegend: t('public.feedback.ratingLegend'),
          ratings: { easy: t('public.feedback.ratings.easy'), unclear: t('public.feedback.ratings.unclear'), broken: t('public.feedback.ratings.broken') },
          submit: t('public.feedback.submit'),
          sentTitle: t('public.feedback.sentTitle'),
          sentBody: t('public.feedback.sentBody'),
          back: t('public.feedback.back'),
          errors: { vide: t('public.feedback.errorEmpty'), limite: t('public.feedback.errorLimit'), other: t('public.feedback.errorFailed') },
        }}
      />
    </PublicMain>
  );
}
