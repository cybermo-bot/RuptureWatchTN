import { ArrowRight, Check, Send } from 'lucide-react';
import type { CSSProperties } from 'react';
import { notFound } from 'next/navigation';
import { ButtonLink } from '@/components/Button';
import { Guidance } from '@/components/Guidance';
import { LevelBadge } from '@/components/LevelBadge';
import { LevelExplanation } from '@/components/LevelExplanation';
import { Origins } from '@/components/Origins';
import { Section } from '@/components/ui/Section';
import { getCurrentSession } from '@/lib/auth/session';
import { createUserClient } from '@/lib/db/server';
import { t } from '@/lib/i18n';
import { getImpact, getMoleculeView } from '@/lib/pharmacy/data';
import { belowThresholdText, impactText, type Impact } from '@/lib/pharmacy/impact-text';
import { presentationText } from '@/lib/public/presentation';
import type { Level } from '@/lib/signal';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEVELS: Level[] = ['none', 'watch', 'likely', 'confirmed', 'cleared'];
const asLevel = (v: unknown): Level | null => (typeof v === 'string' && (LEVELS as string[]).includes(v) ? (v as Level) : null);

/**
 * Pilot-3 item 2: the product named on this pharmacy's latest « non livré » report for the
 * molecule (its own reports only, row-level security), or null. No count of other pharmacies.
 */
async function reportedProduct(moleculeId: string): Promise<{ label: string; brand: string } | null> {
  const session = await getCurrentSession();
  if (!session) return null;
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('reports')
    .select('medicine:medicines(label, brand)')
    .eq('organisation_id', session.organisation.id)
    .eq('molecule_id', moleculeId)
    .eq('kind', 'not_delivered')
    .order('reported_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const medicine = (data as { medicine: { label: string; brand: string } | { label: string; brand: string }[] | null }).medicine;
  return Array.isArray(medicine) ? (medicine[0] ?? null) : medicine;
}

/** The national count the report added to, as a plain figure with its unit. Below 3, words only. */
function ImpactFigure({ impact }: { impact: Impact }) {
  if (impact.pharmacies === '<3' || impact.governorates === null) {
    return <p className="rw-rise text-lg font-medium text-ink">{t('core.result.countLabelFew')}</p>;
  }
  const n = Number(impact.pharmacies);
  return (
    <p className="flex flex-col gap-1 text-ink">
      <span className="flex items-baseline gap-2">
        <span className="figure">{n}</span>
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

// What the pharmacist sees right after a report, in three steps (session 6): "Signalement reçu",
// "Ce que votre signalement a changé" (the level before and after, the national count it added
// to, why), then "Prochaine action" (the team's guidance and the next button). Pilot-4 step 4:
// the check pops in, then « Avant → Après » rises in sequence and the new level scales in.
export default async function ReportResult({ params, searchParams }: PageProps<'/pharmacie/molecule/[id]/resultat'>) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const query = await searchParams;
  const delivered = query.type === 'da';

  const [view, impact, product] = await Promise.all([
    getMoleculeView(id),
    delivered ? Promise.resolve(null) : getImpact(id),
    delivered ? Promise.resolve(null) : reportedProduct(id),
  ]);
  if (!view) notFound();

  const after = view.signal?.level ?? asLevel(query.apres) ?? 'none';
  const before = asLevel(query.avant) ?? after;
  // Below « Probable »: one plain line says what the report did and what is missing; the team's
  // rule sentence under « Pourquoi ce niveau » then says the count once (pilot-1 item 7).
  const belowThreshold = !delivered && view.signal?.rule === 'local_reports_below_threshold';

  const changed = before !== after;
  const step = (n: number) => ({ '--step': n }) as CSSProperties;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col items-start gap-3 pt-2">
        <span className="rw-check inline-flex size-12 items-center justify-center rounded-full bg-brand text-white">
          <Check size={24} strokeWidth={2.5} aria-hidden="true" />
        </span>
        <h1 className="title-1 text-ink">{delivered ? t('core.result.titleDelivered') : t('core.result.title')}</h1>
        <p className="text-lg break-words text-ink">{view.name}</p>
        {product ? (
          <p data-reported-product className="text-ink-muted">
            {t('core.presentations.own', { product: presentationText(product, t) })}
          </p>
        ) : null}
      </header>

      <section aria-labelledby="change" data-status-card className="flex flex-col gap-4 rounded-md bg-powder-blue p-4 sm:p-5">
        <h2 id="change" className="title-3 text-ink">
          {t('core.result.impactTitle')}
        </h2>
        <dl aria-label={t('core.result.levelChange')} data-level-change className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
          <div className="rw-step flex flex-col gap-1" style={step(0)}>
            <dt className="eyebrow text-ink-muted">{t('core.result.before')}</dt>
            <dd>
              <LevelBadge level={before} />
            </dd>
          </div>
          <ArrowRight size={20} aria-hidden="true" className="rw-step ms-0.5 rotate-90 text-ink-muted sm:ms-0 sm:mb-0.5 sm:rotate-0 rtl:sm:-scale-x-100" style={step(1)} />
          <div className="rw-step flex flex-col gap-1" style={step(2)}>
            <dt className="eyebrow text-ink-muted">{t('core.result.after')}</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <span className={changed ? 'rw-level-in' : undefined}>
                <LevelBadge level={after} size="lg" />
              </span>
              <Origins origins={view.signal?.evidence.origins} />
            </dd>
          </div>
        </dl>
        {changed ? null : <p className="text-sm text-ink-muted">{t('core.result.unchanged')}</p>}
        <div className="border-t border-line pt-4">
          {delivered ? (
            <p className="max-w-prose text-lg text-ink">{t('core.result.impactDelivered')}</p>
          ) : belowThreshold ? (
            <p className="max-w-prose text-lg text-ink">{belowThresholdText()}</p>
          ) : impact ? (
            <>
              <ImpactFigure impact={impact} />
              <p className="sr-only">{impactText(impact)}</p>
            </>
          ) : (
            <p className="text-ink">{impactText(null)}</p>
          )}
        </div>
        {view.signal ? (
          <div className="flex flex-col gap-1 border-t border-line pt-4">
            <h3 className="text-sm font-medium text-ink-muted">{t('core.result.why')}</h3>
            <LevelExplanation rule={view.signal.rule} evidence={view.signal.evidence} />
          </div>
        ) : null}
      </section>

      <Section id="prochaine" title={t('core.result.nextTitle')}>
        <Guidance level={after} headingLevel={3} />
      </Section>

      {/* In the flow: on phones the bottom bar's « Accueil » and « Signaler » are the thumb's next step. */}
      <div>
        <div className="flex flex-col gap-2 sm:flex-row">
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
