import type { Metadata } from 'next';
import { UnderConstruction } from '@/components/public/UnderConstruction';
import { getTranslator } from '@/lib/i18n-server';

// Track B: quick status check for prescribers.
// Placeholder: an honest "en cours de construction" state until the track builds it.

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('public.pages.prescribers.title') };
}

export default async function PrescribersPage() {
  const { t } = await getTranslator();
  return <UnderConstruction title={t('public.pages.prescribers.title')} t={t} />;
}
