import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { signInAsDemoRole, signInToSpace } from '@/app/actions/auth';
import { SignInButton } from '@/components/auth/SignInButton';
import { Button } from '@/components/Button';
import { SiteFooter, SiteHeader, SiteMain } from '@/components/SiteChrome';
import { canEnterAudience, isAccessAudience } from '@/lib/auth/access';
import { getCurrentSession } from '@/lib/auth/session';
import { HOME_BY_TYPE } from '@/lib/demo/roles';
import { t } from '@/lib/i18n';

const inputClass = 'min-h-12 w-full rounded-md border border-ink-muted bg-surface px-3 text-base font-normal text-ink';

export default async function SignInPage({ params, searchParams }: PageProps<'/connexion/[audience]'>) {
  const { audience } = await params;
  if (!isAccessAudience(audience)) notFound();
  const { erreur } = await searchParams;
  const session = await getCurrentSession();
  if (session && canEnterAudience(audience, session.organisation.type)) {
    const type = session.organisation.type;
    redirect(type === 'pharmacy' ? '/pharmacie/signaler' : HOME_BY_TYPE[type]);
  }

  const demoRole = audience === 'pharmacie' ? 'pharmacie-tunis' : audience === 'grossiste' ? 'grossiste' : null;

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
          <p className="mt-2 text-sm text-ink-muted">{t('core.access.invitation')}</p>
          {erreur ? <p role="alert" className="mt-4 text-level-confirmed">{t(erreur === 'occupe' ? 'core.access.busy' : 'core.access.invalid')}</p> : null}
          <form action={signInToSpace} className="mt-6 grid gap-4">
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
          {demoRole ? (
            <form action={signInAsDemoRole} className="mt-5 border-t border-line pt-3">
              <Button type="submit" name="role" value={demoRole} variant="quiet" className="w-full">
                {t('core.access.demo')}
              </Button>
            </form>
          ) : null}
        </section>
      </SiteMain>
      <SiteFooter />
    </>
  );
}
