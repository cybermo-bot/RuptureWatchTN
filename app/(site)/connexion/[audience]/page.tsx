import { ArrowLeft, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { signInAsDemoRole, signInToSpace } from '@/app/actions/auth';
import { SignInButton } from '@/components/auth/SignInButton';
import { Button } from '@/components/Button';
import { SiteFooter, SiteHeader, SiteMain } from '@/components/SiteChrome';
import { canEnterAudience, isAccessAudience } from '@/lib/auth/access';
import { getCurrentSession } from '@/lib/auth/session';
import { type DemoRoleKey, HOME_BY_TYPE } from '@/lib/demo/roles';
import { isPilot } from '@/lib/env';
import { t, type MessageKey } from '@/lib/i18n';

// Each door opens on its one-click demos (pilot-1 item 4): two pharmacies in different
// governorates, the wholesaler, one demo per institutional space (lib/demo/roles.ts). The email
// and password form of real accounts sits below, folded under « J'ai un compte », and opens by
// itself after a failed sign-in so its message is seen.
const INSTITUTION_DEMOS = ['coordination', 'centrale', 'ordre', 'hopital'] as const satisfies readonly DemoRoleKey[];
const PHARMACY_DEMOS = [
  { key: 'pharmacie-tunis', label: 'core.access.pharmacie.demoTunis' },
  { key: 'pharmacie-sfax', label: 'core.access.pharmacie.demoSfax' },
] as const satisfies readonly { key: DemoRoleKey; label: MessageKey }[];

const inputClass = 'min-h-12 w-full rounded-sm border border-ink-muted bg-surface px-3 text-base font-normal text-ink';

export default async function SignInPage({ params, searchParams }: PageProps<'/connexion/[audience]'>) {
  const { audience } = await params;
  if (!isAccessAudience(audience)) notFound();
  const { erreur } = await searchParams;
  // The pilot site has no demo accounts: the form of real accounts, open (pilot-2 item 1).
  const pilot = isPilot();
  const session = await getCurrentSession();
  if (session && canEnterAudience(audience, session.organisation.type)) {
    const type = session.organisation.type;
    redirect(type === 'pharmacy' ? '/pharmacie/signaler' : HOME_BY_TYPE[type]);
  }


  return (
    <>
      <SiteHeader compact />
      <SiteMain narrow>
        <Link href="/#roles" className="inline-flex min-h-12 w-fit items-center gap-2">
          <ArrowLeft size={17} aria-hidden="true" />{t('core.access.home')}
        </Link>
        <section className="panel mx-auto w-full max-w-lg p-5 sm:p-8" aria-labelledby="connexion-titre">
          <h1 id="connexion-titre" className="text-3xl font-semibold tracking-tight text-ink">{t(`core.access.${audience}.title`)}</h1>
          <p className="mt-2 text-ink-muted">{t(`core.access.${audience}.description`)}</p>

          {!pilot && audience === 'pharmacie' ? (
            <form action={signInAsDemoRole} className="mt-6 grid gap-3" aria-labelledby="demo-pharmacie">
              <p id="demo-pharmacie" className="text-sm text-ink">{t('core.access.pharmacie.demoNote')}</p>
              {PHARMACY_DEMOS.map((demo) => (
                <Button key={demo.key} type="submit" name="role" value={demo.key} className="w-full">
                  {t(demo.label)}
                </Button>
              ))}
            </form>
          ) : null}
          {!pilot && audience === 'grossiste' ? (
            <form action={signInAsDemoRole} className="mt-6 grid">
              <Button type="submit" name="role" value="grossiste" className="w-full">
                {t('core.access.demo')}
              </Button>
            </form>
          ) : null}
          {!pilot && audience === 'institution' ? (
            <form action={signInAsDemoRole} className="mt-6" aria-labelledby="demo-institution">
              <h2 id="demo-institution" className="text-base font-semibold text-ink">{t('core.access.institution.demoTitle')}</h2>
              <p className="mt-1 text-sm text-ink-muted">{t('core.access.institution.demoNote')}</p>
              <ul className="mt-3 grid gap-2">
                {INSTITUTION_DEMOS.map((key) => (
                  <li key={key}>
                    <Button type="submit" name="role" value={key} variant="secondary" className="w-full">
                      {t(`core.access.institution.demo.${key}`)}
                    </Button>
                  </li>
                ))}
              </ul>
            </form>
          ) : null}

          <details open={erreur || pilot ? true : undefined} className={`group mt-6 ${pilot ? '' : 'border-t border-line'}`}>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 font-medium text-brand [&::-webkit-details-marker]:hidden">
              {t('core.access.haveAccount')}
              <ChevronDown size={18} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
            </summary>
            <p className="mt-1 text-sm text-ink-muted">{t('core.access.invitation')}</p>
            {erreur ? <p role="alert" className="mt-4 text-level-confirmed">{t(erreur === 'occupe' ? 'core.access.busy' : 'core.access.invalid')}</p> : null}
            <form action={signInToSpace} className="mt-4 grid gap-4 pb-2">
              <input type="hidden" name="espace" value={audience} />
              <label className="grid gap-1.5 text-sm font-medium">
                {t('core.access.email')}
                <input type="email" name="email" autoComplete="username" maxLength={254} required className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                {t('core.access.password')}
                <input type="password" name="password" autoComplete="current-password" maxLength={1024} required className={inputClass} />
              </label>
              <SignInButton />
            </form>
          </details>
        </section>
      </SiteMain>
      <SiteFooter />
    </>
  );
}
