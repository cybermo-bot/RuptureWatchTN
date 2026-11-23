import { LevelShape } from '@/components/LevelBadge';
import { t } from '@/lib/i18n';
import type { Level } from '@/lib/signal';

// The scenario's state timeline, drawn on the plum stage: one segment per step coloured by its
// level up to the selected step (the steps still to come stay blank, so the outcome is not given
// away), the changes so far annotated with their day and shape, and the citron dot on the selected
// step. Used by /scenario and by the home page's hero, which shows one frozen moment. The same
// sequence is given as a text list for screen readers.

export interface TimelineStep {
  index: number;
  day: number;
  level: Level;
  changed: boolean;
}

const FILL: Record<Level, string> = {
  none: 'var(--level-none-on-stage)',
  watch: 'var(--level-watch-on-stage)',
  likely: 'var(--level-likely-on-stage)',
  confirmed: 'var(--level-confirmed-on-stage)',
  cleared: 'var(--level-cleared-on-stage)',
};

export function StateTimeline({
  steps,
  selected,
  label,
  className = '',
}: {
  steps: TimelineStep[];
  selected: number;
  /** Accessible name of the list. */
  label: string;
  className?: string;
}) {
  const n = steps.length;
  const changes = steps.filter((s) => s.changed && s.index <= selected);
  const pos = (i: number) => `${((i + 0.5) / n) * 100}%`;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div aria-hidden="true" className="relative pt-5">
        {/* The selected step: a citron dot above the band. */}
        <span
          className="absolute top-0 size-3 -translate-x-1/2 rounded-full bg-citron ring-2 ring-stage motion-safe:transition-[left] motion-safe:duration-200"
          style={{ left: pos(selected) }}
        />
        <div className="flex h-3 gap-px overflow-hidden rounded-sm">
          {steps.map((s) => (
            <span key={s.index} className="h-full flex-1" style={{ background: s.index > selected ? 'var(--stage-line)' : FILL[s.level] }} />
          ))}
        </div>
        {/* Annotations at the changes, under the band. */}
        <div className="relative mt-2 h-10 text-xs">
          {changes.map((s, k) => (
            <span
              key={s.index}
              className={`absolute flex flex-col items-center gap-0.5 whitespace-nowrap text-on-stage-muted ${k === 0 ? '' : '-translate-x-1/2'}`}
              style={{ left: k === 0 ? `calc(${pos(s.index)} - 0.5rem)` : pos(s.index), top: k % 2 === 0 ? 0 : '1.125rem' }}
            >
              <span className="inline-flex items-center gap-1">
                <LevelShape level={s.level} tone="stage" size={11} />
                <span className="font-mono">{t('core.scenario.dayShort', { day: s.day })}</span>
              </span>
            </span>
          ))}
        </div>
      </div>
      <ol aria-label={label} className="sr-only">
        {changes.map((s) => (
          <li key={s.index}>
            {t(s.index === selected ? 'core.scenario.timelineItemCurrent' : 'core.scenario.timelineItem', {
              day: s.day,
              level: t(`core.levels.${s.level}`),
            })}
          </li>
        ))}
      </ol>
    </div>
  );
}
