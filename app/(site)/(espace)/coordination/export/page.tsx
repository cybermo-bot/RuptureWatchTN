import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { getCurrentSession } from '@/lib/auth/session';
import { CSV_COLUMNS } from '@/lib/coordination/export';
import { HOME_BY_TYPE } from '@/lib/demo/roles';
import { t } from '@/lib/i18n';

export const metadata: Metadata = { title: t('core.export.title') };

// What the export contains, column by column, and where each value comes from.
export default async function ExportPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  if (session.organisation.type !== 'coordinator') redirect(HOME_BY_TYPE[session.organisation.type]);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader meta={t('core.orgTypes.coordinator')} title={t('core.export.title')} description={t('core.export.intro')} />
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          {/* Plain links: the route answers with a file download. */}
          <a
            href="/api/coordination/export?format=csv"
            className="inline-flex min-h-12 items-center rounded-md bg-brand px-5 font-medium text-white no-underline hover:bg-brand-strong hover:text-white"
          >
            {t('core.export.csv')}
          </a>
          <a
            href="/api/coordination/export?format=json"
            className="inline-flex min-h-12 items-center rounded-md border border-brand px-5 font-medium text-brand no-underline hover:bg-surface-subtle"
          >
            {t('core.export.json')}
          </a>
        </div>
        <p className="max-w-prose text-sm text-ink-muted">{t('core.export.formatNote')}</p>
      </div>
      <section aria-labelledby="colonnes" className="flex flex-col gap-3">
        <h2 id="colonnes" className="text-lg font-semibold text-ink">
          {t('core.export.columnsTitle')}
        </h2>
        <div className="overflow-x-auto">
          <table className="hairline-table min-w-[40rem] text-sm">
            <thead>
              <tr>
                <th scope="col">{t('core.export.colName')}</th>
                <th scope="col">{t('core.export.colMeaning')}</th>
                <th scope="col">{t('core.export.colOrigin')}</th>
              </tr>
            </thead>
            <tbody>
              {CSV_COLUMNS.map((c) => (
                <tr key={c}>
                  <td className="font-mono text-xs whitespace-nowrap text-ink">{c}</td>
                  <td>{t(`core.export.columns.${c}.meaning`)}</td>
                  <td className="text-ink-muted">{t(`core.export.columns.${c}.origin`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="max-w-prose text-sm text-ink-muted">{t('core.export.smallCounts')}</p>
        <p className="max-w-prose text-sm text-ink">{t('core.export.disclaimer')}</p>
      </section>
      <Link href="/coordination" className="flex min-h-12 w-fit items-center">
        {t('core.export.back')}
      </Link>
    </div>
  );
}
