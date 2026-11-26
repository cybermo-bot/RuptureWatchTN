import { ArrowRight, BellRing, MapPin, Send, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { ButtonLink } from '@/components/Button';
import { GuideSeen } from '@/components/pharmacy/GuideSeen';
import { t, type MessageKey } from '@/lib/i18n';
import { DEFAULT_PARAMS } from '@/lib/signal';

export const metadata: Metadata = { title: t('core.onboarding.title') };

// « Comment ça marche » (pilot-2 item 2): three short screens for a pharmacist alone, one sentence
// and one icon each. Each screen is its own address (?etape=), so it works without JavaScript;
// « Passer » leads to « Mes médicaments » from any of them. Shown by itself after joining (and, on
// the pilot, after signing in) once per browser; reopened from « Plus ».
const STEPS: { icon: LucideIcon; text: MessageKey }[] = [
  { icon: Send, text: 'core.onboarding.steps.report' },
  { icon: BellRing, text: 'core.onboarding.steps.level' },
  { icon: MapPin, text: 'core.onboarding.steps.patients' },
];

export default async function Guide({ searchParams }: PageProps<'/pharmacie/bienvenue'>) {
  const query = await searchParams;
  const requested = Number(query.etape);
  const index = Number.isInteger(requested) && requested >= 1 && requested <= STEPS.length ? requested - 1 : 0;
  const first = query.premiere === '1' && index === 0;
  const joined = query.rejoint === '1' && index === 0;
  const step = STEPS[index];
  const Icon = step.icon;
  const last = index === STEPS.length - 1;
  // The 72-hour rule, in days, from params.ts.
  const days = DEFAULT_PARAMS.minUndeliveredHours / 24;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 pt-2">
      <GuideSeen first={first} joined={joined} />
      {joined ? (
        <p role="note" className="flex items-start gap-3 rounded-md border border-line bg-surface px-4 py-3 text-ink">
          <ShieldCheck size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
          {t('core.onboarding.keepBrowser')}
        </p>
      ) : null}
      <header className="flex flex-col gap-1">
        <p className="text-sm text-ink-muted">{t('core.onboarding.step', { n: index + 1, total: STEPS.length })}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('core.onboarding.title')}</h1>
      </header>
      <section aria-live="polite" className="panel flex flex-col items-start gap-5 p-6">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-surface-subtle text-brand">
          <Icon size={28} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <p className="max-w-prose text-xl leading-snug text-ink">{t(step.text, { days })}</p>
      </section>
      <ol aria-hidden="true" className="flex gap-2">
        {STEPS.map((s, i) => (
          <li key={s.text} className={`h-1.5 flex-1 rounded-full ${i <= index ? 'bg-brand' : 'bg-line'}`} />
        ))}
      </ol>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <ButtonLink href={last ? '/pharmacie' : `/pharmacie/bienvenue?etape=${index + 2}`} className="sm:order-2">
          {t(last ? 'core.onboarding.start' : 'core.onboarding.next')}
          <ArrowRight size={18} aria-hidden="true" />
        </ButtonLink>
        {last ? null : (
          <ButtonLink href="/pharmacie" variant="quiet" className="sm:order-1">
            {t('core.onboarding.skip')}
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
