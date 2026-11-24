import { BookOpen, ChevronRight, History, Layers, Play, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { connection } from 'next/server';
import { ButtonLink } from '@/components/Button';
import { GOVERNORATE_SHAPES, GovernorateMap, type GovernorateValue } from '@/components/GovernorateMap';
import { HomeStage } from '@/components/home/HomeStage';
import { LevelBadge } from '@/components/LevelBadge';
import { Origins } from '@/components/Origins';
import { OriginBadge } from '@/components/OriginBadge';
import { RolePicker } from '@/components/RolePicker';
import { PhoneQr } from '@/components/home/PhoneQr';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { getCurrentSession, type CurrentSession } from '@/lib/auth/session';
import { HOME_BY_TYPE } from '@/lib/demo/roles';
import { formatDate } from '@/lib/format';
import { RecentChangesList } from '@/components/RecentChanges';
import { loadNationalPicture, type NationalPicture } from '@/lib/home/national';
import { t, type MessageKey } from '@/lib/i18n';
import { LEVEL_ORDER } from '@/lib/signals/views';

// The home page shows the product. First the plum stage: the scenario's frozen moment and the
// "Voir le scénario" button (components/home/HomeStage.tsx). Then what the national unit sees in
// the demonstration (map filled by the most serious level per governorate, the medicines with
// their level: simulated signals only, rule 10), the roles, and the pages that explain it. Every
// figure is computed; simulated data carries its badge.

const EXPLORE: { href: string; icon: LucideIcon; title: MessageKey; body: MessageKey }[] = [
  { href: '/scenario', icon: Play, title: 'core.home.explore.scenario.title', body: 'core.home.explore.scenario.body' },
  { href: '/vues', icon: Layers, title: 'core.home.explore.views.title', body: 'core.home.explore.views.body' },
  { href: '/methode', icon: BookOpen, title: 'core.home.explore.method.title', body: 'core.home.explore.method.body' },
  { href: '/retour', icon: History, title: 'core.home.explore.replay.title', body: 'core.home.explore.replay.body' },
];

const MAP_FILL = (level: string) => `color-mix(in srgb, var(--level-${level}) 78%, white)`;

async function readSession(): Promise<CurrentSession | null> {
  try {
    return await getCurrentSession();
  } catch (error) {
    console.error('home: could not read the session', error instanceof Error ? error.message : error);
    return null;
  }
}

function NationalMap({ picture }: { picture: NationalPicture }) {
  const values: Partial<Record<string, GovernorateValue>> = {};
  for (const g of GOVERNORATE_SHAPES) {
    const level = picture.byGovernorate[g.code];
    values[g.code] = level
      ? { text: t(`core.levels.${level}`), fill: MAP_FILL(level) }
      : { text: t('core.home.national.mapNone'), fill: 'var(--surface)' };
  }
  return (
    <figure className="m-0 flex flex-col gap-3">
      <GovernorateMap values={values} title={t('core.home.national.mapTitle')} className="mx-auto w-full max-w-[19rem]" />
      <figcaption className="text-center text-sm text-ink-muted">{t('core.home.national.mapTitle')}</figcaption>
    </figure>
  );
}

function National({ picture }: { picture: NationalPicture | null }) {
  if (!picture) return <p className="panel p-5 text-ink-muted">{t('core.home.national.unavailable')}</p>;
  const simulated = picture.origins.includes('simulated');
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr]">
      <div className="panel flex flex-col gap-4 p-5 lg:col-start-1 lg:row-start-1">
        <NationalMap picture={picture} />
        <ul aria-label={t('core.home.national.countsLabel')} className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
          {LEVEL_ORDER.map((level) => (
            <li key={level} className="flex items-center justify-between gap-2">
              <LevelBadge level={level} />
              <span className="font-mono text-ink tabular-nums">{picture.counts[level]}</span>
            </li>
          ))}
        </ul>
      </div>
      <section aria-labelledby="medicaments-niveau" className="panel flex min-w-0 flex-col lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <header className="panel-header">
          <h3 id="medicaments-niveau" className="font-semibold text-ink">
            {t('core.home.national.listTitle')}
          </h3>
          {simulated ? <OriginBadge origin="simulated" /> : null}
        </header>
        {picture.signals.length === 0 ? (
          <p className="p-5 text-ink-muted">{t('core.home.national.empty')}</p>
        ) : (
          <ul className="hairline-list">
            {picture.signals.map((s) => (
              <li key={s.molecule_id}>
                <Link
                  href={`/vues/${s.molecule_id}`}
                  className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 no-underline transition-colors duration-150 hover:bg-surface-subtle"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium break-words text-ink">{s.molecule_name}</span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                      <LevelBadge level={s.level} />
                      <span>{t('core.pharmacy.since', { date: formatDate(s.since) })}</span>
                      <Origins origins={s.evidence.origins} />
                    </span>
                  </span>
                  <span className="sr-only">{t('core.home.national.seeViews')}</span>
                  <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-ink-muted rtl:-scale-x-100" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-auto border-t border-line px-4 py-3 text-xs text-ink-muted">{t('core.home.national.source')}</p>
      </section>
      <section aria-labelledby="derniers-changements" className="panel flex min-w-0 flex-col self-start lg:col-start-1 lg:row-start-2">
        <header className="panel-header">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 id="derniers-changements" className="font-semibold text-ink">
              {t('core.recent.title')}
            </h3>
            <p className="text-sm text-ink-muted">{t('core.recent.homeIntro')}</p>
          </div>
          {picture.recent.length > 0 ? <OriginBadge origin="simulated" /> : null}
        </header>
        <RecentChangesList events={picture.recent} href={(id) => `/vues/${id}`} />
      </section>
    </div>
  );
}

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  await connection();
  const params = await searchParams;
  const signInError =
    params.erreur === 'occupe' ? t('core.home.signInBusy') : typeof params.erreur === 'string' ? t('core.home.signInError') : null;
  const [session, picture] = await Promise.all([readSession(), loadNationalPicture()]);

  return (
    <>
      <SiteHeader />
      <main id="contenu" className="flex-1 bg-page">
        <HomeStage />

        <section aria-labelledby="vue-cellule" className="border-b border-line">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 id="vue-cellule" className="text-2xl font-semibold tracking-tight text-ink">
                  {t('core.home.national.title')}
                </h2>
                <span className="rounded-sm border border-dashed border-ink-muted px-1.5 font-mono text-xs leading-5 tracking-wide text-ink-muted uppercase">
                  {t('core.home.national.demo')}
                </span>
              </div>
              <p className="max-w-prose text-ink-muted">{t('core.home.national.frame')}</p>
            </div>
            <National picture={picture} />
          </div>
        </section>

        <section id="roles" aria-labelledby="roles-titre" className="scroll-mt-4">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-1.5">
              <h2 id="roles-titre" className="text-2xl font-semibold tracking-tight text-ink">
                {t('core.home.rolesTitle')}
              </h2>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-muted">
                <span>{t('core.home.rolesIntro')}</span>
                <span>{t('core.home.rolesNote')}</span>
                <OriginBadge origin="simulated" />
              </p>
            </div>

            {signInError ? (
              <p role="alert" className="panel border-s-4 border-s-level-confirmed p-4 text-ink">
                {signInError}
              </p>
            ) : null}

            {session ? (
              <div className="panel flex flex-col items-start gap-3 border-s-4 border-s-brand p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-ink">{t('core.home.signedInAs', { role: session.organisation.displayName })}</p>
                <ButtonLink href={HOME_BY_TYPE[session.organisation.type]} variant="secondary">
                  {t('core.home.continue')}
                </ButtonLink>
              </div>
            ) : null}

            <RolePicker publicExtra={<PhoneQr />} />
          </div>
        </section>

        <section aria-labelledby="comprendre">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-10 sm:px-6 lg:px-8">
            <h2 id="comprendre" className="text-2xl font-semibold tracking-tight text-ink">
              {t('core.home.exploreTitle')}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {EXPLORE.map(({ href, icon: Icon, title, body }) => (
                <li key={href}>
                  <Link href={href} className="panel flex h-full flex-col gap-2 p-4 no-underline transition-colors duration-150 hover:border-ink-muted">
                    <Icon size={20} strokeWidth={1.75} aria-hidden="true" className="text-brand" />
                    <span className="font-semibold text-ink">{t(title)}</span>
                    <span className="text-sm text-ink-muted">{t(body)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
