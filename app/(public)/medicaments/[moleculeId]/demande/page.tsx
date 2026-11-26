import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { PublicMain } from '@/components/public/PublicChrome';
import { RequestForm } from '@/components/public/RequestForm';
import { requestsConfigured } from '@/lib/availability/device';
import { getTranslator } from '@/lib/i18n-server';
import { governorates } from '@/lib/public/governorates';
import { getPublicMolecule, getPublicPresentation } from '@/lib/public/medicine';

// Track B: ask the pharmacies of a governorate whether they have this medicine.
// Anonymous: no account, no name, no phone number (CLAUDE.md rule 3).

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('public.request.title') };
}

export default async function RequestCreatePage(props: PageProps<'/medicaments/[moleculeId]/demande'>) {
  const { t, locale } = await getTranslator();
  const molecule = await getPublicMolecule((await props.params).moleculeId);
  if (!molecule) notFound();
  const { presentation: selected } = await props.searchParams;
  const presentation = selected === undefined ? null : await getPublicPresentation(molecule.id, selected);
  if (selected !== undefined && !presentation) notFound();
  return (
    <PublicMain narrow>
      <PageHeader
        back={{ href: `/medicaments/${molecule.id}${presentation ? `?presentation=${presentation.id}` : ''}`, label: molecule.name }}
        title={t('public.request.title')}
        description={t('public.request.intro')}
      />
      {requestsConfigured() ? (
        <RequestForm key={presentation?.id ?? molecule.id} molecule={molecule} presentation={presentation} list={governorates(locale)} locale={locale} />
      ) : (
        <p className="border-t border-line pt-4 text-ink">{t('public.request.closed')}</p>
      )}
    </PublicMain>
  );
}
