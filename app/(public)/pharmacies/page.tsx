import type { Metadata } from 'next';
import { UnderConstruction } from '@/components/public/UnderConstruction';
import { getTranslator } from '@/lib/i18n-server';

// Track C: pharmacies open near the patient (Google Places, OpenStreetMap fallback).
// Placeholder: an honest "en cours de construction" state until the track builds it.

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('directory.page.title') };
}

export default async function PharmaciesPage() {
  const { t } = await getTranslator();
  return <UnderConstruction title={t('directory.page.title')} t={t} />;
}
