'use client';

import { useEffect, useMemo, useState } from 'react';
import { GOVERNORATE_SHAPES, GovernorateMap, type GovernorateValue } from '@/components/GovernorateMap';
import { explanationText } from '@/components/LevelExplanation';
import { LevelBadge } from '@/components/LevelBadge';
import { OriginBadge } from '@/components/OriginBadge';
import { t, type MessageKey } from '@/lib/i18n';
import { scenarioFrames, type ScenarioFrame } from '@/lib/scenario/frames';

// Plays the scenario in the browser: buildScenario() and evaluate() from lib/signal, in memory.
// It never calls the server; "Recommencer" is the whole reset.

const STEP_MS = 3_000;
const GOV_NAME = new Map(GOVERNORATE_SHAPES.map((g) => [g.code, g.name]));

function stepText(f: ScenarioFrame): string {
  if (!f.labelKey) return t('core.scenario.startText');
  const governorate = f.governorateCode ? (GOV_NAME.get(f.governorateCode) ?? f.governorateCode) : '';
  return t(`core.${f.labelKey}` as MessageKey, { governorate });
}

function mapValues(f: ScenarioFrame): Partial<Record<string, GovernorateValue>> {
  const values: Partial<Record<string, GovernorateValue>> = {};
  for (const c of f.counts) {
    const mix = c.display === '<3' ? 28 : Number(c.display) >= 5 ? 92 : 58;
    const colour = f.level === 'none' ? 'var(--ink-muted)' : `var(--level-${f.level})`;
    values[c.governorateCode] = { text: c.display, fill: `color-mix(in srgb, ${colour} ${mix}%, white)` };
  }
  return values;
}

const BUTTON =
  'inline-flex min-h-12 items-center justify-center rounded-md px-5 font-medium disabled:cursor-not-allowed disabled:opacity-50';

export function ScenarioPlayer() {
  const frames = useMemo(() => scenarioFrames(t('core.scenario.noticeSource'), '/methode#garde-fous'), []);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = frames.length - 1;
  const frame = frames[index];
  const done = index === last;

  // Playing stops by itself at the last step.
  const running = playing && !done;

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, last)), index === 0 ? 600 : STEP_MS);
    return () => clearTimeout(timer);
  }, [running, index, last]);

  const changes = frames.slice(1, index + 1).filter((f) => f.changed);

  return (
    <div className="flex flex-col gap-8" data-step={index} data-level={frame.level} data-done={done ? 'true' : 'false'}>
      <div role="group" aria-label={t('core.scenario.controls')} className="flex flex-wrap items-center gap-3">
        {running ? (
          <button type="button" onClick={() => setPlaying(false)} className={`${BUTTON} border border-brand text-brand hover:bg-surface-subtle`}>
            {t('core.scenario.pause')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            disabled={done}
            data-action="play"
            className={`${BUTTON} bg-brand text-white hover:bg-brand-strong`}
          >
            {index === 0 ? t('core.scenario.play') : t('core.scenario.resume')}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setIndex((i) => Math.min(i + 1, last));
          }}
          disabled={done}
          className={`${BUTTON} border border-line text-ink hover:bg-surface-subtle`}
        >
          {t('core.scenario.step')}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setIndex(0);
          }}
          disabled={index === 0}
          className={`${BUTTON} border border-line text-ink hover:bg-surface-subtle`}
        >
          {t('core.scenario.restart')}
        </button>
        <span className="text-sm text-ink-muted tabular-nums">
          {t('core.scenario.progress', { n: index, total: last })}
        </span>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
        <section aria-labelledby="etape" aria-live="polite" className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 border-b border-line pb-5">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
              <span className="font-mono">{t('core.scenario.day', { day: frame.day })}</span>
              <span>{t('core.scenario.molecule')}</span>
              <OriginBadge origin="simulated" />
            </p>
            <h2 id="etape" className="text-lg font-semibold text-ink">
              {t('core.scenario.whatHappens')}
            </h2>
            <p className="text-ink">{stepText(frame)}</p>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-ink-muted">{t('core.scenario.levelTitle')}</h3>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <LevelBadge level={frame.level} className="text-base" />
              {frame.changed ? (
                <span className="text-sm text-ink-muted">{t('core.scenario.changedFrom', { level: t(`core.levels.${frame.previous}`) })}</span>
              ) : index > 0 ? (
                <span className="text-sm text-ink-muted">{t('core.scenario.unchanged')}</span>
              ) : null}
            </p>
            <p className="max-w-prose text-ink">{explanationText(frame.rule, frame.evidence)}</p>
            <p className="font-mono text-xs text-ink-muted">{frame.rule}</p>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-ink-muted">{t('core.scenario.alertsTitle')}</h3>
            {frame.alerted.length === 0 ? (
              <p className="text-ink-muted">{t('core.scenario.alertsNone')}</p>
            ) : (
              <>
                <ul className="flex list-disc flex-col gap-1 ps-5 text-ink marker:text-ink-muted">
                  {frame.alerted.map((r) => (
                    <li key={r}>{t(`core.scenario.recipients.${r}`)}</li>
                  ))}
                </ul>
                {frame.standDown ? <p className="text-ink">{t('core.scenario.standDown')}</p> : null}
                <p className="text-sm text-ink-muted">{t('core.guidance.disclaimer')}</p>
              </>
            )}
          </div>

          {done ? <p className="border-s-2 border-level-cleared ps-3 font-medium text-ink">{t('core.scenario.end')}</p> : null}
        </section>

        <div className="flex flex-col gap-8">
          <section aria-labelledby="scenario-carte" className="flex flex-col gap-3">
            <h2 id="scenario-carte" className="text-sm font-medium text-ink-muted">
              {t('core.coordination.mapTitle')}
            </h2>
            <GovernorateMap values={mapValues(frame)} title={t('core.coordination.mapTitle')} className="mx-auto w-full max-w-[16rem]" />
            {frame.counts.length > 0 ? (
              <ul className="text-sm text-ink">
                {frame.counts.map((c) => (
                  <li key={c.governorateCode} className="flex justify-between gap-4 border-b border-line py-1.5">
                    <span>{GOV_NAME.get(c.governorateCode)}</span>
                    <span className="font-mono">{c.display}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section aria-labelledby="scenario-historique" className="flex flex-col gap-3">
            <h2 id="scenario-historique" className="text-sm font-medium text-ink-muted">
              {t('core.scenario.historyTitle')}
            </h2>
            {changes.length === 0 ? (
              <p className="text-sm text-ink-muted">{t('core.scenario.historyEmpty')}</p>
            ) : (
              <ol className="hairline-list border-y border-line">
                {changes.map((f) => (
                  <li key={f.index} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                    <span className="font-mono text-ink-muted">{t('core.scenario.day', { day: f.day })}</span>
                    <LevelBadge level={f.level} />
                    <span className="font-mono text-xs text-ink-muted">{f.rule}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      <p className="text-sm text-ink-muted">{t('core.scenario.memoryNote')}</p>
    </div>
  );
}
