import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Ltr } from '@/components/public/Ltr';
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
      <Link href={`/medicaments/${molecule.id}${presentation ? `?presentation=${presentation.id}` : ''}`} className="inline-flex min-h-12 items-center gap-2 self-start text-brand underline">
        <ArrowLeft size={18} aria-hidden="true" className="rtl:-scale-x-100" />
        <Ltr>{molecule.name}</Ltr>
      </Link>
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight text-ink sm:text-[1.75rem]">{t('public.request.title')}</h1>
        <p className="max-w-prose text-ink-muted">{t('public.request.intro')}</p>
      </header>
      {requestsConfigured() ? (
        <RequestForm key={presentation?.id ?? molecule.id} molecule={molecule} presentation={presentation} list={governorates(locale)} locale={locale} />
      ) : (
        <p className="panel p-5 text-ink">{t('public.request.closed')}</p>
      )}
    </PublicMain>
  );
}
