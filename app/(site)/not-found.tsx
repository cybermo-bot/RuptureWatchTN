import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { t } from '@/lib/i18n';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="contenu" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
        <PageHeader title={t('core.errors.notFoundTitle')} />
        <EmptyState
          title={t('core.errors.notFoundBody')}
          action={<ButtonLink href="/">{t('core.errors.home')}</ButtonLink>}
        />
      </main>
      <SiteFooter />
    </>
  );
}
