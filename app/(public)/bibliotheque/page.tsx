import type { Metadata } from 'next';
import { FrenchStatusBanner } from '@/components/library/FrenchStatusBanner';
import { LibrarySearch } from '@/components/library/LibrarySearch';
import { PageHeader } from '@/components/PageHeader';
import { PublicMain } from '@/components/public/PublicChrome';
import { getTranslator } from '@/lib/i18n-server';

// Track C: the Library, French over-the-counter status, a clearly labelled demonstration.
// No link to or from the availability request flow (CLAUDE.md rule 12).

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('library.page.title') };
}

export default async function LibraryPage() {
  const { t, locale } = await getTranslator();
  return (
    <PublicMain>
      <FrenchStatusBanner locale={locale} />
      <PageHeader title={t('library.page.title')} description={t('library.page.intro')} />
      <LibrarySearch locale={locale} />
    </PublicMain>
  );
}
