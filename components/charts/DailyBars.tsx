import { scaleBand, scaleLinear } from 'd3-scale';
import { formatDayMonth } from '@/lib/format';
import { t } from '@/lib/i18n';

// Bars per day (reports per day, patient demand per day). A value under 3 arrives as "<3" and
// is drawn as a short hatched bar, never as its number. The same values are given as a table
// for screen readers.

export interface DayValue {
  day: Date;
  /** A count, or "<3" when suppressed. */
  value: number | '<3';
}

export function DailyBars({
  data,
  title,
  colour = 'var(--ink-muted)',
  id,
}: {
  data: DayValue[];
  title: string;
  colour?: string;
  id: string;
}) {
  const width = 600;
  const height = 132;
  const pad = { top: 8, bottom: 5 };
  const numeric = data.map((d) => (d.value === '<3' ? 2 : d.value));
  const max = Math.max(3, ...numeric);
  const x = scaleBand<number>()
    .domain(data.map((_, i) => i))
    .range([0, width])
    .paddingInner(0.36)
    .paddingOuter(0.15);
  const y = scaleLinear()
    .domain([0, max])
    .range([height - pad.bottom, pad.top]);
  const empty = data.every((d) => d.value === 0);
  const maxShown = Math.max(0, ...data.map((d) => (d.value === '<3' ? 0 : d.value)));
  const lastNonZero = numeric.findLastIndex((value) => value > 0);
  const dates = data.length > 8 ? [0, Math.floor((data.length - 1) / 2), data.length - 1] : [0, data.length - 1];
  const patternId = `${id}-hatch`;

  return (
    <figure className="m-0 flex flex-col gap-2" aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`} className="flex items-baseline justify-between gap-3 text-sm font-medium text-ink">
        <span>{title}</span>
        {!empty ? (
          <span className="text-xs font-normal text-ink-muted tabular-nums" aria-hidden="true">
            {t('core.charts.max', { value: maxShown || '<3' })}
          </span>
        ) : null}
      </figcaption>
      {empty ? (
        <p className="text-sm text-ink-muted">{t('core.charts.noData', { days: data.length })}</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false" className="mt-2 block h-28 w-full sm:h-32">
            <defs>
              <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="var(--surface)" />
                <line x1="0" y1="0" x2="0" y2="6" stroke={colour} strokeWidth="3" />
              </pattern>
            </defs>
            {[0, max / 2, max].map((tick) => (
              <line key={tick} x1={0} x2={width} y1={y(tick)} y2={y(tick)} stroke="var(--line)" vectorEffect="non-scaling-stroke" />
            ))}
            {data.map((d, i) => {
              const v = numeric[i];
              if (v === 0) return null;
              const top = y(v);
              return (
                <rect
                  key={d.day.toISOString()}
                  x={x(i)}
                  width={x.bandwidth()}
                  y={top}
                  height={height - pad.bottom - top}
                  rx={2}
                  fill={d.value === '<3' ? `url(#${patternId})` : i === lastNonZero ? colour : `color-mix(in srgb, ${colour} 66%, var(--surface))`}
                  stroke={d.value === '<3' ? colour : 'none'}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
          <div className="flex justify-between text-xs text-ink-muted tabular-nums" aria-hidden="true">
            {[...new Set(dates)].map((i) => <span key={i}>{formatDayMonth(data[i].day)}</span>)}
          </div>
          <table className="sr-only">
            <thead>
              <tr>
                <th scope="col">{t('core.charts.tableDay')}</th>
                <th scope="col">{t('core.charts.tableValue')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.day.toISOString()}>
                  <td>{formatDayMonth(d.day)}</td>
                  <td>{d.value === '<3' ? t('core.charts.suppressed') : d.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
}
