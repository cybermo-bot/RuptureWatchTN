import type { Metadata } from 'next';
import { GOVERNORATE_MAP_LICENCE, GOVERNORATE_SHAPES, GovernorateMap } from '@/components/GovernorateMap';
import { PageHeader } from '@/components/PageHeader';
import { SiteFooter, SiteHeader, SiteMain } from '@/components/SiteChrome';
import { checkHealth } from '@/lib/db/health';
import { t } from '@/lib/i18n';

export const metadata: Metadata = { title: t('core.status.title') };

const dateFormat = new Intl.DateTimeFormat('fr', {
  dateStyle: 'long',
  timeStyle: 'medium',
  timeZone: 'Africa/Tunis',
});

export default async function StatusPage() {
  const health = await checkHealth();
  const ok = health.status === 'ok';

  return (
    <>
      <SiteHeader />
      <SiteMain>
        <PageHeader title={t('core.status.title')} description={t('core.status.intro')} />

        <dl className="panel hairline-list max-w-xl px-5">
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-ink-muted">{t('core.status.database')}</dt>
            <dd className="flex items-center gap-2 font-medium text-ink">
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                {ok ? (
                  <path d="M2.5 8.5 L6.5 12.5 L13.5 4" fill="none" stroke="var(--level-cleared)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M3.5 3.5 L12.5 12.5 M12.5 3.5 L3.5 12.5" stroke="var(--level-confirmed)" strokeWidth="2.25" strokeLinecap="round" />
                )}
              </svg>
              {ok ? t('core.status.databaseOk') : t('core.status.databaseError')}
            </dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-ink-muted">{t('core.status.schemaVersion')}</dt>
            <dd className="font-mono text-ink">{health.schemaVersion ?? t('core.status.unknown')}</dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-ink-muted">{t('core.status.commit')}</dt>
            <dd className="font-mono text-ink">{health.commit ? health.commit.slice(0, 7) : t('core.status.unknown')}</dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-ink-muted">{t('core.status.checkedAt')}</dt>
            <dd className="text-end text-ink">
              <time dateTime={health.checkedAt}>{dateFormat.format(new Date(health.checkedAt))}</time>
            </dd>
          </div>
        </dl>

        <section aria-labelledby="carte" className="panel flex flex-col gap-6 p-5">
          <div className="flex flex-col gap-1">
            <h2 id="carte" className="text-xl font-semibold tracking-tight">
              {t('core.status.mapTitle')}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,26rem)_1fr] md:gap-16">
            <GovernorateMap showLabels className="mx-auto w-full max-w-[22rem] md:max-w-none" />
            <ol className="columns-2 gap-8 self-start text-sm sm:columns-3 md:columns-2 lg:columns-3" aria-hidden="true">
              {GOVERNORATE_SHAPES.map((g) => (
                <li key={g.code} className="flex break-inside-avoid justify-between gap-3 border-b border-line py-2">
                  <span className="text-ink">{g.name}</span>
                  <span className="font-mono text-ink-muted">{g.code}</span>
                </li>
              ))}
            </ol>
          </div>
          <p className="text-sm text-ink-muted">{t('core.status.mapSource', { source: GOVERNORATE_MAP_LICENCE })}</p>
        </section>
      </SiteMain>
      <SiteFooter />
    </>
  );
}
