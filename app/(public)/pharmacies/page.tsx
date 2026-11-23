import type { Metadata } from 'next';
import { PharmacyFinder, type Area } from '@/components/directory/PharmacyFinder';
import { PageHeader } from '@/components/PageHeader';
import { PublicMain } from '@/components/public/PublicChrome';
import areasFile from '@/data/reference/governorate-areas.json';
import { getTranslator } from '@/lib/i18n-server';

// Track C: pharmacies open near the patient. Google Places in the browser when the Google map
// shows, the OpenStreetMap list otherwise (components/directory/PharmacyFinder.tsx).

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('directory.page.title') };
}

export default async function PharmaciesPage() {
  const { t, locale } = await getTranslator();
  const areas: Area[] = areasFile.governorates
    .map((g) => ({ code: g.code, name: locale === 'ar' ? g.nameAr : g.nameFr, centre: g.centre, bounds: g.bounds }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  return (
    <PublicMain>
      <PageHeader title={t('directory.page.title')} description={t('directory.page.intro')} />
      <p className="max-w-prose text-ink-muted">{t('directory.page.garde')}</p>
      <PharmacyFinder locale={locale} areas={areas} />
    </PublicMain>
  );
}
