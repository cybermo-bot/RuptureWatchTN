import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { SiteFooter, SiteHeader, SiteMain } from '@/components/SiteChrome';
import { devPagesHidden } from '@/lib/env';
import { t } from '@/lib/i18n';
import { SearchCheck } from './SearchCheck';

// Temporary check page, not linked from anywhere; 404 on production. Removed once the pharmacy search ships.
export const metadata: Metadata = {
  title: t('core.search.title'),
  robots: { index: false, follow: false },
};

export default function DevSearchPage() {
  if (devPagesHidden()) notFound();
  return (
    <>
      <SiteHeader />
      <SiteMain narrow>
        <PageHeader title={t('core.search.title')} description={t('core.search.intro')} />
        <SearchCheck />
        <p className="text-sm text-ink-muted">{t('core.search.source')}</p>
      </SiteMain>
      <SiteFooter />
    </>
  );
}
