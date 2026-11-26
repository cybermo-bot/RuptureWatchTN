import { LevelShape } from '@/components/LevelBadge';
import { levelRank } from '@/lib/landing/tour';
import { t } from '@/lib/i18n';
import type { ScenarioFrame } from '@/lib/scenario/frames';
import type { Level } from '@/lib/signal';

// The scenario's level, day by day (pilot-4 step 6): Olfa's step curve, with the level tokens
// instead of hard-coded colours and no gradient, glow or drawing animation. One chart, drawn in
// place; it shows the scenario up to the step on screen (the rest of the grid stays empty, like
// the rail). Coordinates are percentages, so the labels keep their size on a 360 px phone. The
// level of each row is given by its shape and word; the change list below is the text version.

const STROKE: Record<Level, string> = {
  none: 'var(--ink-muted)',
  watch: 'var(--level-watch)',
  likely: 'var(--level-likely)',
  confirmed: 'var(--level-confirmed)',
  cleared: 'var(--level-cleared)',
};
// Rows from the top: confirmée, probable, sous surveillance, then « aucun signal » and « levée ».
const ROWS: Level[][] = [['confirmed'], ['likely'], ['watch'], ['none', 'cleared']];

const x = (day: number, days: number) => `${3 + (91 * day) / days}%`;
const y = (rank: number) => `${12.5 + 25 * (3 - rank)}%`;

export function LevelStepChart({ frames, index }: { frames: ScenarioFrame[]; index: number }) {
  const days = Math.max(1, frames[frames.length - 1].day);
  const upTo = frames[index].day;
  const changes = frames.filter((f) => f.changed && f.index <= index);
  // Segments: each level held from its change to the next one (or to the step on screen).
  const held: { from: number; to: number; level: Level }[] = [];
  let level: Level = 'none';
  let from = 0;
  for (const c of changes) {
    if (c.day > from) held.push({ from, to: c.day, level });
    level = c.level;
    from = c.day;
  }
  if (index > 0 && upTo > from) held.push({ from, to: upTo, level });
  // Day ticks: the start, the step on screen when it has room, the end (all days are in the list).
  const ticks = [...new Set([0, ...(upTo / days > 0.12 && upTo / days < 0.88 ? [upTo] : []), days])];
  const label = t('core.scenario.chart.label', {
    steps: changes.length
      ? changes.map((c) => t('core.scenario.chart.step', { level: t(`core.levels.${c.level}`).toLowerCase(), day: c.day })).join(', ')
      : t('core.scenario.chart.none'),
  });

  return (
    <figure className="flex max-w-3xl flex-col gap-2">
      <figcaption className="text-sm font-medium text-ink">{t('core.scenario.chart.title')}</figcaption>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
        <ul aria-hidden="true" className="grid h-40 grid-rows-4 text-xs text-ink-muted">
          {ROWS.map((row) => (
            <li key={row.join()} className="flex items-center gap-1.5">
              {row.map((l) => (
                <LevelShape key={l} level={l} size={12} />
              ))}
              <span>{row.map((l) => t(`core.levels.${l}`)).join(' · ')}</span>
            </li>
          ))}
        </ul>
        <svg role="img" aria-label={label} className="h-40 w-full overflow-visible">
          {[0, 1, 2, 3].map((r) => (
            <line key={r} x1="0" x2="100%" y1={y(r)} y2={y(r)} stroke="var(--line)" strokeDasharray={r ? '2 5' : undefined} />
          ))}
          {/* The step at each change, from the level before to the new one. */}
          {changes.map((c) => (
            <line key={`step-${c.index}`} x1={x(c.day, days)} x2={x(c.day, days)} y1={y(levelRank(c.previous))} y2={y(levelRank(c.level))} stroke="var(--ink-muted)" strokeWidth="1.5" />
          ))}
          {held.map((h) => (
            <line key={h.from} x1={x(h.from, days)} x2={x(h.to, days)} y1={y(levelRank(h.level))} y2={y(levelRank(h.level))} stroke={STROKE[h.level]} strokeWidth="3" strokeLinecap="round" />
          ))}
          {changes.map((c) => (
            <circle key={c.index} cx={x(c.day, days)} cy={y(levelRank(c.level))} r="5" fill="var(--surface)" stroke={STROKE[c.level]} strokeWidth="2.5" />
          ))}
        </svg>
        <span />
        <div aria-hidden="true" className="relative mt-1 h-5 font-mono text-xs text-ink-muted">
          {ticks.map((d) => (
            <span key={d} className={`absolute -translate-x-1/2 ${d > upTo && index > 0 ? 'opacity-60' : ''}`} style={{ left: x(d, days) }}>
              {t('core.scenario.dayShort', { day: d })}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
