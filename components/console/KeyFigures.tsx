import type { ReactNode } from 'react';
import { Sparkline } from '@/components/charts/Sparkline';
import { t } from '@/lib/i18n';

// The compact strip of key figures at the top of a dashboard: a label, the value, a 14-day
// sparkline. Every value is computed by the caller; nothing here invents a number.

export interface KeyFigure {
  key: string;
  label: string;
  /** Already formatted: a number, or "<3" when suppressed. */
  value: string;
  /** Optional shape or badge before the value (a level shape). */
  marker?: ReactNode;
  /** One value per day, oldest first, today last. */
  series?: number[];
  colour?: string;
  /** Short context under the value ("depuis hier : +1"). */
  note?: string;
}

export function KeyFigures({
  figures,
  label,
  days = 14,
  columns = 4,
}: {
  figures: KeyFigure[];
  label: string;
  days?: number;
  /** Columns from the small breakpoint: 4 by default, 3 for a strip of three. */
  columns?: number;
}) {
  return (
    <section aria-label={label} className="panel">
      <dl className={`grid grid-cols-2 divide-line ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'} [&>div]:border-line max-sm:[&>div:nth-child(n+3)]:border-t sm:[&>div+div]:border-s max-sm:[&>div:nth-child(even)]:border-s`}>
        {figures.map((f) => (
          <div key={f.key} className="flex min-w-0 flex-col gap-2 px-4 py-4 sm:px-5">
            <dt className="text-sm leading-snug text-ink-muted">{f.label}</dt>
            <dd className="flex min-w-0 items-end justify-between gap-2.5">
              <span className="flex items-center gap-2 text-2xl leading-none font-semibold tabular-nums text-ink">
                {f.marker}
                {f.value}
              </span>
              {f.series ? <Sparkline values={f.series} colour={f.colour} /> : null}
            </dd>
            {f.series ? (
              <dd className="sr-only">{t('core.figures.seriesText', { days, values: f.series.join(', ') })}</dd>
            ) : null}
            {f.note ? <dd className="text-xs text-ink-muted">{f.note}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
