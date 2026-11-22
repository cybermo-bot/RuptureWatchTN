import { notFound } from 'next/navigation';
import { joinAsTester } from '@/app/actions/tester';
import { Button } from '@/components/Button';
import { OriginBadge } from '@/components/OriginBadge';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { createAnonClient } from '@/lib/db/server';
import { t } from '@/lib/i18n';
import { isValidInviteCode } from '@/lib/tester';

export const metadata = { robots: { index: false, follow: false } };

// Tester onboarding. Valid only with the invite code. Nothing is asked but a governorate.
export default async function JoinPage({ params, searchParams }: PageProps<'/rejoindre/[code]'>) {
  const { code } = await params;
  if (!isValidInviteCode(decodeURIComponent(code))) notFound();
  const { erreur } = await searchParams;

  const { data: governorates } = await createAnonClient().from('governorates').select('code, name_fr').order('name_fr');

  return (
    <>
      <SiteHeader />
      <main id="contenu" className="mx-auto w-full max-w-xl flex-1 px-5 py-10 sm:px-8 sm:py-16">
        <div className="flex flex-col gap-8">
          <header className="flex flex-col gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t('core.tester.title')}</h1>
            <p className="text-ink">{t('core.tester.intro')}</p>
          </header>

          {erreur ? (
            <p role="alert" className="border-s-2 border-level-confirmed ps-3 text-ink">
              {erreur === 'gouvernorat' ? t('core.tester.invalidGovernorate') : t('core.tester.failed')}
            </p>
          ) : null}

          <form action={joinAsTester} className="flex flex-col gap-6">
            <input type="hidden" name="code" value={decodeURIComponent(code)} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="governorate" className="text-sm font-medium text-ink">
                {t('core.tester.governorate')}
              </label>
              <select
                id="governorate"
                name="governorate"
                required
                defaultValue=""
                className="min-h-12 w-full rounded-md border border-ink-muted bg-surface px-3 text-base text-ink focus:border-brand"
              >
                <option value="" disabled>
                  {t('core.tester.choose')}
                </option>
                {(governorates ?? []).map((g) => (
                  <option key={g.code} value={g.code}>
                    {g.name_fr}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full sm:w-auto sm:self-start">
              {t('core.tester.submit')}
            </Button>
          </form>

          <div className="flex flex-col gap-2 border-t border-line pt-6 text-sm text-ink-muted">
            <p className="flex flex-wrap items-center gap-2">
              <span>{t('core.tester.originNote')}</span>
              <OriginBadge origin="tester" />
            </p>
            <p>{t('core.tester.deviceNote')}</p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
