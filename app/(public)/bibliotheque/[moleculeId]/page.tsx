import type { Metadata } from 'next';
import { UnderConstruction } from '@/components/public/UnderConstruction';
import { getTranslator } from '@/lib/i18n-server';

// Track C: French over-the-counter status of one molecule.
// Placeholder: an honest "en cours de construction" state until the track builds it.

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('library.detail.title') };
}

export default async function LibraryDetailPage() {
  const { t } = await getTranslator();
  return <UnderConstruction title={t('library.detail.title')} t={t} />;
}
