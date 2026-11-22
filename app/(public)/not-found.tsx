import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { PublicMain } from '@/components/public/PublicChrome';
import { getTranslator } from '@/lib/i18n-server';

export default async function PublicNotFound() {
  const { t } = await getTranslator();
  return (
    <PublicMain>
      <PageHeader title={t('public.shell.notFoundTitle')} />
      <EmptyState
        afterRule
        title={t('public.shell.notFoundBody')}
        action={<ButtonLink href="/medicaments">{t('public.shell.back')}</ButtonLink>}
      />
    </PublicMain>
  );
}
