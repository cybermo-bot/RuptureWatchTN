'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { GOVERNORATE_SHAPES, GovernorateMap, type GovernorateValue } from '@/components/GovernorateMap';
import { explanationText, RuleDetails } from '@/components/LevelExplanation';
import { LevelBadge } from '@/components/LevelBadge';
import { MissingLine } from '@/components/MissingLine';
import { OriginBadge } from '@/components/OriginBadge';
import { t } from '@/lib/i18n';
import { COMPARE_CASES, compareFrames, pilotScaleMembers, type CompareCase, type CompareFrame } from '@/lib/scenario/compare';
import { DEFAULT_PARAMS } from '@/lib/signal';

// "Comparer les cas" (part 7): the same four fictional pharmacies, the same days; only the
// governorate of the fourth changes. Switch case at any step: the step stays, the level shows
// what gate two does. In the browser, deterministic, nothing written.

const GOV_NAME = new Map(GOVERNORATE_SHAPES.map((g) => [g.code, g.name]));

function stepText(f: CompareFrame): string {
  const governorate = f.governorateCode ? (GOV_NAME.get(f.governorateCode) ?? f.governorateCode) : '';
  switch (f.kind) {
    case 'start':
      return t('core.compare.steps.start');
    case 'report':
      return t(`core.compare.steps.report${f.ordinal === 1 ? 1 : f.ordinal === 2 ? 2 : f.ordinal === 3 ? 3 : 4}`, { governorate });
    case 'arrival':
      return t('core.compare.steps.arrival');
    case 'delivered':
      return t(f.ordinal === 1 ? 'core.compare.steps.delivered1' : 'core.compare.steps.delivered2', { governorate });
  }
}

function mapValues(f: CompareFrame): Partial<Record<string, GovernorateValue>> {
  const values: Partial<Record<string, GovernorateValue>> = {};
  for (const c of f.counts) {
    const mix = c.display === '<3' ? 28 : Number(c.display) >= 5 ? 92 : 58;
    const colour = f.level === 'none' ? 'var(--ink-muted)' : `var(--level-${f.level})`;
    values[c.governorateCode] = { text: c.display, fill: `color-mix(in srgb, ${colour} ${mix}%, white)` };
  }
  return values;
}

const BUTTON = 'inline-flex min-h-12 items-center justify-center rounded-sm px-5 font-medium disabled:cursor-not-allowed disabled:opacity-50';

export function CompareCases() {
  const frames = useMemo(() => ({ spread: compareFrames('spread'), concentrated: compareFrames('concentrated') }), []);
  const [chosen, setChosen] = useState<CompareCase>('spread');
  const [index, setIndex] = useState(0);
  const list = frames[chosen];
  const last = list.length - 1;
  const frame = list[index];

  return (
    <section aria-labelledby="comparer-titre" id="comparer" className="flex scroll-mt-20 flex-col gap-5 border-t border-line pt-8">
      <div className="flex flex-col gap-1.5">
        <h2 id="comparer-titre" className="flex flex-wrap items-center gap-2 text-xl font-semibold text-ink">
          {t('core.compare.title')}
        </h2>
        <p className="max-w-prose text-ink-muted">{t('core.compare.intro')}</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-ink">{t('core.compare.choose')}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {COMPARE_CASES.map((c) => (
            <label
              key={c}
              className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-md border p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand ${
                chosen === c ? 'border-brand bg-surface' : 'border-line bg-surface hover:border-ink-muted'
              }`}
            >
              <input
                type="radio"
                name="cas"
                value={c}
                checked={chosen === c}
                onChange={() => setChosen(c)}
                className="mt-1 size-4 shrink-0 accent-[var(--brand)]"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold text-ink">{t(`core.compare.cases.${c}.title`)}</span>
                <span className="text-sm text-ink-muted">{t(`core.compare.cases.${c}.body`)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div role="group" aria-label={t('core.compare.controls')} className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          disabled={index === 0}
          className={`${BUTTON} border border-line bg-surface text-ink hover:bg-surface-subtle`}
        >
          {t('core.compare.previous')}
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(i + 1, last))}
          disabled={index === last}
          data-action="compare-next"
          className={`${BUTTON} bg-brand text-white hover:bg-brand-strong`}
        >
          {t('core.compare.next')}
        </button>
        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setChosen('spread');
          }}
          disabled={index === 0 && chosen === 'spread'}
          className={`${BUTTON} border border-line bg-surface text-ink hover:bg-surface-subtle`}
        >
          {t('core.compare.restart')}
        </button>
        <span className="text-sm text-ink-muted tabular-nums">{t('core.compare.progress', { n: index, total: last })}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start" data-case={chosen} data-compare-step={index} data-level={frame.level}>
        <section aria-labelledby="comparer-etape" aria-live="polite" className="panel flex flex-col gap-5 p-5">
          <div className="flex flex-col gap-2 border-b border-line pb-4">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
              <span className="font-mono">{t('core.compare.day', { day: frame.day })}</span>
              <span>{t(`core.compare.cases.${chosen}.title`)}</span>
              <OriginBadge origin="simulated" />
            </p>
            <h3 id="comparer-etape" className="font-semibold text-ink">
              {stepText(frame)}
            </h3>
            {frame.differs ? <p className="border-s-2 border-brand ps-3 text-sm text-ink">{t('core.compare.differs')}</p> : null}
            {frame.kind === 'arrival' ? <p className="border-s-2 border-line ps-3 text-sm text-ink">{t('core.compare.arrivalNote')}</p> : null}
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-ink-muted">{t('core.compare.levelTitle')}</h4>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <LevelBadge level={frame.level} className="text-base" />
              {frame.changed ? (
                <span className="text-sm text-ink-muted">{t('core.compare.changedFrom', { level: t(`core.levels.${frame.previous}`) })}</span>
              ) : index > 0 ? (
                <span className="text-sm text-ink-muted">{t('core.compare.unchanged')}</span>
              ) : null}
            </p>
            <p className="max-w-prose text-ink">{explanationText(frame.rule, frame.evidence)}</p>
            <MissingLine level={frame.level} rule={frame.rule} evidence={frame.exact} exact now={new Date(frame.at)} />
            <RuleDetails rule={frame.rule}>
              <p>{t('core.compare.pilotNote', {
                min: DEFAULT_PARAMS.confirmMinPharmacies,
                governorates: DEFAULT_PARAMS.confirmMinGovernorates,
                members: pilotScaleMembers(),
                pct: Math.round(DEFAULT_PARAMS.confirmMemberShare * 100),
              })}</p>
              <Link href="/methode#explorer" className="flex min-h-12 w-fit items-center">{t('core.compare.explorerLink')}</Link>
            </RuleDetails>
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <section aria-labelledby="comparer-deux" className="panel">
            <h3 id="comparer-deux" className="panel-header text-sm font-medium text-ink-muted">
              {t('core.compare.bothTitle')}
            </h3>
            <ul className="hairline-list">
              {COMPARE_CASES.map((c) => (
                <li key={c} aria-current={c === chosen ? 'true' : undefined} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5">
                  <span className={c === chosen ? 'font-semibold text-ink' : 'text-ink'}>{t(`core.compare.cases.${c}.title`)}</span>
                  <LevelBadge level={frames[c][index].level} />
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="comparer-carte" className="panel flex flex-col gap-3 p-5">
            <h3 id="comparer-carte" className="text-sm font-medium text-ink-muted">
              {t('core.compare.mapTitle', { days: DEFAULT_PARAMS.confirmWindowDays })}
            </h3>
            <GovernorateMap values={mapValues(frame)} title={t('core.compare.mapTitle', { days: DEFAULT_PARAMS.confirmWindowDays })} className="mx-auto w-full max-w-[16rem]" />
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
        </div>
      </div>

      <p className="text-sm text-ink-muted">{t('core.compare.memoryNote')}</p>
    </section>
  );
}
