import { scaleTime } from 'd3-scale';
import { LevelShape } from '@/components/LevelBadge';
import { levelSegments, type LevelChange } from '@/lib/charts/series';
import { formatDate, formatDayMonth } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { Level } from '@/lib/signal';

// The level timeline of one medicine: a band over the last 30 days, coloured by level, with
// the level's shape and word at each change (never colour alone) and the same as a text list.
// `text` replaces the French console words, e.g. on the public page (French or Arabic, and only
// its three public levels). Time runs left to right in both languages; the band is LTR.

export interface LevelBandText {
  level: (level: Level) => string;
  today: string;
  axisStart: (from: Date) => string;
  beforeWindow: (from: Date) => string;
  fromDate: (date: Date) => string;
  noLevel: string;
}

const CONSOLE_TEXT = (days: number): LevelBandText => ({
  level: (level) => t(`core.levels.${level}`),
  today: t('core.charts.today'),
  axisStart: (from) => formatDayMonth(from),
  beforeWindow: (from) => t('core.charts.beforeWindow', { date: formatDate(from) }),
  fromDate: (date) => t('core.charts.fromDate', { date: formatDate(date) }),
  noLevel: t('core.charts.noLevel', { days }),
});

const FILL: Record<Level, string> = {
  none: 'var(--surface-subtle)',
  watch: 'var(--level-watch)',
  likely: 'var(--level-likely)',
  confirmed: 'var(--level-confirmed)',
  cleared: 'var(--level-cleared)',
};

export function LevelBand({
  events,
  days = 30,
  now = new Date(),
  title,
  text,
}: {
  events: LevelChange[];
  days?: number;
  now?: Date;
  title: string;
  text?: LevelBandText;
}) {
  const words = text ?? CONSOLE_TEXT(days);
  const from = new Date(now.getTime() - days * 86_400_000);
  const segments = levelSegments(events, from, now);
  const width = 600;
  const x = scaleTime().domain([from, now]).range([0, width]);
  const changes = segments.filter((s, i) => i > 0 || s.level !== 'none');

  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="text-sm font-medium text-ink">{title}</figcaption>
      <div className="relative" dir="ltr">
        <svg viewBox={`0 0 ${width} 20`} preserveAspectRatio="none" aria-hidden="true" focusable="false" className="block h-5 w-full overflow-hidden rounded-sm">
          {segments.map((s) => (
            <rect
              key={s.start.toISOString()}
              x={x(s.start)}
              width={Math.max(1, x(s.end) - x(s.start))}
              y={0}
              height={20}
              fill={FILL[s.level]}
              stroke="var(--surface)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-ink-muted tabular-nums" aria-hidden="true" dir="ltr">
        <span>{words.axisStart(from)}</span>
        <span>{words.today}</span>
      </div>
      {changes.length > 0 ? (
        <ol className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {changes.map((s) => (
            <li key={s.start.toISOString()} className="inline-flex items-center gap-1.5">
              <LevelShape level={s.level} />
              <span className="text-ink">{words.level(s.level)}</span>
              <span className="text-ink-muted tabular-nums">
                {s.start.getTime() === from.getTime() ? words.beforeWindow(from) : words.fromDate(s.start)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-muted">{words.noLevel}</p>
      )}
    </figure>
  );
}
