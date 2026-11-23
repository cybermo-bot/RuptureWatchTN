'use client';

import { useMemo, useState } from 'react';
import { LevelShape } from '@/components/LevelBadge';
import { OriginBadge } from '@/components/OriginBadge';
import { t } from '@/lib/i18n';
import {
  EXPLORER_DAYS,
  EXPLORER_DEFAULTS,
  EXPLORER_SETTINGS,
  EXPLORER_START,
  explorerScenarios,
  replay,
  type ExplorerSetting,
  type ExplorerValues,
  type Replay,
} from '@/lib/scenario/explore';
import type { Level } from '@/lib/signal';

// The threshold explorer of the methods page: four sliders; each change replays the two
// simulated scenarios through evaluate(), in the browser, next to the default values.
// Every sentence under the timelines is computed from the replay. Nothing is written.

const SETTINGS = Object.keys(EXPLORER_SETTINGS) as ExplorerSetting[];
const ORDER: Level[] = ['watch', 'likely', 'confirmed', 'cleared'];
/** Which level each setting's line follows. */
const LINE_LEVEL: Record<ExplorerSetting, Level> = {
  confirmMinPharmacies: 'confirmed',
  confirmMinGovernorates: 'confirmed',
  likelyMinPharmacies: 'likely',
  minUndeliveredHours: 'confirmed',
};

type Steps = ReturnType<typeof explorerScenarios>['real'];
const run = (steps: Steps, v: ExplorerValues) => replay(steps, EXPLORER_START, EXPLORER_DAYS, v);

const when = (r: Replay, level: Level) =>
  r.firstDay[level] === undefined ? t('core.method.explorer.never') : t('core.method.explorer.onDay', { day: r.firstDay[level]! });

function milestones(r: Replay): string {
  const parts = ORDER.filter((l) => r.firstDay[l] !== undefined).map((l) =>
    t('core.method.explorer.reached', { level: t(`core.levels.${l}`), day: r.firstDay[l]! }),
  );
  return parts.length ? parts.join(t('core.method.explorer.separator')) : t('core.method.explorer.nothing');
}

const CELL: Record<Level, string> = {
  none: 'bg-surface',
  watch: 'bg-level-watch/15',
  likely: 'bg-level-likely/15',
  confirmed: 'bg-level-confirmed/15',
  cleared: 'bg-level-cleared/15',
};

function Strip({ label, r }: { label: string; r: Replay }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center sm:gap-4">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="flex flex-col gap-1">
        {/* The strip is a picture of the sentence under it, which carries the meaning. */}
        <div aria-hidden="true" className="grid border border-line" style={{ gridTemplateColumns: `repeat(${r.days.length}, minmax(0, 1fr))` }}>
          {r.days.map((level, d) => (
            <span key={d} className={`flex h-7 items-center justify-center border-e border-line last:border-e-0 ${CELL[level]}`}>
              {level !== 'none' && (d === 0 || r.days[d - 1] !== level) ? <LevelShape level={level} size={10} /> : null}
            </span>
          ))}
        </div>
        <p className="text-sm text-ink">{milestones(r)}</p>
      </div>
    </div>
  );
}

export function ThresholdExplorer({ noticeSource }: { noticeSource: string }) {
  const [values, setValues] = useState<ExplorerValues>(EXPLORER_DEFAULTS);
  const scenarios = useMemo(() => explorerScenarios(noticeSource, '/methode#garde-fous'), [noticeSource]);

  const base = useMemo(() => ({ real: run(scenarios.real, EXPLORER_DEFAULTS), falseAlarm: run(scenarios.falseAlarm, EXPLORER_DEFAULTS) }), [scenarios]);
  const yours = useMemo(() => ({ real: run(scenarios.real, values), falseAlarm: run(scenarios.falseAlarm, values) }), [scenarios, values]);
  // One line per setting: the default value, then the chosen one, that setting alone changed.
  const lines = useMemo(
    () =>
      SETTINGS.map((k) => {
        const level = LINE_LEVEL[k];
        const text = [t(`core.method.explorer.lines.${k}`, { value: EXPLORER_DEFAULTS[k], when: when(base.real, level) })];
        if (values[k] !== EXPLORER_DEFAULTS[k]) {
          const alone = run(scenarios.real, { ...EXPLORER_DEFAULTS, [k]: values[k] });
          text.push(t(`core.method.explorer.lines.${k}`, { value: values[k], when: when(alone, level) }));
        }
        return { k, text: text.join(' ') };
      }),
    [base, scenarios, values],
  );
  const changed = SETTINGS.some((k) => values[k] !== EXPLORER_DEFAULTS[k]);

  return (
    <section aria-labelledby="explorer" className="flex flex-col gap-6 border-t border-line pt-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h3 id="explorer" className="font-semibold text-ink">
            {t('core.method.explorer.title')}
          </h3>
          <OriginBadge origin="simulated" />
          <span className="text-sm text-ink-muted">{t('core.method.explorer.simulated')}</span>
        </div>
        <p className="max-w-prose text-ink">{t('core.method.explorer.intro')}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {SETTINGS.map((k) => {
          const r = EXPLORER_SETTINGS[k];
          const id = `explorer-${k}`;
          return (
            <div key={k} className="flex flex-col gap-1">
              <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm font-medium text-ink">
                <span>{t(`core.method.explorer.settings.${k}`)}</span>
                <output htmlFor={id} className="font-mono text-base">
                  {values[k]}
                </output>
              </label>
              <input
                id={id}
                type="range"
                min={r.min}
                max={r.max}
                step={r.step}
                value={values[k]}
                onChange={(e) => setValues((v) => ({ ...v, [k]: Number(e.target.value) }))}
                className="h-12 w-full accent-brand"
              />
              <span className="text-xs text-ink-muted">{t('core.method.explorer.defaultValue', { value: EXPLORER_DEFAULTS[k] })}</span>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setValues(EXPLORER_DEFAULTS)}
        disabled={!changed}
        className="flex min-h-12 w-fit items-center rounded-md border border-line px-4 font-medium text-ink hover:bg-surface-subtle disabled:text-ink-muted"
      >
        {t('core.method.explorer.reset')}
      </button>

      {(['real', 'falseAlarm'] as const).map((s) => (
        <div key={s} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h4 className="font-medium text-ink">{t(`core.method.explorer.${s}.title`)}</h4>
            <p className="max-w-prose text-sm text-ink-muted">{t(`core.method.explorer.${s}.body`)}</p>
            <p className="text-xs text-ink-muted">{t('core.method.explorer.dayAxis', { first: 0, last: EXPLORER_DAYS })}</p>
          </div>
          <Strip label={t('core.method.explorer.rowDefault')} r={base[s]} />
          <Strip label={t('core.method.explorer.rowYours')} r={yours[s]} />
        </div>
      ))}

      <div className="flex flex-col gap-2" aria-live="polite">
        <h4 className="font-medium text-ink">{t('core.method.explorer.linesTitle')}</h4>
        <ul className="flex max-w-prose list-disc flex-col gap-1 ps-5 text-ink marker:text-ink-muted">
          {lines.map((l) => (
            <li key={l.k}>{l.text}</li>
          ))}
        </ul>
        <p className="max-w-prose text-ink">
          {t('core.method.explorer.falseLine', { defaultWhen: when(base.falseAlarm, 'confirmed'), yoursWhen: when(yours.falseAlarm, 'confirmed') })}
        </p>
      </div>
    </section>
  );
}
