import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { MedicineSearch } from '@/components/public/MedicineSearch';
import { PublicMain } from '@/components/public/PublicChrome';
import { getTranslator } from '@/lib/i18n-server';

// Track B: the public search. Brand or molecule, half words and misspellings; every row leads
// to the molecule's status page (the rumour check).

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('public.pages.medicines.title') };
}

export default async function MedicinesPage({ searchParams }: PageProps<'/medicaments'>) {
  const { t, locale } = await getTranslator();
  const { recherche } = await searchParams;
  return (
    <PublicMain narrow>
      <PageHeader title={t('public.pages.medicines.title')} description={t('public.medicines.intro')} />
      <MedicineSearch locale={locale} autoFocus={recherche === '1'} />
    </PublicMain>
  );
}
