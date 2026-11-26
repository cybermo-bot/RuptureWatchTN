'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import { OriginBadge } from '@/components/OriginBadge';
import { DecisionForm } from '@/components/wholesaler/DecisionForm';
import type { AllocationParams } from '@/lib/allocation/params';
import { proportionalSplit } from '@/lib/allocation/proportional';
import { fairSplit, minCoverAfter, minCoverBefore, type GovernorateNeed } from '@/lib/allocation/split';
import { parseStock } from '@/lib/allocation/stock';
import { stockForTarget } from '@/lib/allocation/target';
import { t } from '@/lib/i18n';

// The wholesaler's split page, part A of the session 6 handoff: the same stock shared two ways,
// side by side. "Répartition proportionnelle à l'usage" is a reference model; "Répartition selon
// les jours de couverture" (fairSplit) is the proposal the decision records. Both are computed in
// the browser from the same pure functions the server uses, so typing a stock updates both at
// once. Without JavaScript, the GET form reloads the page with ?stock=, and the "all governorates"
// and target controls are links and a GET form too.

const WEAKEST = 5;
const nf = new Intl.NumberFormat('fr-FR');
const df = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** Days shown to one decimal, as compared on screen. */
const round1 = (n: number) => Math.round(n * 10) / 10;

export interface SplitComparisonProps {
  moleculeId: string;
  needs: GovernorateNeed[];
  names: Record<string, string>;
  params: AllocationParams;
  /** The stock from the URL, or the example stock. */
  initialStock: string;
  initialShowAll: boolean;
  initialTarget: string;
  /** "Voir le protocole appliqué" link, placed next to the decision. */
  protocolLink?: ReactNode;
}

function replaceQuery(changes: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(changes)) {
    if (v === null) url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  url.searchParams.delete('enregistre');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
}

export function SplitComparison(props: SplitComparisonProps) {
  const { needs, names, params } = props;
  const [stockText, setStockText] = useState(props.initialStock);
  const [showAll, setShowAll] = useState(props.initialShowAll);
  const [targetText, setTargetText] = useState(props.initialTarget);
  const stockId = useId();
  const targetId = useId();
  const tableId = useId();

  const stock = parseStock(stockText);
  const result = useMemo(() => {
    if (stock === null) return null;
    const reference = proportionalSplit(stock, needs, params);
    const fair = fairSplit(stock, needs, params);
    const use = new Map(needs.map((g) => [g.code, g.monthlyUse]));
    const ref = new Map(reference.rows.map((r) => [r.code, r]));
    const rows = fair.rows
      .map((r) => ({
        code: r.code,
        name: names[r.code] ?? r.code,
        use: use.get(r.code) ?? 0,
        before: r.coverBefore,
        fairBoxes: r.boxes,
        fairAfter: r.coverAfter,
        refBoxes: ref.get(r.code)?.boxes ?? 0,
        refAfter: ref.get(r.code)?.coverAfter ?? null,
      }))
      // Least initial cover first; no use last; ties by name.
      .sort((a, b) => (a.before ?? Infinity) - (b.before ?? Infinity) || a.name.localeCompare(b.name, 'fr'));
    return {
      reference,
      fair,
      rows,
      minBefore: minCoverBefore(fair),
      minRef: minCoverAfter(reference),
      minFair: minCoverAfter(fair),
    };
  }, [stock, needs, names, params]);

  const targetDays = /^\d{1,3}$/.test(targetText.trim()) ? Number(targetText.trim()) : Number.NaN;
  const target = useMemo(() => stockForTarget(targetDays, needs, params), [targetDays, needs, params]);

  const pct = Math.round(params.hospitalReserveShare * 100);
  const maxDays = params.periodDays;
  const shown = result ? (showAll ? result.rows : result.rows.slice(0, WEAKEST)) : [];
  const allHref = `?stock=${stock ?? ''}&gouvernorats=${showAll ? '' : 'tous'}${targetText ? `&cible=${encodeURIComponent(targetText)}` : ''}`;

  return (
    <>
      <section aria-labelledby="comparer" className="panel flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-2">
          <p className="flex flex-wrap items-center gap-2">
            <OriginBadge origin="simulated" />
          </p>
          <h2 id="comparer" className="text-lg font-semibold text-ink">
            {t('wholesaler.split.compare.title')}
          </h2>
          <p className="text-sm text-ink-muted">{t('wholesaler.split.compare.intro')}</p>
        </div>

        <form
          method="get"
          className="flex flex-col gap-2 sm:max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            if (stock !== null) replaceQuery({ stock: String(stock) });
          }}
        >
          <label htmlFor={stockId} className="text-sm font-medium text-ink">
            {t('wholesaler.split.stockLabel')}
          </label>
          <div className="flex gap-2">
            <input
              id={stockId}
              name="stock"
              inputMode="numeric"
              autoComplete="off"
              required
              value={stockText}
              onChange={(e) => {
                setStockText(e.target.value);
                const n = parseStock(e.target.value);
                if (n !== null) replaceQuery({ stock: String(n) });
              }}
              aria-describedby={`${stockId}-hint`}
              aria-invalid={stock === null || undefined}
              className="min-h-12 w-full rounded-sm border border-ink-muted bg-surface px-3.5 font-mono text-base text-ink tabular-nums focus:border-brand"
            />
            {showAll ? <input type="hidden" name="gouvernorats" value="tous" /> : null}
            <button
              type="submit"
              className="min-h-12 shrink-0 rounded-sm border border-brand px-4 font-medium text-brand hover:bg-surface-subtle"
            >
              {t('wholesaler.split.compute')}
            </button>
          </div>
          <p id={`${stockId}-hint`} className="text-sm text-ink-muted" aria-live="polite">
            {stock === null ? t('wholesaler.split.stockInvalid') : t('wholesaler.split.compare.stockHint')}
          </p>
        </form>

        {result ? (
          <>
            <p className="text-ink">
              {t('wholesaler.split.compare.shares', {
                stock: nf.format(result.fair.stock),
                reserve: nf.format(result.fair.reserve),
                pct,
                toShare: nf.format(result.fair.stock - result.fair.reserve),
              })}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <ResultCard
                tag={t('wholesaler.split.compare.referenceTag')}
                title={t('wholesaler.split.compare.referenceTitle')}
                body={t('wholesaler.split.compare.referenceBody')}
                shape={<Square />}
                minCover={result.minRef}
                allocated={result.reference.allocated}
                unallocated={result.reference.unallocated}
              />
              <ResultCard
                proposed
                tag={t('wholesaler.split.compare.fairTag')}
                title={t('wholesaler.split.compare.fairTitle')}
                body={t('wholesaler.split.compare.fairBody')}
                shape={<Diamond />}
                minCover={result.minFair}
                allocated={result.fair.allocated}
                unallocated={result.fair.unallocated}
              />
            </div>

            {result.minBefore !== null && result.minRef !== null && result.minFair !== null ? (
              <div className="flex flex-col gap-1 border-s-2 border-brand ps-3 text-ink" aria-live="polite">
                <p>{t('wholesaler.split.compare.weakestBefore', { days: df.format(result.minBefore) })}</p>
                <p className="font-medium">
                  {(() => {
                    const diff = round1(result.minFair) - round1(result.minRef);
                    if (Math.abs(diff) < 0.05) return t('wholesaler.split.compare.differenceNone');
                    return diff > 0
                      ? t('wholesaler.split.compare.difference', { days: df.format(diff) })
                      : t('wholesaler.split.compare.differenceLess', { days: df.format(-diff) });
                  })()}
                </p>
              </div>
            ) : (
              <p className="text-ink-muted">{t('wholesaler.split.compare.noUse')}</p>
            )}

            <RangePlot rows={shown} maxDays={maxDays} />

            <div className="flex flex-col gap-2">
              <p className="text-sm text-ink-muted">
                {showAll
                  ? t('wholesaler.split.compare.allNote', { n: result.rows.length })
                  : t('wholesaler.split.compare.weakestNote', { n: Math.min(WEAKEST, result.rows.length) })}
              </p>
              <div className="overflow-x-auto">
                <table id={tableId} className="hairline-table w-full text-sm">
                  <caption className="sr-only">{t('wholesaler.split.compare.tableCaption')}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t('wholesaler.split.colGovernorate')}</th>
                      <th scope="col" className="text-end">
                        {t('wholesaler.split.colUse')}
                      </th>
                      <th scope="col" className="text-end">
                        {t('wholesaler.split.colBefore')}
                      </th>
                      <th scope="col" className="text-end">
                        {t('wholesaler.split.compare.colReferenceBoxes')}
                      </th>
                      <th scope="col" className="text-end">
                        {t('wholesaler.split.compare.colReferenceAfter')}
                      </th>
                      <th scope="col" className="text-end">
                        {t('wholesaler.split.compare.colFairBoxes')}
                      </th>
                      <th scope="col" className="text-end">
                        {t('wholesaler.split.compare.colFairAfter')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.code}>
                        <th scope="row" className="font-normal text-ink">
                          {r.name}
                        </th>
                        <td className="text-end font-mono">{nf.format(r.use)}</td>
                        <td className="text-end font-mono">{r.before === null ? t('wholesaler.split.noUse') : df.format(r.before)}</td>
                        <td className="text-end font-mono">{nf.format(r.refBoxes)}</td>
                        <td className="text-end font-mono">{r.refAfter === null ? t('wholesaler.split.noUse') : df.format(r.refAfter)}</td>
                        <td className="text-end font-mono font-medium">{nf.format(r.fairBoxes)}</td>
                        <td className="text-end font-mono font-medium">
                          {r.fairAfter === null ? t('wholesaler.split.noUse') : df.format(r.fairAfter)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.rows.length > WEAKEST ? (
                <a
                  href={allHref}
                  role="button"
                  aria-expanded={showAll}
                  aria-controls={tableId}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowAll(!showAll);
                    replaceQuery({ gouvernorats: showAll ? null : 'tous' });
                  }}
                  className="inline-flex min-h-12 w-fit items-center font-medium"
                >
                  {showAll
                    ? t('wholesaler.split.compare.showWeakest', { n: WEAKEST })
                    : t('wholesaler.split.compare.showAll', { n: result.rows.length })}
                </a>
              ) : null}
            </div>

            <form
              method="get"
              className="flex flex-col gap-2 border-t border-line pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                replaceQuery({ cible: targetText.trim() || null });
              }}
            >
              <h3 className="font-semibold text-ink">{t('wholesaler.split.compare.targetTitle')}</h3>
              <input type="hidden" name="stock" value={stock ?? ''} />
              {showAll ? <input type="hidden" name="gouvernorats" value="tous" /> : null}
              <label htmlFor={targetId} className="text-sm font-medium text-ink">
                {t('wholesaler.split.compare.targetLabel')}
              </label>
              <div className="flex gap-2 sm:max-w-xs">
                <input
                  id={targetId}
                  name="cible"
                  inputMode="numeric"
                  autoComplete="off"
                  value={targetText}
                  onChange={(e) => {
                    setTargetText(e.target.value);
                    replaceQuery({ cible: e.target.value.trim() || null });
                  }}
                  aria-describedby={`${targetId}-result ${targetId}-note`}
                  className="min-h-12 w-full rounded-sm border border-ink-muted bg-surface px-3.5 font-mono text-base text-ink tabular-nums focus:border-brand"
                />
                <button
                  type="submit"
                  className="min-h-12 shrink-0 rounded-sm border border-brand px-4 font-medium text-brand hover:bg-surface-subtle"
                >
                  {t('wholesaler.split.compare.targetCompute')}
                </button>
              </div>
              <p id={`${targetId}-result`} className="text-ink" aria-live="polite">
                {target.status === 'ok'
                  ? t('wholesaler.split.compare.targetResult', {
                      days: targetDays,
                      stock: nf.format(target.stock),
                      reserve: nf.format(target.reserve),
                      distributable: nf.format(target.distributable),
                    })
                  : target.status === 'reached'
                    ? t('wholesaler.split.compare.targetReached', { days: targetDays })
                    : target.status === 'beyond_horizon'
                      ? t('wholesaler.split.compare.targetBeyond', { period: target.periodDays })
                      : t('wholesaler.split.compare.targetInvalid', { period: maxDays })}
              </p>
              <p id={`${targetId}-note`} className="text-sm text-ink-muted">
                {t('wholesaler.split.compare.targetNote')}
              </p>
            </form>
          </>
        ) : null}
      </section>

      {stock !== null ? (
        <section id="decision" aria-labelledby="decision-titre" className="panel flex scroll-mt-4 flex-col gap-4 p-5">
          <h2 id="decision-titre" className="text-lg font-semibold text-ink">
            {t('wholesaler.split.decideTitle')}
          </h2>
          <p className="text-sm text-ink-muted">{t('wholesaler.split.compare.decisionLinked', { stock: nf.format(stock) })}</p>
          {props.protocolLink}
          <DecisionForm moleculeId={props.moleculeId} stock={stock} />
        </section>
      ) : null}
    </>
  );
}

function ResultCard({
  tag,
  title,
  body,
  shape,
  minCover,
  allocated,
  unallocated,
  proposed = false,
}: {
  tag: string;
  title: string;
  body: string;
  shape: ReactNode;
  minCover: number | null;
  allocated: number;
  unallocated: number;
  proposed?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-3 rounded-md border p-4 ${proposed ? 'border-brand' : 'border-line'}`}>
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-2 text-sm font-medium text-ink-muted">
          {shape}
          {tag}
        </span>
        <h3 className="font-semibold text-ink">{title}</h3>
      </div>
      <dl className="grid grid-cols-[auto_auto] justify-start gap-x-6 gap-y-1">
        <div className="col-span-2 mb-1 flex flex-col">
          <dt className="text-sm text-ink-muted">{t('wholesaler.split.compare.minCover')}</dt>
          <dd className="font-mono text-2xl font-semibold text-ink tabular-nums">
            {minCover === null ? '—' : t('wholesaler.split.compare.daysValue', { days: df.format(minCover) })}
          </dd>
        </div>
        <div className="flex gap-1.5 text-sm">
          <dt className="text-ink-muted">{t('wholesaler.split.compare.allocated')}</dt>
          <dd className="font-mono text-ink tabular-nums">{nf.format(allocated)}</dd>
        </div>
        <div className="flex gap-1.5 text-sm">
          <dt className="text-ink-muted">{t('wholesaler.split.compare.unallocated')}</dt>
          <dd className="font-mono text-ink tabular-nums">{nf.format(unallocated)}</dd>
        </div>
      </dl>
      <p className="text-sm text-ink-muted">{body}</p>
    </div>
  );
}

const Circle = () => (
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
    <circle cx="6" cy="6" r="4.25" fill="var(--surface)" stroke="var(--ink-muted)" strokeWidth="1.5" />
  </svg>
);
const Square = () => (
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
    <rect x="1.5" y="1.5" width="9" height="9" fill="var(--ink-muted)" />
  </svg>
);
const Diamond = () => (
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
    <path d="M6 0.5 L11.5 6 L6 11.5 L0.5 6 Z" fill="var(--brand)" />
  </svg>
);

interface PlotRow {
  code: string;
  name: string;
  before: number | null;
  refAfter: number | null;
  fairAfter: number | null;
}

/**
 * A range plot on one day scale: each governorate's cover before (open circle), after the reference
 * model (square) and after the proposed split (diamond). A picture of the table below, hidden from
 * screen readers.
 */
function RangePlot({ rows, maxDays }: { rows: PlotRow[]; maxDays: number }) {
  const pos = (d: number) => `${Math.min(100, Math.max(0, (d / maxDays) * 100))}%`;
  const ticks = [0, Math.round(maxDays / 3), Math.round((2 * maxDays) / 3), maxDays];
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex flex-col gap-1">
        <span className="font-semibold text-ink">{t('wholesaler.split.compare.plotTitle')}</span>
        <span className="text-sm text-ink-muted">{t('wholesaler.split.compare.plotNote', { days: maxDays })}</span>
        <span aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink">
          <span className="inline-flex items-center gap-1.5">
            <Circle />
            {t('wholesaler.split.compare.legendBefore')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Square />
            {t('wholesaler.split.compare.legendReference')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Diamond />
            {t('wholesaler.split.compare.legendFair')}
          </span>
        </span>
      </figcaption>
      <div aria-hidden="true" className="flex flex-col gap-1">
        {rows.map((r) => {
          const values = [r.before, r.refAfter, r.fairAfter].filter((v): v is number => v !== null);
          if (values.length === 0) return null;
          const lo = Math.min(...values);
          const hi = Math.max(...values);
          return (
            <div key={r.code} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 text-sm sm:grid-cols-[6.5rem_minmax(0,1fr)]">
              <span className="truncate text-ink">{r.name}</span>
              <span className="relative block h-6">
                <span className="absolute inset-x-0 top-1/2 h-px bg-line" />
                <span
                  className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-ink-muted"
                  style={{ left: pos(lo), width: `calc(${pos(hi)} - ${pos(lo)})` }}
                />
                {r.before !== null ? <Marker at={pos(r.before)}><Circle /></Marker> : null}
                {r.refAfter !== null ? <Marker at={pos(r.refAfter)}><Square /></Marker> : null}
                {r.fairAfter !== null ? <Marker at={pos(r.fairAfter)}><Diamond /></Marker> : null}
              </span>
            </div>
          );
        })}
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 pe-2 text-xs text-ink-muted sm:grid-cols-[6.5rem_minmax(0,1fr)]">
          <span />
          <span className="relative block h-4">
            {ticks.map((d, i) => (
              <span
                key={d}
                className={`absolute font-mono whitespace-nowrap tabular-nums ${i === 0 ? '' : i === ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
                style={{ left: pos(d) }}
              >
                {t('wholesaler.split.compare.axisDays', { days: d })}
              </span>
            ))}
          </span>
        </div>
      </div>
    </figure>
  );
}

function Marker({ at, children }: { at: string; children: ReactNode }) {
  return (
    <span className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2" style={{ left: at }}>
      {children}
    </span>
  );
}
