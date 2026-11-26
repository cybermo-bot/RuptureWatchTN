import { LevelShape } from '@/components/LevelBadge';
import type { TourStop } from '@/lib/landing/tour';
import { t } from '@/lib/i18n';

// The scenario's stepper rail (pilot-4 step 6), on the petrol stage: one node per key stop from
// tourStops() (the start, every level change, the step where one governorate is not enough, the
// stand-down), ported from Olfa's rail and re-skinned: petrol, --scenario-accent for the path
// walked and the current stop, the level's shape in each node, no glow. Stops still to come show
// an empty ring and no level, so the outcome is not given away. Each node jumps to its step.

export function StopRail({
  stops,
  index,
  onSelect,
}: {
  stops: TourStop[];
  /** The frame on screen. */
  index: number;
  onSelect: (frameIndex: number) => void;
}) {
  // The current stop: the last one reached.
  let current = 0;
  stops.forEach((s, i) => {
    if (s.frameIndex <= index) current = i;
  });
  return (
    <ol aria-label={t('core.scenario.rail.label')} className="flex">
      {stops.map((s, i) => {
        const reached = s.frameIndex <= index;
        const walked = i < stops.length - 1 && stops[i + 1].frameIndex <= index;
        const short = s.day === null ? t('core.scenario.rail.start') : t('core.scenario.dayShort', { day: s.day });
        const name =
          s.day === null
            ? t('core.scenario.rail.startLabel')
            : reached
              ? t(i === current ? 'core.scenario.timelineItemCurrent' : 'core.scenario.timelineItem', { day: s.day, level: t(`core.levels.${s.level}`) })
              : t('core.scenario.rail.ahead', { day: s.day });
        return (
          <li key={s.frameIndex} className="relative flex min-w-0 flex-1 justify-center">
            {i < stops.length - 1 ? (
              <span
                aria-hidden="true"
                className={`absolute start-1/2 top-[1.375rem] h-0.5 w-full ${walked ? 'bg-scenario-accent' : 'bg-stage-line'}`}
              />
            ) : null}
            <button
              type="button"
              onClick={() => onSelect(s.frameIndex)}
              aria-current={i === current ? 'step' : undefined}
              className="relative flex min-h-12 w-full cursor-pointer flex-col items-center gap-1 rounded-sm pt-1 pb-0.5 text-on-stage-muted hover:text-on-stage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scenario-accent aria-[current=step]:text-on-stage"
            >
              <span
                aria-hidden="true"
                className={`flex size-9 items-center justify-center rounded-full bg-stage ring-2 ${
                  i === current ? 'ring-scenario-accent' : reached ? 'ring-stage-line' : 'ring-stage-line/70'
                }`}
              >
                {reached ? <LevelShape level={s.level} tone="stage" size={16} /> : <span className="size-2.5 rounded-full border-2 border-stage-line" />}
              </span>
              <span aria-hidden="true" className="font-mono text-xs">
                {short}
              </span>
              <span className="sr-only">{name}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
