import type { Metadata } from 'next';
import { UnderConstruction } from '@/components/public/UnderConstruction';
import { getTranslator } from '@/lib/i18n-server';

// Track B: map of the pharmacies that answered disponible.
// Placeholder: an honest "en cours de construction" state until the track builds it.

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('public.pages.request.title') };
}

export default async function RequestPage() {
  const { t } = await getTranslator();
  return <UnderConstruction title={t('public.pages.request.title')} t={t} />;
}
