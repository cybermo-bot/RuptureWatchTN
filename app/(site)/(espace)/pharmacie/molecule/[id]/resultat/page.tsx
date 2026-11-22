import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/Button';
import { Guidance } from '@/components/Guidance';
import { LevelBadge } from '@/components/LevelBadge';
import { LevelExplanation } from '@/components/LevelExplanation';
import { t } from '@/lib/i18n';
import { getImpact, getMoleculeView, type Impact } from '@/lib/pharmacy/data';
import type { Level } from '@/lib/signal';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEVELS: Level[] = ['none', 'watch', 'likely', 'confirmed', 'cleared'];
const asLevel = (v: unknown): Level | null => (typeof v === 'string' && (LEVELS as string[]).includes(v) ? (v as Level) : null);

function impactText(impact: Impact | null): string {
  if (!impact) return t('core.result.impactUnavailable');
  if (impact.governorates === null) return t('core.result.impactFew', { days: impact.windowDays });
  if (impact.governorates === 1) {
    return t('core.result.impactOneGovernorate', { pharmacies: impact.pharmacies, days: impact.windowDays });
  }
  return t('core.result.impact', { pharmacies: impact.pharmacies, governorates: impact.governorates, days: impact.windowDays });
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
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2 border-b border-line pb-6">
        <p className="text-sm text-ink-muted">{view.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {delivered ? t('core.result.titleDelivered') : t('core.result.title')}
        </h1>
      </header>

      <section aria-labelledby="niveau" className="flex flex-col gap-4">
        <h2 id="niveau" className="text-sm font-medium text-ink-muted">
          {t('core.result.levelChange')}
        </h2>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3">
          <dt className="text-ink-muted">{t('core.result.before')}</dt>
          <dd>
            <LevelBadge level={before} className="text-base" />
          </dd>
          <dt className="text-ink-muted">{t('core.result.after')}</dt>
          <dd>
            <LevelBadge level={after} className="text-base" />
          </dd>
        </dl>
        {before === after ? <p className="text-sm text-ink-muted">{t('core.result.unchanged')}</p> : null}
      </section>

      {view.signal ? (
        <section aria-labelledby="pourquoi" className="flex flex-col gap-2">
          <h2 id="pourquoi" className="text-sm font-medium text-ink-muted">
            {t('core.result.why')}
          </h2>
          <LevelExplanation rule={view.signal.rule} evidence={view.signal.evidence} />
        </section>
      ) : null}

      <section aria-labelledby="impact" className="flex flex-col gap-2">
        <h2 id="impact" className="text-sm font-medium text-ink-muted">
          {t('core.result.impactTitle')}
        </h2>
        <p className="max-w-prose text-lg text-ink">{delivered ? t('core.result.impactDelivered') : impactText(impact)}</p>
      </section>

      <Guidance level={after} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/pharmacie">{t('core.result.toHome')}</ButtonLink>
        <ButtonLink href={`/pharmacie/molecule/${view.id}`} variant="secondary">
          {t('core.result.toMolecule')}
        </ButtonLink>
      </div>
    </div>
  );
}
