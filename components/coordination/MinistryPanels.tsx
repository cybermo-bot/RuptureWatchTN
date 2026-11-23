import Link from 'next/link';
import { DailyBars, type DayValue } from '@/components/charts/DailyBars';
import { Panel } from '@/components/console/Panel';
import { GOVERNORATE_SHAPES, GovernorateMap, type GovernorateValue } from '@/components/GovernorateMap';
import { LevelBadge } from '@/components/LevelBadge';
import type { DayActivity } from '@/lib/institutions/data';
import { t } from '@/lib/i18n';
import { DEFAULT_PARAMS } from '@/lib/signal';
import { LEVEL_ORDER, type ActiveLevel } from '@/lib/signals/views';

// The ministry's national map, filterable by level (links, no script), and its daily charts.

const MAP_FILL = (level: ActiveLevel) => `color-mix(in srgb, var(--level-${level}) 78%, white)`;

export function NationalMapPanel({ map, level, selectedId }: { map: Record<string, ActiveLevel>; level: ActiveLevel | null; selectedId: string | null }) {
  const values: Partial<Record<string, GovernorateValue>> = {};
  for (const g of GOVERNORATE_SHAPES) {
    const l = map[g.code];
    values[g.code] = l ? { text: t(`core.levels.${l}`), fill: MAP_FILL(l) } : { text: t('core.ministry.mapNone'), fill: 'var(--surface)' };
  }
  const href = (l: ActiveLevel | null) => {
    const q = new URLSearchParams();
    if (selectedId) q.set('m', selectedId);
    if (l) q.set('niveau', l);
    const s = q.toString();
    return `/coordination${s ? `?${s}` : ''}#carte-nationale`;
  };
  const filters: (ActiveLevel | null)[] = [null, ...LEVEL_ORDER];
  const affected = GOVERNORATE_SHAPES.filter((g) => map[g.code]);
  return (
    <Panel
      id="carte-nationale"
      title={t('core.ministry.mapTitle')}
      titleId="carte-nationale-titre"
      description={t('core.ministry.mapIntro', { days: DEFAULT_PARAMS.confirmWindowDays })}
      className="scroll-mt-20"
    >
      <div className="flex flex-col gap-4">
        <nav aria-label={t('core.ministry.mapFilter')}>
          <ul className="flex flex-wrap gap-2">
            {filters.map((f) => {
              const current = f === level;
              return (
                <li key={f ?? 'all'}>
                  <Link
                    href={href(f)}
                    aria-current={current ? 'true' : undefined}
                    className={`inline-flex min-h-12 items-center rounded-md border px-3 text-sm no-underline transition-colors duration-150 ${
                      current ? 'border-ink bg-surface-subtle font-medium text-ink' : 'border-line text-ink hover:border-ink-muted'
                    }`}
                  >
                    {f ? <LevelBadge level={f} /> : t('core.ministry.mapAll')}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] sm:items-start">
          <GovernorateMap values={values} title={t('core.ministry.mapTitle')} className="mx-auto w-full max-w-[17rem]" />
          {affected.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('core.ministry.mapEmpty')}</p>
          ) : (
            <ul className="hairline-list text-sm" aria-label={t('core.ministry.mapTitle')}>
              {affected.map((g) => (
                <li key={g.code} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-ink">{g.name}</span>
                  <LevelBadge level={map[g.code]} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}

function toDayValues(rows: DayActivity[], key: 'pharmacies' | 'requests'): DayValue[] {
  return rows.map((r) => ({ day: new Date(`${r.day}T12:00:00Z`), value: r[key] === '<3' ? '<3' : Number(r[key]) || 0 }));
}

export function ActivityCharts({ rows, days }: { rows: DayActivity[]; days: number }) {
  return (
    <Panel title={t('core.ministry.chartsTitle', { days })} titleId="activite" headingLevel={3}>
      <div className="grid gap-6 lg:grid-cols-2">
        <DailyBars id="rapports-jour" data={toDayValues(rows, 'pharmacies')} title={t('core.ministry.reportsChart')} colour="var(--level-likely)" />
        <DailyBars id="demande-jour" data={toDayValues(rows, 'requests')} title={t('core.ministry.demandChart')} colour="var(--brand)" />
      </div>
    </Panel>
  );
}
