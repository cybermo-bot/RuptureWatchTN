import Link from 'next/link';
import { ButtonLink } from '@/components/Button';
import { LevelBadge } from '@/components/LevelBadge';
import { OriginBadge } from '@/components/OriginBadge';
import { RolePicker } from '@/components/RolePicker';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { getCurrentSession, type CurrentSession } from '@/lib/auth/session';
import { HOME_BY_TYPE } from '@/lib/demo/roles';
import { t, type MessageKey } from '@/lib/i18n';
import type { Level } from '@/lib/signal';

const STEPS: { id: string; title: MessageKey; body: MessageKey }[] = [
  { id: '1', title: 'core.home.steps.report.title', body: 'core.home.steps.report.body' },
  { id: '2', title: 'core.home.steps.signal.title', body: 'core.home.steps.signal.body' },
  { id: '3', title: 'core.home.steps.act.title', body: 'core.home.steps.act.body' },
];

const LEVELS: Level[] = ['watch', 'likely', 'confirmed', 'cleared'];

async function readSession(): Promise<CurrentSession | null> {
  try {
    return await getCurrentSession();
  } catch (error) {
    console.error('home: could not read the session', error instanceof Error ? error.message : error);
    return null;
  }
}

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const params = await searchParams;
  const signInError =
    params.erreur === 'occupe' ? t('core.home.signInBusy') : typeof params.erreur === 'string' ? t('core.home.signInError') : null;
  const session = await readSession();

  return (
    <>
      <SiteHeader>
        <Link href="/medicaments" className="inline-flex min-h-12 items-center font-medium text-brand underline underline-offset-4">
          {t('core.home.publicLink')}
        </Link>
      </SiteHeader>
      <main id="contenu" className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-x-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <section aria-labelledby="accroche" className="pt-10 pb-12 sm:pt-16 lg:pt-24 lg:pb-16">
              <h1
                id="accroche"
                className="max-w-[20ch] text-[1.875rem] leading-[1.15] font-semibold tracking-tight text-ink sm:text-[2.5rem] lg:text-[3rem]"
              >
                {t('core.home.tagline')}
              </h1>
              <a
                href="#roles"
                className="mt-6 inline-flex min-h-12 items-center gap-2 font-medium text-brand underline underline-offset-4 lg:hidden"
              >
                {t('core.home.jumpToRoles')}
                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3.5 6 L8 10.5 L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </section>

            <section aria-labelledby="fonctionnement" className="pb-12 lg:pb-24">
              <h2 id="fonctionnement" className="pb-4 text-sm font-medium text-ink-muted">
                {t('core.home.howTitle')}
              </h2>
              <ol className="hairline-list border-y border-line">
                {STEPS.map((step) => (
                  <li key={step.id} className="grid grid-cols-[2.25rem_1fr] gap-x-3 py-5 sm:grid-cols-[3rem_1fr]">
                    <span aria-hidden="true" className="pt-0.5 font-mono text-sm text-ink-muted">
                      {step.id.padStart(2, '0')}
                    </span>
                    <div className="flex flex-col gap-1">
                      <h3 className="font-semibold text-ink">{t(step.title)}</h3>
                      <p className="max-w-prose text-ink-muted">{t(step.body)}</p>
                      {step.id === '2' ? (
                        <div className="pt-3">
                          <p className="sr-only">{t('core.home.levelsLabel')}</p>
                          <ul className="flex flex-wrap gap-x-5 gap-y-2">
                            {LEVELS.map((level) => (
                              <li key={level}>
                                <LevelBadge level={level} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <section
            id="roles"
            aria-labelledby="roles-titre"
            className="-mx-5 mb-12 scroll-mt-4 bg-surface-subtle px-5 py-8 sm:mx-0 sm:rounded-lg sm:px-8 lg:col-span-5 lg:mt-24 lg:mb-24 lg:self-start"
          >
            <h2 id="roles-titre" className="text-xl font-semibold tracking-tight text-ink">
              {t('core.home.rolesTitle')}
            </h2>
            <p className="pt-1.5 pb-5 text-ink-muted">{t('core.home.rolesIntro')}</p>

            {signInError ? (
              <p role="alert" className="mb-5 border-s-2 border-level-confirmed ps-3 text-ink">
                {signInError}
              </p>
            ) : null}

            {session ? (
              <div className="mb-6 flex flex-col items-start gap-3 border-s-2 border-brand ps-3">
                <p className="text-ink">
                  {t('core.home.signedInAs', { role: session.organisation.displayName })}
                </p>
                <ButtonLink href={HOME_BY_TYPE[session.organisation.type]} variant="secondary">
                  {t('core.home.continue')}
                </ButtonLink>
              </div>
            ) : null}

            <RolePicker />

            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-5 text-sm text-ink-muted">
              <span>{t('core.home.rolesNote')}</span>
              <OriginBadge origin="simulated" />
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
