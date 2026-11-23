import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { SiteFooter, SiteHeader, SiteMain } from '@/components/SiteChrome';
import { t } from '@/lib/i18n';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <SiteMain>
        <PageHeader title={t('core.errors.notFoundTitle')} />
        <EmptyState
          title={t('core.errors.notFoundBody')}
          action={<ButtonLink href="/">{t('core.errors.home')}</ButtonLink>}
        />
      </SiteMain>
      <SiteFooter />
    </>
  );
}
