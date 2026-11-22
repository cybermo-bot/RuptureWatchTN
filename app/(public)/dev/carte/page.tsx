import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { OriginBadge } from '@/components/OriginBadge';
import { PublicMain } from '@/components/public/PublicChrome';
import { MapCheck } from './MapCheck';
import { getTranslator } from '@/lib/i18n-server';

// Check page for components/maps/PatientMap.tsx: two fictional test points. Without a Google
// key the OpenStreetMap fallback shows. Not linked from the interface.

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('public.map.testPage.title') };
}

export default async function MapCheckPage() {
  const { t, locale } = await getTranslator();
  return (
    <PublicMain>
      <PageHeader
        title={t('public.map.testPage.title')}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{t('public.map.testPage.intro')}</span>
            <OriginBadge origin="simulated" />
          </span>
        }
      />
      <MapCheck locale={locale} />
    </PublicMain>
  );
}
