import type { Metadata } from 'next';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { PageHeader } from '@/components/PageHeader';
import { t } from '@/lib/i18n';
import { returnPath } from '@/lib/feedback/path';

export const metadata: Metadata = { title: t('core.feedback.title') };

// « Un problème ? Une idée ? » (pilot-2 item 3), for a pharmacy, from « Plus ».
// Sent with the pharmacy's organisation (rate-limited per organisation), never a person's name.
export default async function FeedbackPage({ searchParams }: PageProps<'/pharmacie/avis'>) {
  const query = await searchParams;
  const depuis = returnPath(query.depuis, '/pharmacie/plus');
  const error = typeof query.erreur === 'string' ? query.erreur : null;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader title={t('core.feedback.title')} description={t('core.feedback.intro')} />
      <FeedbackForm
        espace="pharmacie"
        depuis={depuis}
        sent={query.envoye === '1'}
        error={error}
        texts={{
          messageLabel: t('core.feedback.messageLabel'),
          noPatient: t('core.feedback.noPatient'),
          limit: t('core.feedback.limit'),
          ratingLegend: t('core.feedback.ratingLegend'),
          ratings: { easy: t('core.feedback.ratings.easy'), unclear: t('core.feedback.ratings.unclear'), broken: t('core.feedback.ratings.broken') },
          submit: t('core.feedback.submit'),
          sentTitle: t('core.feedback.sentTitle'),
          sentBody: t('core.feedback.sentBody'),
          back: t('core.feedback.back'),
          errors: { vide: t('core.feedback.errorEmpty'), limite: t('core.feedback.errorLimit'), other: t('core.feedback.errorFailed') },
        }}
      />
    </div>
  );
}
