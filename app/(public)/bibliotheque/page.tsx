import type { Metadata } from 'next';
import { UnderConstruction } from '@/components/public/UnderConstruction';
import { getTranslator } from '@/lib/i18n-server';

// Track C: the Library, French over-the-counter status.
// Placeholder: an honest "en cours de construction" state until the track builds it.

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('library.page.title') };
}

export default async function LibraryPage() {
  const { t } = await getTranslator();
  return <UnderConstruction title={t('library.page.title')} t={t} />;
}
