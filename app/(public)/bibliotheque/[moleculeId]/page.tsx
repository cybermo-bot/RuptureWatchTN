import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState } from '@/components/EmptyState';
import { FrenchStatusBanner } from '@/components/library/FrenchStatusBanner';
import { PageHeader } from '@/components/PageHeader';
import { Ltr } from '@/components/public/Ltr';
import { PublicMain } from '@/components/public/PublicChrome';
import type { MessageKey } from '@/lib/i18n';
import { getTranslator } from '@/lib/i18n-server';
import { countByDisplay, displayStatus, readLibrary } from '@/lib/library/data';
import { getMolecule } from '@/lib/library/molecule';

// Track C: the French status of each French product of one molecule, with its source and date.
// The status is France's, never Tunisia's; nothing here is a suggestion (CLAUDE.md rule 12).

export async function generateMetadata(props: PageProps<'/bibliotheque/[moleculeId]'>): Promise<Metadata> {
  const { t } = await getTranslator();
  const molecule = await getMolecule((await props.params).moleculeId).catch(() => null);
  return { title: molecule ? `${molecule.name} · ${t('library.detail.title')}` : t('library.detail.title') };
}

export default async function LibraryDetailPage(props: PageProps<'/bibliotheque/[moleculeId]'>) {
  const { t, locale } = await getTranslator();
  const molecule = await getMolecule((await props.params).moleculeId);
  if (!molecule) notFound();

  const library = readLibrary();
  const entry = library?.molecules[molecule.name] ?? null;
  const passed = library?.check.passed ?? false;
  const products = entry?.products ?? [];
  const counts = countByDisplay(products, passed);
  const hasNoCondition = products.some((p) => p.status === 'no_condition');
  const date = library
    ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-TN' : 'fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' }).format(
        new Date(library.source.downloadedAt),
      )
    : null;

  return (
    <PublicMain>
      <FrenchStatusBanner locale={locale} />
      <PageHeader
        meta={t('library.detail.title')}
        title={molecule.name}
        description={entry ? t('library.detail.summary', { count: products.length }) : undefined}
      />

      {!library ? (
        <EmptyState title={t('library.detail.noData')} body={t('library.detail.noDataBody')} afterRule />
      ) : !entry ? (
        <EmptyState title={t('library.detail.unmatched')} body={t('library.detail.unmatchedBody')} afterRule />
      ) : (
        <>
          <ul className="flex flex-col gap-1 text-ink">
            <li>{t('library.detail.countPrescription', { n: counts.prescription })}</li>
            {passed || counts.no_prescription > 0 ? (
              <li>{t('library.detail.countNoPrescription', { n: counts.no_prescription })}</li>
            ) : null}
            <li>{t('library.detail.countUndetermined', { n: counts.undetermined })}</li>
          </ul>
          {!passed && hasNoCondition ? <p className="max-w-prose text-sm text-ink-muted">{t('library.detail.cautious')}</p> : null}

          <section aria-labelledby="library-products" className="flex flex-col gap-2">
            <h2 id="library-products" className="text-lg font-semibold text-ink">
              {t('library.detail.productsHeading')}
            </h2>
            <ul className="hairline-list border-y border-line">
              {products.map((p) => {
                const shown = displayStatus(p.status, passed);
                return (
                  <li key={p.cis} className="flex flex-col gap-1 py-4">
                    <Ltr className="font-medium text-ink">{p.name}</Ltr>
                    <span className="text-ink">
                      <span className="font-medium">{t(`library.status.${shown}` as MessageKey)}</span>
                      {p.kinds.length > 0 ? (
                        <>
                          {' · '}
                          {p.kinds.map((k) => t(`library.kind.${k}` as MessageKey)).join(', ')}
                        </>
                      ) : null}
                    </span>
                    <span className="text-sm text-ink-muted">
                      {p.conditions.length > 0 ? (
                        <>
                          {t('library.detail.conditions')}{' '}
                          <bdi lang="fr" dir="ltr">
                            {p.conditions.join(' ; ')}
                          </bdi>
                        </>
                      ) : (
                        t('library.detail.noConditions')
                      )}
                    </span>
                    {!p.commercialised ? <span className="text-sm text-ink-muted">{t('library.detail.notCommercialised')}</span> : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      {library && date ? (
        <p className="max-w-prose text-sm text-ink-muted">
          {t('library.detail.source', { date })}{' '}
          <a href={library.source.page} target="_blank" rel="noopener noreferrer">
            {t('library.detail.sourceLink')}
          </a>
        </p>
      ) : null}

      <Link href="/bibliotheque" className="inline-flex min-h-12 w-fit items-center font-medium">
        {t('library.detail.back')}
      </Link>
    </PublicMain>
  );
}
