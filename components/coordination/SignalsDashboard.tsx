import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { GOVERNORATE_SHAPES, GovernorateMap, type GovernorateValue } from '@/components/GovernorateMap';
import { LevelBadge } from '@/components/LevelBadge';
import { LevelExplanation } from '@/components/LevelExplanation';
import { Origins } from '@/components/Origins';
import { OriginBadge } from '@/components/OriginBadge';
import { formatDate, formatTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { DEFAULT_PARAMS, type ForeignNotice, type Level } from '@/lib/signal';
import {
  DEMAND_WINDOW_DAYS,
  type DemandRow,
  type EventRow,
  type GovernorateCount,
  type SignalRow,
} from '@/lib/signals/views';

// The coordination view (and the hospital pharmacy's, without the export): molecules with an
// active level, most serious first; for the selected one, the governorate map, the patients'
// demand, the active foreign notices and the timeline of its levels; then the event log.
// Server component: every number arrives already suppressed by the database ('<3').

export interface DashboardData {
  signals: SignalRow[];
  selected: SignalRow | null;
  counts: GovernorateCount[];
  demand: DemandRow[];
  notices: ForeignNotice[];
  timeline: EventRow[];
  /** The whole event log, newest first. Null: not shown (hospital space). */
  events: EventRow[] | null;
}

const GOV_NAME = new Map(GOVERNORATE_SHAPES.map((g) => [g.code, g.name]));

/** Map band for a suppressed count: '<3', 3 or 4, 5 and more. */
export function countBand(pharmacies: string): 'few' | 'some' | 'many' {
  if (pharmacies === '<3') return 'few';
  return Number(pharmacies) >= 5 ? 'many' : 'some';
}

const BAND_MIX: Record<'few' | 'some' | 'many', number> = { few: 28, some: 58, many: 92 };

function bandFill(level: Level, band: 'few' | 'some' | 'many'): string {
  const colour = level === 'none' ? 'var(--ink-muted)' : `var(--level-${level})`;
  return `color-mix(in srgb, ${colour} ${BAND_MIX[band]}%, white)`;
}

export { Origins } from '@/components/Origins';

function Change({ from, to }: { from: Level; to: Level }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <LevelBadge level={from} className="font-normal text-ink-muted" />
      <span aria-hidden="true" className="text-ink-muted">
        {'→'}
      </span>
      <span className="sr-only">{t('core.coordination.changeTo')}</span>
      <LevelBadge level={to} />
    </span>
  );
}

function When({ at }: { at: string }) {
  return (
    <time dateTime={at} className="whitespace-nowrap text-sm text-ink-muted tabular-nums">
      {t('core.common.dateAt', { date: formatDate(at), time: formatTime(at) })}
    </time>
  );
}

export function GovernoratePanel({ level, counts }: { level: Level; counts: GovernorateCount[] }) {
  const values: Partial<Record<string, GovernorateValue>> = {};
  for (const c of counts) {
    values[c.governorate_code] = { text: c.pharmacies, fill: bandFill(level, countBand(c.pharmacies)) };
  }
  const legend: { key: string; label: string; fill: string }[] = [
    { key: 'none', label: t('core.coordination.legendNone'), fill: 'var(--surface-subtle)' },
    { key: 'few', label: t('core.coordination.legendFew'), fill: bandFill(level, 'few') },
    { key: 'some', label: t('core.coordination.legendSome'), fill: bandFill(level, 'some') },
    { key: 'many', label: t('core.coordination.legendMany'), fill: bandFill(level, 'many') },
  ];
  return (
    <section aria-labelledby="carte" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 id="carte" className="font-semibold text-ink">
          {t('core.coordination.mapTitle')}
        </h3>
        <p className="text-sm text-ink-muted">
          {t('core.coordination.mapWindow', { hours: DEFAULT_PARAMS.minUndeliveredHours, days: DEFAULT_PARAMS.confirmWindowDays })}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:items-start">
        <GovernorateMap values={values} title={t('core.coordination.mapTitle')} className="mx-auto w-full max-w-[15rem]" />
        <div className="flex flex-col gap-4">
          <ul aria-label={t('core.coordination.legendTitle')} className="flex flex-col gap-1.5 text-sm text-ink">
            {legend.map((l) => (
              <li key={l.key} className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block size-4 shrink-0 rounded-sm border border-ink-muted" style={{ background: l.fill }} />
                {l.label}
              </li>
            ))}
          </ul>
          {counts.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('core.coordination.mapEmpty', { days: DEFAULT_PARAMS.confirmWindowDays })}</p>
          ) : (
            <table className="hairline-table text-sm">
              <thead>
                <tr>
                  <th scope="col">{t('core.coordination.colGovernorate')}</th>
                  <th scope="col" className="text-end">
                    {t('core.coordination.colPharmacies')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {counts.map((c) => (
                  <tr key={c.governorate_code}>
                    <td>{c.governorate_name}</td>
                    <td className="text-end font-mono">{c.pharmacies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-sm text-ink-muted">{t('core.coordination.smallCounts')}</p>
        </div>
      </div>
    </section>
  );
}

export function DemandPanel({ demand }: { demand: DemandRow[] }) {
  return (
    <section aria-labelledby="demande" className="flex flex-col gap-3">
      <h3 id="demande" className="font-semibold text-ink">
        {t('core.coordination.demandTitle', { days: DEMAND_WINDOW_DAYS })}
      </h3>
      {demand.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('core.coordination.demandEmpty', { days: DEMAND_WINDOW_DAYS })}</p>
      ) : (
        <table className="hairline-table text-sm">
          <thead>
            <tr>
              <th scope="col">{t('core.coordination.colGovernorate')}</th>
              <th scope="col" className="text-end">
                {t('core.coordination.colRequests')}
              </th>
              <th scope="col" className="text-end">
                {t('core.coordination.colUnanswered')}
              </th>
            </tr>
          </thead>
          <tbody>
            {demand.map((d) => (
              <tr key={d.governorate_code}>
                <td>{GOV_NAME.get(d.governorate_code) ?? d.governorate_code}</td>
                <td className="text-end font-mono">{d.requests}</td>
                <td className="text-end font-mono">{d.unanswered}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="border-s-2 border-line ps-3 text-sm text-ink">{t('core.coordination.demandNote')}</p>
    </section>
  );
}

export function NoticesPanel({ notices }: { notices: ForeignNotice[] }) {
  return (
    <section aria-labelledby="avis" className="flex flex-col gap-3">
      <h3 id="avis" className="font-semibold text-ink">
        {t('core.coordination.noticesTitle')}
      </h3>
      {notices.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('core.molecule.noticesEmpty')}</p>
      ) : (
        <ul className="hairline-list border-y border-line text-sm">
          {notices.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
              <span className="font-medium text-ink">{n.source}</span>
              <span>{t(`core.molecule.noticeStatus.${n.status}`)}</span>
              <span className="text-ink-muted">{t('core.molecule.noticePublished', { date: formatDate(n.publishedAt) })}</span>
              <OriginBadge origin={n.origin} />
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="min-h-12 content-center underline">
                {t('core.molecule.noticeLink', { source: n.source })}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Timeline({ events }: { events: EventRow[] }) {
  return (
    <section aria-labelledby="historique" className="flex flex-col gap-3">
      <h3 id="historique" className="font-semibold text-ink">
        {t('core.coordination.timelineTitle')}
      </h3>
      {events.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('core.coordination.timelineEmpty')}</p>
      ) : (
        <ol className="hairline-list border-y border-line">
          {events.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 py-3">
              <When at={e.at} />
              <Change from={e.from_level} to={e.to_level} />
              <span className="font-mono text-xs text-ink-muted">{e.rule}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function EventLog({ events }: { events: EventRow[] }) {
  return (
    <section aria-labelledby="journal" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="journal" className="text-lg font-semibold text-ink">
          {t('core.coordination.eventLogTitle')}
        </h2>
        <p className="text-sm text-ink-muted">{t('core.coordination.eventLogIntro')}</p>
      </div>
      {events.length === 0 ? (
        <EmptyState title={t('core.coordination.eventLogEmpty')} />
      ) : (
        <ol className="hairline-list border-y border-line">
          {events.map((e) => (
            <li key={e.id} className="grid gap-x-6 gap-y-1 py-3 lg:grid-cols-[12rem_minmax(0,14rem)_minmax(0,1fr)]">
              <When at={e.at} />
              <span className="font-medium break-words text-ink">{e.molecule_name}</span>
              <span className="flex flex-col gap-1">
                <Change from={e.from_level} to={e.to_level} />
                <span className="font-mono text-xs text-ink-muted">{e.rule}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function SignalsDashboard({ data, basePath }: { data: DashboardData; basePath: string }) {
  const { signals, selected } = data;
  return (
    <div className="flex flex-col gap-12">
      {signals.length === 0 ? (
        <EmptyState title={t('core.coordination.emptyTitle')} body={t('core.coordination.emptyBody')} />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
          <section aria-labelledby="signaux" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="signaux" className="text-lg font-semibold text-ink">
                {t('core.coordination.signalsTitle')}
              </h2>
              <p className="text-sm text-ink-muted">{t('core.coordination.live')}</p>
            </div>
            <ul className="hairline-list border-y border-line">
              {signals.map((s) => {
                const isSelected = s.molecule_id === selected?.molecule_id;
                return (
                  <li key={s.molecule_id}>
                    <Link
                      href={`${basePath}?m=${s.molecule_id}#detail`}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`flex min-h-12 flex-col gap-1 py-3 ps-3 no-underline hover:bg-surface-subtle ${
                        isSelected ? 'border-s-2 border-brand bg-surface-subtle' : 'border-s-2 border-transparent'
                      }`}
                    >
                      <span className="font-medium break-words text-ink">{s.molecule_name}</span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                        <LevelBadge level={s.level} />
                        <span>{t('core.pharmacy.since', { date: formatDate(s.since) })}</span>
                        <Origins origins={s.evidence.origins} />
                        {isSelected ? <span className="sr-only">{t('core.coordination.selected')}</span> : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {selected ? (
            <section id="detail" aria-labelledby="detail-titre" className="flex scroll-mt-4 flex-col gap-10">
              <header className="flex flex-col gap-3 border-b border-line pb-6">
                <h2 id="detail-titre" className="text-xl font-semibold break-words text-ink">
                  {selected.molecule_name}
                </h2>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                  <LevelBadge level={selected.level} />
                  <span>{t('core.pharmacy.since', { date: formatDate(selected.since) })}</span>
                  <Origins origins={selected.evidence.origins} />
                </p>
                <LevelExplanation rule={selected.rule} evidence={selected.evidence} showRule methodLink />
                <p className="text-sm text-ink-muted">{t('core.guidance.disclaimer')}</p>
              </header>
              <GovernoratePanel level={selected.level} counts={data.counts} />
              <DemandPanel demand={data.demand} />
              <NoticesPanel notices={data.notices} />
              <Timeline events={data.timeline} />
            </section>
          ) : null}
        </div>
      )}
      {data.events ? <EventLog events={data.events} /> : null}
    </div>
  );
}
