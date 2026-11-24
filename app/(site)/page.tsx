import { ArrowRight, BriefcaseMedical, ChevronRight, Search, Waypoints } from 'lucide-react';
import Link from 'next/link';
import { signInAsDemoRole } from '@/app/actions/auth';
import { buttonClass } from '@/components/Button';
import { PhoneQr } from '@/components/home/PhoneQr';
import { RolePicker } from '@/components/RolePicker';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { findDemoRole } from '@/lib/demo/roles';
import { t } from '@/lib/i18n';
import { UNDERSTAND } from '@/lib/nav';

const ROLES = [
  { key: 'coordination', label: 'ministry' },
  { key: 'centrale', label: 'central' },
  { key: 'ordre', label: 'order' },
  { key: 'grossiste', label: 'wholesaler' },
] as const;

const door = 'flex min-h-14 w-full items-center gap-3 px-2 py-3 text-start font-semibold text-ink no-underline hover:bg-surface-subtle hover:text-ink sm:px-4';
const arrow = 'ms-auto shrink-0 text-ink-muted';

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const { erreur } = await searchParams;
  const signInError = erreur === 'occupe' ? t('core.home.signInBusy') : typeof erreur === 'string' ? t('core.home.signInError') : null;

  return (
    <>
      <SiteHeader compact />
      <main id="contenu" className="flex-1 bg-page">
        <section className="stage bg-stage text-on-stage">
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-5 px-4 py-9 sm:px-6 sm:py-16 lg:px-8">
            <h1 className="max-w-[23ch] text-[2rem] leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
              {t('core.home.entry.title')}
            </h1>
            <Link href="/scenario" data-button className={buttonClass('stage')}>
              {t('core.home.entry.demo')} <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <p className="text-sm text-on-stage-muted sm:text-base">{t('core.home.entry.caption')}</p>
          </div>
        </section>

        <div id="roles" className="mx-auto flex max-w-7xl scroll-mt-4 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
          {signInError ? <p role="alert" className="text-level-confirmed">{signInError}</p> : null}
          <ul className="divide-y divide-line border-y border-line sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <li>
              <Link href="/medicaments?recherche=1" className={door}>
                <Search size={20} aria-hidden="true" className="shrink-0 text-brand" />
                {t('core.home.entry.patient')}
                <ChevronRight size={18} aria-hidden="true" className={arrow} />
              </Link>
            </li>
            <li>
              <form action={signInAsDemoRole}>
                <button name="role" value="pharmacie-tunis" type="submit" className={door}>
                  <BriefcaseMedical size={20} aria-hidden="true" className="shrink-0 text-brand" />
                  {t('core.home.entry.pharmacy')}
                  <ChevronRight size={18} aria-hidden="true" className={arrow} />
                </button>
              </form>
            </li>
            <li>
              <details>
                <summary className={`${door} group cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                  <Waypoints size={20} aria-hidden="true" className="shrink-0 text-brand" />
                  {t('core.home.entry.coordination')}
                  <ChevronRight size={18} aria-hidden="true" className={`${arrow} group-[[open]>summary]:rotate-90`} />
                </summary>
                <form action={signInAsDemoRole}>
                  <ul className="divide-y divide-line border-t border-line">
                    {ROLES.map(({ key, label }) => (
                      <li key={key}>
                        <button type="submit" name="role" value={key} aria-label={t('core.roles.signInAs', { role: t(findDemoRole(key)!.labelKey) })} className="min-h-12 w-full px-4 text-start text-brand hover:bg-surface-subtle">
                          {t(`core.home.entry.roles.${label}`)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </form>
              </details>
            </li>
          </ul>
          <details>
            <summary className="flex min-h-12 cursor-pointer items-center font-medium text-brand underline underline-offset-4">{t('core.home.entry.more')}</summary>
            <ul className="flex flex-wrap gap-x-5">
              {([...UNDERSTAND, { href: '/ruptures-passees', label: 'public.nav.past' }, { href: '/bibliotheque', label: 'public.nav.library' }, { href: '/status', label: 'core.home.statusLink' }] as const).map(({ href, label }) => (
                <li key={href}><Link href={href} className="inline-flex min-h-12 items-center">{t(label)}</Link></li>
              ))}
            </ul>
            <details className="mt-3">
              <summary className="flex min-h-12 cursor-pointer items-center font-medium text-brand">{t('core.home.rolesTitle')}</summary>
              <p className="mb-4 text-ink-muted">{t('core.home.rolesNote')}</p>
              <RolePicker publicExtra={<PhoneQr />} />
            </details>
          </details>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
