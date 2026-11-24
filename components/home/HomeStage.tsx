import { ArrowDown, Play } from 'lucide-react';
import Link from 'next/link';
import { GOVERNORATE_SHAPES, GovernorateMap, type GovernorateValue } from '@/components/GovernorateMap';
import { LevelBadge } from '@/components/LevelBadge';
import { OriginBadge } from '@/components/OriginBadge';
import { StateTimeline } from '@/components/scenario/StateTimeline';
import { t, type MessageKey } from '@/lib/i18n';
import { frozenFrame, scenarioFrames, type ScenarioFrame } from '@/lib/scenario/frames';

// The home page's stage (session 6, part 6): on plum, a 5/7 split. Left, the label that it is a
// demonstration, the heading, one sentence, the citron "Voir le scénario" and the "Choisir un
// rôle" link. Right, one frozen moment of the scenario, computed from scenarioFrames() (the same
// data /scenario plays): the moment the level reaches "confirmée", with the governorates that
// reported, the state line and the source of the picture. On phones the heading and the button
// come first, the graphic below.

const GOV_NAME = new Map(GOVERNORATE_SHAPES.map((g) => [g.code, g.name]));

function mapValues(f: ScenarioFrame): Partial<Record<string, GovernorateValue>> {
  const values: Partial<Record<string, GovernorateValue>> = {};
  for (const c of f.counts) {
    const mix = c.display === '<3' ? 45 : Number(c.display) >= 5 ? 100 : 75;
    values[c.governorateCode] = {
      text: c.display,
      fill: `color-mix(in srgb, var(--level-${f.level === 'none' ? 'none' : f.level}-on-stage) ${mix}%, var(--stage-raised))`,
    };
  }
  return values;
}

export function HomeStage() {
  const frames = scenarioFrames(t('core.scenario.noticeSource'), '/methode#garde-fous');
  const frame = frozenFrame(frames);
  const governorate = frame.governorateCode ? (GOV_NAME.get(frame.governorateCode) ?? frame.governorateCode) : '';
  const event = frame.labelKey ? t(`core.${frame.labelKey}` as MessageKey, { governorate }) : t('core.scenario.startText');

  return (
    <section aria-labelledby="accroche" className="stage bg-stage text-on-stage">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 pt-7 pb-10 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-16">
        <div className="flex flex-col items-start gap-5 lg:col-span-5 lg:justify-center">
          <p className="rounded-sm border border-dashed border-on-stage-muted px-2 font-mono text-xs leading-6 tracking-wide text-on-stage-muted uppercase">
            {t('core.home.stage.demo')}
          </p>
          <h1 id="accroche" className="text-[2rem] leading-[1.08] font-semibold tracking-tight text-on-stage sm:text-[2.25rem] lg:text-[3.25rem]">
            {t('core.home.stage.title')}
          </h1>
          <p className="max-w-prose text-lg leading-relaxed text-on-stage-muted">{t('core.home.stage.lead')}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href="/scenario"
              data-button
              className="inline-flex min-h-12 items-center gap-2 rounded-md bg-scenario-accent px-5 text-base font-semibold text-stage no-underline transition-colors duration-150 hover:bg-white hover:text-stage"
            >
              <Play size={18} aria-hidden="true" />
              {t('core.home.stage.cta')}
            </Link>
            <Link href="#roles" className="inline-flex min-h-12 items-center gap-1.5 font-medium underline-offset-4">
              <ArrowDown size={16} aria-hidden="true" />
              {t('core.home.stage.roles')}
            </Link>
          </div>
        </div>

        <figure className="m-0 flex flex-col gap-5 rounded-xl border border-stage-line bg-stage-raised p-5 sm:p-6 lg:col-span-7">
          <div className="flex flex-col gap-2">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-on-stage-muted">
              <span className="font-mono text-on-stage">{t('core.scenario.day', { day: frame.day })}</span>
              <span>{t('core.scenario.molecule')}</span>
              <OriginBadge origin="simulated" tone="dark" />
            </p>
            <p className="text-lg leading-snug font-medium text-on-stage">{event}</p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <LevelBadge level={frame.level} tone="stage" className="text-base" />
              <span className="text-sm text-on-stage-muted">{t('core.scenario.changedFrom', { level: t(`core.levels.${frame.previous}`) })}</span>
            </p>
          </div>
          <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-center gap-5 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
            <GovernorateMap tone="stage" values={mapValues(frame)} title={t('core.home.stage.mapTitle')} />
            <div className="flex min-w-0 flex-col gap-2 text-sm">
              <p className="text-on-stage-muted">{t('core.home.stage.mapTitle')}</p>
              <ul>
                {frame.counts.map((c) => (
                  <li key={c.governorateCode} className="flex justify-between gap-3 border-b border-stage-line py-1">
                    <span>{GOV_NAME.get(c.governorateCode)}</span>
                    <span className="font-mono">{c.display}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <StateTimeline
            steps={frames.map((f) => ({ index: f.index, day: f.day, level: f.level, changed: f.changed }))}
            selected={frame.index}
            label={t('core.scenario.timelineLabel')}
          />
          <figcaption className="border-t border-stage-line pt-3 text-xs leading-relaxed text-on-stage-muted">
            {t('core.home.stage.source', { step: frame.index, total: frames.length - 1 })}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
