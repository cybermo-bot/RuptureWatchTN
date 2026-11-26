import { BookOpen, LogOut, Stethoscope } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { signInAsDemoRole, switchRole } from '@/app/actions/auth';
import { buttonClass } from '@/components/Button';
import { GovernoratePanel } from '@/components/coordination/SignalsDashboard';
import { LevelBadge } from '@/components/LevelBadge';
import { LevelExplanation } from '@/components/LevelExplanation';
import { MissingLine } from '@/components/MissingLine';
import { Origins } from '@/components/Origins';
import { PageHeader } from '@/components/PageHeader';
import { MedicineSearch } from '@/components/public/MedicineSearch';
import { PublicMain } from '@/components/public/PublicChrome';
import { getCurrentSession } from '@/lib/auth/session';
import { createUserClient } from '@/lib/db/server';
import { formatDate } from '@/lib/format';
import { isPilot } from '@/lib/env';
import { t as french } from '@/lib/i18n';
import { getTranslator } from '@/lib/i18n-server';
import { getPublicMolecule } from '@/lib/public/medicine';
import { governorateCounts, listSignals } from '@/lib/signals/views';

// Track B: the quick status check for prescribers. Signed in with the prescriber role, a doctor
// sees every level of a medicine with the rule that fired, and the pharmacies reporting by
// governorate (counts only, "<3" below three: rule 1). Never a pharmacy's name, never a
// switch suggestion (rule 11). The level and its explanation are professional content, in
// French like the other professional spaces; the page around them follows the visitor's language.

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t('public.pages.prescribers.title') };
}

async function MoleculeCheck({ moleculeId }: { moleculeId: string }) {
  const molecule = await getPublicMolecule(moleculeId);
  if (!molecule) return null;
  const client = await createUserClient();
  const [signals, counts] = await Promise.all([listSignals(client, [molecule.id]), governorateCounts(client, molecule.id)]);
  const signal = signals[0];
  const level = signal?.level ?? 'none';

  return (
    <section aria-labelledby="check-title" lang="fr" dir="ltr" className="flex flex-col gap-5">
      <div className="panel flex flex-col gap-3 p-5">
        <h2 id="check-title" className="text-xl font-semibold break-words text-ink">
          {molecule.name}
        </h2>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-ink-muted">{french('core.prescribers.levelTitle')}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <LevelBadge level={level} />
            {signal && level !== 'none' ? <span className="text-sm text-ink-muted">{french('core.prescribers.since', { date: formatDate(signal.since) })}</span> : null}
            <Origins origins={signal?.evidence.origins} />
          </p>
        </div>
        {signal && level !== 'none' ? (
          <>
            <LevelExplanation rule={signal.rule} evidence={signal.evidence} showRule />
            <MissingLine level={level} rule={signal.rule} evidence={signal.evidence} />
          </>
        ) : (
          <p className="text-ink">{french('core.prescribers.noSignal')}</p>
        )}
        <p className="border-t border-line pt-3 text-sm text-ink-muted">{french('core.guidance.disclaimer')}</p>
      </div>

      <div className="panel p-5">
        <GovernoratePanel level={level} counts={counts} headingLevel={3} />
      </div>

      <p className="rounded-sm border border-ink-muted px-4 py-3 font-medium text-ink">{french('core.prescribers.substitution')}</p>
    </section>
  );
}

export default async function PrescribersPage(props: PageProps<'/prescripteurs'>) {
  const { t, locale } = await getTranslator();
  const session = await getCurrentSession();
  const prescriber = session?.organisation.type === 'prescriber';
  const m = (await props.searchParams).m;
  const moleculeId = typeof m === 'string' ? m : null;

  return (
    <PublicMain narrow>
      <PageHeader title={t('public.pages.prescribers.title')} description={t('public.prescribers.intro')} />

      {prescriber && session ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <p className="inline-flex items-center gap-2 text-sm text-ink">
              <Stethoscope size={18} aria-hidden="true" className="text-brand" />
              {t('public.prescribers.signedInAs', { organisation: String.fromCharCode(0x2068) + session.organisation.displayName + String.fromCharCode(0x2069) })}
            </p>
            <form action={switchRole}>
              <button type="submit" className={buttonClass('quiet', 'min-h-12')}>
                <LogOut size={18} aria-hidden="true" className="rtl:-scale-x-100" />
                {t('public.prescribers.changeRole')}
              </button>
            </form>
          </div>
          {/* Keyed by the medicine: picking one clears the search, so the check sits right under it. */}
          <MedicineSearch key={moleculeId ?? 'none'} locale={locale} linkPrefix="/prescripteurs?m=" label={t('public.prescribers.searchLabel')} />
          {moleculeId ? (
            <MoleculeCheck moleculeId={moleculeId} />
          ) : (
            <Link href="/methode" className="inline-flex min-h-12 items-center gap-2 self-start text-brand underline">
              <BookOpen size={18} aria-hidden="true" />
              {t('public.prescribers.method')}
            </Link>
          )}
        </>
      ) : (
        <section aria-labelledby="signed-out" className="panel flex flex-col gap-3 p-5">
          <h2 id="signed-out" className="text-lg font-semibold text-ink">
            {t('public.prescribers.signedOutTitle')}
          </h2>
          {/* The pilot site has no demo account (pilot-2 item 1). */}
          {isPilot() ? (
            <p className="text-ink">{t('public.prescribers.signedOutBodyPilot')}</p>
          ) : (
            <>
              <p className="text-ink">{t('public.prescribers.signedOutBody')}</p>
              <form action={signInAsDemoRole}>
                <input type="hidden" name="role" value="medecin" />
                <button type="submit" className={buttonClass('primary', 'w-full sm:w-auto')}>
                  <Stethoscope size={18} aria-hidden="true" />
                  {t('public.prescribers.demoButton')}
                </button>
              </form>
              <p className="text-sm text-ink-muted">{t('public.prescribers.demoNote')}</p>
            </>
          )}
        </section>
      )}
    </PublicMain>
  );
}
