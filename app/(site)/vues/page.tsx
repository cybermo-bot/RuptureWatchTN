import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { EmptyState } from '@/components/EmptyState';
import { LevelBadge } from '@/components/LevelBadge';
import { PageHeader } from '@/components/PageHeader';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { t } from '@/lib/i18n';
import { getFollowed } from '@/lib/pharmacy/data';
import { listSignals, sortSignals } from '@/lib/signals/views';
import { demoClient, VIEW_ROLES } from '@/lib/views/demo-clients';

export const metadata: Metadata = { title: t('core.views.indexTitle') };

// Which molecule to look at: those with a level, as the coordination account sees them, and
// those the demo pharmacy follows, as it sees them. Public, no sign-in.
export default async function ViewsIndex() {
  await connection();
  let signals: Awaited<ReturnType<typeof listSignals>> = [];
  let followed: Awaited<ReturnType<typeof getFollowed>> = [];
  let failed = false;
  try {
    const [coordination, pharmacy] = await Promise.all([demoClient(VIEW_ROLES.coordination), demoClient(VIEW_ROLES.pharmacy)]);
    [signals, followed] = await Promise.all([listSignals(coordination), getFollowed(pharmacy)]);
  } catch (error) {
    console.error('/vues: demo accounts unavailable', error instanceof Error ? error.message : error);
    failed = true;
  }
  const withSignal = sortSignals(signals);
  const signalIds = new Set(withSignal.map((s) => s.molecule_id));
  const others = followed.filter((f) => !signalIds.has(f.moleculeId));

  return (
    <>
      <SiteHeader />
      <main id="contenu" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-5 py-8 sm:px-8 sm:py-12">
        <PageHeader title={t('core.views.indexTitle')} description={t('core.views.indexIntro')} />
        {failed ? (
          <EmptyState title={t('core.views.errorTitle')} body={t('core.views.errorBody')} />
        ) : withSignal.length === 0 && others.length === 0 ? (
          <EmptyState
            title={t('core.views.indexEmptyTitle')}
            body={t('core.views.indexEmptyBody')}
            action={<Link href="/scenario">{t('core.views.scenarioLink')}</Link>}
          />
        ) : (
          <div className="flex max-w-2xl flex-col gap-10">
            {withSignal.length ? (
              <section aria-labelledby="avec-niveau" className="flex flex-col gap-3">
                <h2 id="avec-niveau" className="text-lg font-semibold text-ink">
                  {t('core.views.withSignal')}
                </h2>
                <ul className="hairline-list border-y border-line">
                  {withSignal.map((s) => (
                    <li key={s.molecule_id}>
                      <Link href={`/vues/${s.molecule_id}`} className="flex min-h-12 flex-wrap items-center justify-between gap-3 py-2">
                        <span className="font-medium break-words">{s.molecule_name}</span>
                        <LevelBadge level={s.level} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {others.length ? (
              <section aria-labelledby="suivis" className="flex flex-col gap-3">
                <h2 id="suivis" className="text-lg font-semibold text-ink">
                  {t('core.views.followed')}
                </h2>
                <ul className="hairline-list border-y border-line">
                  {others.map((f) => (
                    <li key={f.moleculeId}>
                      <Link href={`/vues/${f.moleculeId}`} className="flex min-h-12 items-center py-2 font-medium break-words">
                        {f.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
