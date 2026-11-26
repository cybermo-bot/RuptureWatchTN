'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { GovernorateMap, GOVERNORATE_SHAPES } from '@/components/GovernorateMap';
import { LevelBadge } from '@/components/LevelBadge';
import { OriginBadge } from '@/components/OriginBadge';
import { proportionalSplit } from '@/lib/allocation/proportional';
import { fairSplit, minCoverAfter } from '@/lib/allocation/split';
import { EXAMPLE_STOCK } from '@/lib/allocation/stock';
import { t } from '@/lib/i18n';
import { compareFrames, type CompareCase } from '@/lib/scenario/compare';
import seed from '@/supabase/seed/allocation-demo.json';

const spread = compareFrames('spread');
const initial = spread.find((frame) => frame.kind === 'report' && frame.ordinal === 3)!;
const results = {
  spread: spread[initial.index + 1],
  concentrated: compareFrames('concentrated')[initial.index + 1],
};
const choices = (['concentrated', 'spread'] as const).map((key) => ({
  key,
  name: GOVERNORATE_SHAPES.find((shape) => shape.code === results[key].governorateCode)!.name,
}));
const names = new Map(GOVERNORATE_SHAPES.map(({ code, name }) => [code, name]));
const days = new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function DecisionDemo() {
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<CompareCase | null>(null);
  const [comparing, setComparing] = useState(false);
  const frame = chosen ? results[chosen] : initial;
  const values = Object.fromEntries(frame.counts.map(({ governorateCode, display }) => [
    governorateCode, { text: display, fill: `var(--level-${frame.level}-on-stage)` },
  ]));

  return (
    <section aria-labelledby="decision-demo" className="stage grid gap-4 rounded-md bg-stage px-4 py-5 text-on-stage sm:p-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-10">
      <div className="flex flex-col items-start gap-4">
        <h1 id="decision-demo" className="text-[2rem] leading-tight font-semibold tracking-tight sm:text-4xl">{t('core.decisionDemo.title')}</h1>
        <p className="text-on-stage-muted">{t('core.decisionDemo.medicine')}</p>
        <div role="status" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3" data-demo-level={frame.level}>
            <LevelBadge level={frame.level} tone="stage" className="text-lg" />
            <OriginBadge origin="simulated" tone="dark" />
          </div>
          <p className="max-w-prose">{t(chosen ? `core.decisionDemo.${chosen}` : 'core.decisionDemo.initial', { n: initial.ordinal ?? 0 })}</p>
          {chosen === 'spread' ? <p className="text-on-stage-muted">{t('core.decisionDemo.actors')}</p> : null}
        </div>
        {!chosen && !picking ? (
          <Button variant="stage" onClick={() => setPicking(true)}>{t('core.decisionDemo.add')}</Button>
        ) : null}
        {!chosen && picking ? (
          <fieldset>
            <legend className="mb-2 font-medium">{t('core.decisionDemo.choose')}</legend>
            <div className="flex gap-3">
              {choices.map(({ key, name }) => (
                <button key={key} type="button" className="min-h-12 rounded-sm border border-on-stage-muted px-5 font-medium hover:bg-stage-raised" onClick={() => setChosen(key)}>{name}</button>
              ))}
            </div>
          </fieldset>
        ) : null}
        {chosen && !comparing ? (
          <Button variant="stage" onClick={() => setComparing(true)}>{t('core.decisionDemo.allocation')}</Button>
        ) : null}
        {comparing ? <AllocationDemo /> : null}
        <div className="flex flex-wrap items-center gap-x-5">
          <button type="button" className="min-h-12 font-medium underline underline-offset-4" onClick={() => {
            setChosen(null);
            setPicking(false);
            setComparing(false);
          }}>{t('core.compare.restart')}</button>
          <a href="#scenario-complet" className="inline-flex min-h-12 items-center text-on-stage underline underline-offset-4 hover:text-on-stage-muted">{t('core.decisionDemo.replay')}</a>
        </div>
        <p className="text-sm text-on-stage-muted">{t('core.guidance.disclaimer')}</p>
      </div>
      <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-4 border-t border-on-stage-muted/30 pt-4 md:grid-cols-1 md:justify-items-center md:border-s md:border-t-0 md:ps-6 md:pt-0">
        <GovernorateMap key={frame.index} values={values} tone="stage" pulseCode={frame.changed ? frame.governorateCode : null} className="w-full md:max-w-52" />
        <ul className="w-full max-w-52 space-y-2 text-sm">
          {frame.counts.map(({ governorateCode, display }) => (
            <li key={governorateCode} className="flex justify-between gap-4 border-b border-on-stage-muted/30 pb-1">
              <span>{names.get(governorateCode)}</span><span className="font-mono tabular-nums">{display}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function AllocationDemo() {
  const reference = minCoverAfter(proportionalSplit(EXAMPLE_STOCK, seed.governorates));
  const fair = minCoverAfter(fairSplit(EXAMPLE_STOCK, seed.governorates));
  return (
    <section aria-label={t('core.decisionDemo.allocation')} className="flex w-full flex-col items-start gap-3 border-t border-on-stage-muted/30 pt-4">
      <h2 className="text-lg font-semibold">{t('core.decisionDemo.allocation')}</h2>
      <p>{t('core.decisionDemo.cover', { stock: EXAMPLE_STOCK })}</p>
      <dl className="grid w-full grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-on-stage-muted">{t('wholesaler.split.compare.referenceTitle')}</dt>
          <dd className="font-mono text-lg">{t('wholesaler.split.compare.daysValue', { days: reference === null ? '—' : days.format(reference) })}</dd>
        </div>
        <div>
          <dt className="text-sm text-on-stage-muted">{t('wholesaler.split.compare.fairTitle')}</dt>
          <dd className="font-mono text-lg">{t('wholesaler.split.compare.daysValue', { days: fair === null ? '—' : days.format(fair) })}</dd>
        </div>
      </dl>
      <Button variant="secondary" disabled aria-describedby="demo-save-help">{t('core.decisionDemo.save')}</Button>
      <p id="demo-save-help" className="text-sm text-on-stage-muted">{t('core.decisionDemo.saveHelp')}</p>
    </section>
  );
}
