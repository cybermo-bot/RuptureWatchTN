'use client';

import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GOVERNORATE_SHAPES, GovernorateMap, type GovernorateValue } from '@/components/GovernorateMap';
import { explanationText, RuleDetails } from '@/components/LevelExplanation';
import { LevelBadge } from '@/components/LevelBadge';
import { MissingLine } from '@/components/MissingLine';
import { OriginBadge } from '@/components/OriginBadge';
import { StateTimeline } from '@/components/scenario/StateTimeline';
import { t, type MessageKey } from '@/lib/i18n';
import { PLATFORM_ACTORS } from '@/lib/playbooks/actors';
import { scenarioFrames, type ScenarioFrame } from '@/lib/scenario/frames';

// Plays the scenario in the browser: buildScenario() and evaluate() from lib/signal, in memory.
// It never calls the server; "Recommencer" is the whole reset.
// Two editorial regions (session 6): on the plum stage, the state timeline and the event that just
// happened; beside it, a pane answering "Pourquoi ce niveau ?" and "Qui peut agir ?". Manual by
// default: the visitor steps through, or presses play. Arrow keys step, Space plays or pauses.

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
    const mix = c.display === '<3' ? 45 : Number(c.display) >= 5 ? 100 : 75;
    const colour = f.level === 'none' ? 'var(--level-none-on-stage)' : `var(--level-${f.level}-on-stage)`;
    values[c.governorateCode] = { text: c.display, fill: `color-mix(in srgb, ${colour} ${mix}%, var(--stage-raised))` };
  }
  return values;
}

const STAGE_BUTTON =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-3 font-medium disabled:cursor-not-allowed disabled:opacity-45 sm:px-4';

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

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

  const next = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.min(i + 1, last));
  }, [last]);
  const previous = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.max(i - 1, 0));
  }, []);
  const toggle = useCallback(() => {
    if (running) setPlaying(false);
    else if (!done) setPlaying(true);
  }, [running, done]);

  // Keyboard: left and right arrows step, Space plays or pauses (a focused button keeps its own Space).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        previous();
      } else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLAnchorElement)) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, previous, toggle]);

  const changes = frames.slice(1, index + 1).filter((f) => f.changed);
  const actors = frame.level === 'none' ? [] : PLATFORM_ACTORS[frame.level];

  return (
    <div className="flex flex-col gap-6" data-step={index} data-level={frame.level} data-done={done ? 'true' : 'false'}>
      <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
        {/* Region 1, on the plum stage: controls, the timeline, what just happened. */}
        <section aria-labelledby="etape" className="stage flex flex-col gap-6 rounded-xl bg-stage p-5 text-on-stage sm:p-7 lg:col-span-8">
          <div role="group" aria-label={t('core.scenario.controls')} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              {running ? (
                <button type="button" onClick={() => setPlaying(false)} className={`${STAGE_BUTTON} col-span-2 bg-on-stage text-stage hover:bg-white`}>
                  <Pause size={18} aria-hidden="true" />
                  {t('core.scenario.pause')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  disabled={done}
                  data-action="play"
                  className={`${STAGE_BUTTON} col-span-2 bg-on-stage text-stage hover:bg-white`}
                >
                  <Play size={18} aria-hidden="true" />
                  {index === 0 ? t('core.scenario.play') : t('core.scenario.resume')}
                </button>
              )}
              <button
                type="button"
                onClick={previous}
                disabled={index === 0}
                className={`${STAGE_BUTTON} border border-stage-line text-on-stage hover:bg-stage-raised`}
              >
                <ChevronLeft size={18} aria-hidden="true" />
                {t('core.scenario.previous')}
              </button>
              <button
                type="button"
                onClick={next}
                disabled={done}
                className={`${STAGE_BUTTON} border border-stage-line text-on-stage hover:bg-stage-raised`}
              >
                {t('core.scenario.step')}
                <ChevronRight size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setIndex(0);
                }}
                disabled={index === 0}
                className={`${STAGE_BUTTON} col-span-2 justify-self-start text-on-stage-muted underline-offset-4 hover:text-on-stage hover:underline`}
              >
                <RotateCcw size={16} aria-hidden="true" />
                {t('core.scenario.restart')}
              </button>
            </div>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-stage-muted">
              <span className="font-medium text-on-stage tabular-nums">{t('core.scenario.progress', { n: index, total: last })}</span>
              <span>{t('core.scenario.shortcuts')}</span>
            </p>
          </div>

          <StateTimeline
            steps={frames.map((f) => ({ index: f.index, day: f.day, level: f.level, changed: f.changed }))}
            selected={index}
            label={t('core.scenario.timelineLabel')}
          />

          <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_10rem] lg:grid-cols-[minmax(0,1fr)_11rem]">
            <div aria-live="polite" className="flex flex-col gap-3">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-on-stage-muted">
                <span className="font-mono text-on-stage">{t('core.scenario.day', { day: frame.day })}</span>
                <span>{t('core.scenario.molecule')}</span>
                <OriginBadge origin="simulated" tone="dark" />
              </p>
              <h2 id="etape" tabIndex={-1} className="text-xl leading-snug font-semibold text-on-stage sm:text-2xl">
                {stepText(frame)}
              </h2>
              <p key={frame.index} className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${frame.changed ? 'rw-stage-pulse' : ''}`}>
                <LevelBadge level={frame.level} tone="stage" className="text-base" />
                {frame.changed ? (
                  <span className="text-sm text-on-stage-muted">{t('core.scenario.changedFrom', { level: t(`core.levels.${frame.previous}`) })}</span>
                ) : index > 0 ? (
                  <span className="text-sm text-on-stage-muted">{t('core.scenario.unchanged')}</span>
                ) : null}
              </p>
              {done ? <p className="border-s-2 border-scenario-accent ps-3 font-medium text-on-stage">{t('core.scenario.end')}</p> : null}
            </div>
            <div className="flex flex-col gap-2">
              <GovernorateMap tone="stage" values={mapValues(frame)} title={t('core.coordination.mapTitle')} className="mx-auto w-full max-w-[11rem] sm:max-w-none" />
              {frame.counts.length > 0 ? (
                <ul aria-label={t('core.coordination.mapTitle')} className="text-sm">
                  {frame.counts.map((c) => (
                    <li key={c.governorateCode} className="flex justify-between gap-4 border-b border-stage-line py-1">
                      <span>{GOV_NAME.get(c.governorateCode)}</span>
                      <span className="font-mono">{c.display}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>

        {/* Region 2: why this level, who can act. */}
        <aside aria-label={t('core.scenario.paneLabel')} className="flex flex-col gap-5 border-t border-line pt-4 lg:col-span-4 lg:border-s lg:border-t-0 lg:ps-5 lg:pt-2">
          <section aria-labelledby="pourquoi" className="flex flex-col gap-2">
            <h2 id="pourquoi" className="text-lg font-semibold text-ink">
              {t('core.scenario.whyTitle')}
            </h2>
            <p className="text-ink">{explanationText(frame.rule, frame.evidence)}</p>
            <MissingLine level={frame.level} rule={frame.rule} evidence={frame.exact} exact now={new Date(frame.at)} />
            <RuleDetails rule={frame.rule}><p>{t('core.scenario.rulesNote')}</p></RuleDetails>
          </section>

          <section aria-labelledby="qui-agit" className="flex flex-col gap-2 border-t border-line pt-5">
            <h2 id="qui-agit" className="text-lg font-semibold text-ink">
              {t('core.scenario.whoTitle')}
            </h2>
            {frame.alerted.length > 0 ? (
              <div className="flex flex-col gap-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                  {t('core.scenario.alertsTitle')}
                  <OriginBadge origin="simulated" />
                </p>
                <ul className="flex list-disc flex-col gap-0.5 ps-5 text-ink marker:text-ink-muted">
                  {frame.alerted.map((r) => (
                    <li key={r}>{t(`core.scenario.recipients.${r}`)}</li>
                  ))}
                </ul>
                {frame.standDown ? <p className="text-ink">{t('core.scenario.standDown')}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">{index === 0 ? t('core.scenario.whoNone') : t('core.scenario.alertsNone')}</p>
            )}
            {actors.length > 0 ? (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-ink">{t('core.scenario.actorsLead', { level: t(`core.levels.${frame.level}`) })}</p>
                <ul className="flex flex-col gap-1 text-sm text-ink">
                  {actors.map((a) => (
                    <li key={a.role}>
                      <span className="font-medium">{t(`core.playbook.roles.${a.role}`)}</span>
                      {t('core.common.colon')}
                      {a.actions.map((action) => t(`core.playbook.actions.${action}`)).join(t('core.scenario.actionsSeparator'))}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-sm text-ink-muted">{t('core.guidance.disclaimer')}</p>
          </section>
        </aside>
      </div>

      <section aria-labelledby="scenario-historique" className="flex flex-col gap-2 border-t border-line pt-4">
        <h2 id="scenario-historique" className="flex flex-wrap items-center gap-2 text-lg font-semibold text-ink">
          {t('core.scenario.historyTitle')}
          <OriginBadge origin="simulated" />
        </h2>
        {changes.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('core.scenario.historyEmpty')}</p>
        ) : (
          <ol className="hairline-list border-y border-line">
            {changes.map((f) => (
              <li key={f.index}>
                <button
                  type="button"
                  aria-current={f.index === index ? 'step' : undefined}
                  onClick={() => {
                    setPlaying(false);
                    setIndex(f.index);
                    document.getElementById('etape')?.focus();
                  }}
                  className="grid min-h-12 w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-2 py-2 text-start text-sm hover:bg-surface-subtle aria-[current=step]:bg-surface-subtle sm:gap-4"
                >
                  <span className="font-mono text-ink-muted">{t('core.scenario.dayShort', { day: f.day })}</span>
                  <span className="grid gap-0.5">
                    <span className="font-medium text-ink">{stepText(f)}</span>
                    <LevelBadge level={f.level} />
                  </span>
                  <ChevronRight size={18} aria-hidden="true" className="text-brand" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="text-sm text-ink-muted">{t('core.scenario.memoryNote')}</p>
    </div>
  );
}
