import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { FourViewsPanels } from '@/components/views/FourViewsPanels';
import { selectedParam } from '@/lib/coordination/dashboard';
import { findDemoRole } from '@/lib/demo/roles';
import { t } from '@/lib/i18n';
import { VIEW_ROLES, viewClients, viewPharmacyOrganisationId } from '@/lib/views/demo-clients';
import { loadFourViews, type FourViews } from '@/lib/views/four-views';

export const metadata: Metadata = { title: t('core.views.indexTitle') };

// One shortage, four views. Each panel is loaded as its own role (lib/views/four-views.ts).
export default async function FourViewsPage({ params }: PageProps<'/vues/[moleculeId]'>) {
  await connection();
  const id = selectedParam((await params).moleculeId);
  if (!id) notFound();

  let data: FourViews | null = null;
  let failed = false;
  try {
    data = await loadFourViews(id, await viewClients(), viewPharmacyOrganisationId());
  } catch (error) {
    console.error('/vues: load failed', error instanceof Error ? error.message : error);
    failed = true;
  }
  if (!failed && !data) notFound();

  const accounts = {
    wholesaler: t(findDemoRole(VIEW_ROLES.wholesaler)!.labelKey),
    coordination: t(findDemoRole(VIEW_ROLES.coordination)!.labelKey),
  };

  return (
    <>
      <SiteHeader />
      <main id="contenu" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
        {failed || !data ? (
          <EmptyState title={t('core.views.errorTitle')} body={t('core.views.errorBody')} />
        ) : (
          <>
            <PageHeader title={t('core.views.title', { molecule: data.molecule.name })} description={t('core.views.line')} />
            <div className="flex max-w-prose flex-col gap-2 text-sm text-ink-muted">
              <p>{t('core.views.how')}</p>
              <p>{t('core.views.demoNote')}</p>
            </div>
            <FourViewsPanels data={data} accounts={accounts} />
          </>
        )}
        <Link href="/vues" className="flex min-h-12 w-fit items-center">
          {t('core.views.otherMolecule')}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
