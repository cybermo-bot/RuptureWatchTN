import { Check, Send } from 'lucide-react';
import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/Button';
import { Guidance } from '@/components/Guidance';
import { LevelBadge } from '@/components/LevelBadge';
import { LevelExplanation } from '@/components/LevelExplanation';
import { Origins } from '@/components/Origins';
import { CountUp } from '@/components/pharmacy/CountUp';
import { t } from '@/lib/i18n';
import { getImpact, getMoleculeView } from '@/lib/pharmacy/data';
import { impactText, type Impact } from '@/lib/pharmacy/impact-text';
import type { Level } from '@/lib/signal';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEVELS: Level[] = ['none', 'watch', 'likely', 'confirmed', 'cleared'];
const asLevel = (v: unknown): Level | null => (typeof v === 'string' && (LEVELS as string[]).includes(v) ? (v as Level) : null);

/** The national count the report added to, counted up once. Below 3, words only. */
function ImpactFigure({ impact }: { impact: Impact }) {
  if (impact.pharmacies === '<3' || impact.governorates === null) {
    return <p className="rw-rise text-lg font-medium text-ink">{t('core.result.countLabelFew')}</p>;
  }
  const n = Number(impact.pharmacies);
  return (
    <p className="flex flex-col gap-1 text-ink">
      <span className="flex items-baseline gap-2">
        <span className="text-4xl leading-none font-semibold">
          <CountUp from={0} to={n} />
        </span>
        <span className="text-lg font-medium">{t('core.result.countLabelMany')}</span>
      </span>
      <span className="text-ink-muted">
        {impact.governorates === 1
          ? t('core.result.countOneGovernorate')
          : t('core.result.countGovernorates', { count: impact.governorates })}
        {', '}
        {t('core.result.countWindow', { days: impact.windowDays })}
      </span>
    </p>
  );
}

// What the pharmacist sees right after a report: the level before and after, why, what the
// report added to nationally, and what to do.
export default async function ReportResult({ params, searchParams }: PageProps<'/pharmacie/molecule/[id]/resultat'>) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const query = await searchParams;
  const delivered = query.type === 'da';

  const [view, impact] = await Promise.all([getMoleculeView(id), delivered ? Promise.resolve(null) : getImpact(id)]);
  if (!view) notFound();

  const after = view.signal?.level ?? asLevel(query.apres) ?? 'none';
  const before = asLevel(query.avant) ?? after;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-24 lg:pb-0">
      <header className="flex flex-col items-start gap-3 pt-2">
        <span className="rw-rise inline-flex size-12 items-center justify-center rounded-full bg-brand text-white">
          <Check size={26} strokeWidth={2.5} aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {delivered ? t('core.result.titleDelivered') : t('core.result.title')}
        </h1>
        <p className="text-lg break-words text-ink">{view.name}</p>
      </header>

      <section aria-labelledby="niveau" className="panel flex flex-col gap-4 p-4">
        <h2 id="niveau" className="text-sm font-medium text-ink-muted">
          {t('core.result.levelChange')}
        </h2>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3">
          <dt className="text-ink-muted">{t('core.result.before')}</dt>
          <dd>
            <LevelBadge level={before} className="text-base" />
          </dd>
          <dt className="text-ink-muted">{t('core.result.after')}</dt>
          <dd className={before !== after ? 'rw-rise' : ''}>
            <span className="flex flex-wrap items-center gap-2">
              <LevelBadge level={after} className="text-base" />
              <Origins origins={view.signal?.evidence.origins} />
            </span>
          </dd>
        </dl>
        {before === after ? <p className="text-sm text-ink-muted">{t('core.result.unchanged')}</p> : null}
        {view.signal ? (
          <div className="flex flex-col gap-1 border-t border-line pt-4">
            <h3 className="text-sm font-medium text-ink-muted">{t('core.result.why')}</h3>
            <LevelExplanation rule={view.signal.rule} evidence={view.signal.evidence} />
          </div>
        ) : null}
      </section>

      <section aria-labelledby="impact" className="panel flex flex-col gap-3 p-4">
        <h2 id="impact" className="text-sm font-medium text-ink-muted">
          {t('core.result.impactTitle')}
        </h2>
        {delivered ? (
          <p className="max-w-prose text-lg text-ink">{t('core.result.impactDelivered')}</p>
        ) : impact ? (
          <>
            <ImpactFigure impact={impact} />
            <p className="sr-only">{impactText(impact)}</p>
          </>
        ) : (
          <p className="text-ink">{impactText(null)}</p>
        )}
      </section>

      <div className="panel p-4">
        <Guidance level={after} />
      </div>

      {/* The next step stays in reach of the thumb on phones. */}
      <div className="safe-bottom fixed inset-x-0 bottom-16 z-20 border-t border-line bg-surface px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row">
          <ButtonLink href="/pharmacie" className="flex-1 sm:flex-none">
            {t('core.result.toHome')}
          </ButtonLink>
          <ButtonLink href="/pharmacie/signaler" variant="secondary" className="flex-1 sm:flex-none">
            <Send size={16} aria-hidden="true" />
            {t('core.result.newReport')}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
