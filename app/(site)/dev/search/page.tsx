import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { t } from '@/lib/i18n';
import { SearchCheck } from './SearchCheck';

// Temporary check page, not linked from anywhere. Removed once the pharmacy search ships.
export const metadata: Metadata = {
  title: t('core.search.title'),
  robots: { index: false, follow: false },
};

export default function DevSearchPage() {
  return (
    <>
      <SiteHeader />
      <main id="contenu" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
        <PageHeader title={t('core.search.title')} description={t('core.search.intro')} />
        <SearchCheck />
        <p className="text-sm text-ink-muted">{t('core.search.source')}</p>
      </main>
      <SiteFooter />
    </>
  );
}
