import Link from 'next/link';
import type { ReactNode } from 'react';
import { LevelBand } from '@/components/charts/LevelBand';
import { KeyFigures, type KeyFigure } from '@/components/console/KeyFigures';
import { Panel } from '@/components/console/Panel';
import { EmptyState } from '@/components/EmptyState';
import { CatalogueLine } from '@/components/institutions/Lines';
import { GOVERNORATE_SHAPES, GovernorateMap, type GovernorateValue } from '@/components/GovernorateMap';
import { LevelBadge, LevelShape } from '@/components/LevelBadge';
import { FreshnessLine } from '@/components/Freshness';
import { LevelExplanation } from '@/components/LevelExplanation';
import { MissingLine } from '@/components/MissingLine';
import { PlaybookLink } from '@/components/PlaybookLink';
import { LevelChangeWatcher } from '@/components/live/LevelChangeWatcher';
import { Origins } from '@/components/Origins';
import { OriginBadge } from '@/components/OriginBadge';
import type { DecisionRow } from '@/lib/allocation/decisions';
import type { CatalogueFacts } from '@/lib/institutions/catalogue';
import type { Arrival } from '@/lib/institutions/data';
import { moleculesAtLevelPerDay } from '@/lib/charts/series';
import { formatDate, formatTime } from '@/lib/format';
import { freshness } from '@/lib/freshness';
import { t } from '@/lib/i18n';
import { DEFAULT_PARAMS, type ForeignNotice, type Level } from '@/lib/signal';
import {
  DEMAND_WINDOW_DAYS,
  LEVEL_ORDER,
  type ActiveLevel,
  type DemandRow,
  type EventRow,
  type GovernorateCount,
  type SignalRow,
} from '@/lib/signals/views';

// The signals dashboard of the coordination, hospital and wholesaler spaces: key figures, the
// molecules with an active level (most serious first), and for the selected one its map, the
// patients' demand, the active foreign notices and the timeline of its levels; then the event
// log. Server component: every number arrives already suppressed by the database ('<3').

export interface DashboardData {
  signals: SignalRow[];
  selected: SignalRow | null;
  counts: GovernorateCount[];
  demand: DemandRow[];
  notices: ForeignNotice[];
  timeline: EventRow[];
  /** Every level change readable by the caller, newest first: the key figures' series. */
  history: EventRow[];
  /** The whole event log, newest first. Null: not shown (hospital and wholesaler spaces). */
  events: EventRow[] | null;
  /** Wholesalers' allocation decisions (track D), shown in the event log. Never a wholesaler's name. */
  decisions?: DecisionRow[] | null;
  /** Arrivals announced by the centrale (part 5), shown in the event log. */
  arrivals?: (Arrival & { moleculeName: string })[] | null;
}

const GOV_NAME = new Map(GOVERNORATE_SHAPES.map((g) => [g.code, g.name]));
export const FIGURE_DAYS = 14;

/** Map band for a suppressed count: '<3', 3 or 4, 5 and more. */
/** "Mis à jour il y a 4 min", from the signal's last evaluation (part 8, item 5). */
function SignalFreshness({ at }: { at: string | null | undefined }) {
  const f = at ? freshness(at, new Date()) : null;
  if (!at || !f) return null;
  return (
    <FreshnessLine
      at={at}
      text={f.unit === 'now' ? t('core.freshness.now') : t(`core.freshness.${f.unit}`, { n: f.n })}
      title={t('core.freshness.title', { date: formatDate(at), time: formatTime(at) })}
    />
  );
}

export function countBand(pharmacies: string): 'few' | 'some' | 'many' {
  if (pharmacies === '<3') return 'few';
  return Number(pharmacies) >= 5 ? 'many' : 'some';
}

const BAND_MIX: Record<'few' | 'some' | 'many', number> = { few: 28, some: 58, many: 92 };

export function bandFill(level: Level, band: 'few' | 'some' | 'many'): string {
  const colour = level === 'none' ? 'var(--ink-muted)' : `var(--level-${level})`;
  return `color-mix(in srgb, ${colour} ${BAND_MIX[band]}%, white)`;
}

export { Origins } from '@/components/Origins';

/** Key figures: medicines at each level now, with the 14-day series computed from the event log. */
export function levelFigures(signals: SignalRow[], history: EventRow[], levels: ActiveLevel[] = LEVEL_ORDER): KeyFigure[] {
  return levels.map((level) => ({
    key: level,
    label: t('core.figures.levelCount', { level: t(`core.levels.${level}`) }),
    value: String(signals.filter((s) => s.level === level).length),
    marker: <LevelShape level={level} size={16} />,
    series: moleculesAtLevelPerDay(history, level, FIGURE_DAYS),
    colour: `var(--level-${level})`,
  }));
}

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
    <time dateTime={at} className="text-sm whitespace-nowrap text-ink-muted tabular-nums">
      {t('core.common.dateAt', { date: formatDate(at), time: formatTime(at) })}
    </time>
  );
}

export function GovernoratePanel({ level, counts, headingLevel = 3 }: { level: Level; counts: GovernorateCount[]; headingLevel?: 2 | 3 }) {
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
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section aria-labelledby="carte" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <H id="carte" className="font-semibold text-ink">
          {t('core.coordination.mapTitle')}
        </H>
        <p className="text-sm text-ink-muted">
          {t('core.coordination.mapWindow', { hours: DEFAULT_PARAMS.minUndeliveredHours, days: DEFAULT_PARAMS.confirmWindowDays })}
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] sm:items-start">
        <GovernorateMap values={values} title={t('core.coordination.mapTitle')} className="mx-auto w-full max-w-[17rem]" />
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

export function DemandTable({ demand }: { demand: DemandRow[] }) {
  return (
    <div className="flex flex-col gap-3">
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
    </div>
  );
}

/** Kept for /vues and other callers: the demand table under its own heading. */
export function DemandPanel({ demand }: { demand: DemandRow[] }) {
  return (
    <section aria-labelledby="demande" className="flex flex-col gap-3">
      <h3 id="demande" className="font-semibold text-ink">
        {t('core.coordination.demandTitle', { days: DEMAND_WINDOW_DAYS })}
      </h3>
      <DemandTable demand={demand} />
    </section>
  );
}

export function NoticesList({ notices }: { notices: ForeignNotice[] }) {
  if (notices.length === 0) return <p className="text-sm text-ink-muted">{t('core.molecule.noticesEmpty')}</p>;
  return (
    <ul className="hairline-list text-sm">
      {notices.map((n) => (
        <li key={n.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 first:pt-0">
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
  );
}

export function NoticesPanel({ notices }: { notices: ForeignNotice[] }) {
  return (
    <section aria-labelledby="avis" className="flex flex-col gap-3">
      <h3 id="avis" className="font-semibold text-ink">
        {t('core.coordination.noticesTitle')}
      </h3>
      <NoticesList notices={notices} />
    </section>
  );
}

export function TimelineList({ events }: { events: EventRow[] }) {
  if (events.length === 0) return <p className="text-sm text-ink-muted">{t('core.coordination.timelineEmpty')}</p>;
  return (
    <ol className="hairline-list">
      {events.map((e) => (
        <li key={e.id} className="flex flex-col gap-1 py-3 first:pt-0">
          <When at={e.at} />
          <Change from={e.from_level} to={e.to_level} />
          <span className="font-mono text-xs text-ink-muted">{e.rule}</span>
        </li>
      ))}
    </ol>
  );
}

export function Timeline({ events }: { events: EventRow[] }) {
  return (
    <section aria-labelledby="historique" className="flex flex-col gap-3">
      <h3 id="historique" className="font-semibold text-ink">
        {t('core.coordination.timelineTitle')}
      </h3>
      <TimelineList events={events} />
    </section>
  );
}

type LogItem =
  | { kind: 'event'; at: string; event: EventRow }
  | { kind: 'decision'; at: string; decision: DecisionRow }
  | { kind: 'arrival'; at: string; arrival: Arrival & { moleculeName: string } };

export function EventLog({
  events,
  decisions = [],
  arrivals = [],
}: {
  events: EventRow[];
  decisions?: DecisionRow[];
  arrivals?: (Arrival & { moleculeName: string })[];
}) {
  const items: LogItem[] = [
    ...events.map((e) => ({ kind: 'event' as const, at: e.at, event: e })),
    ...decisions.map((d) => ({ kind: 'decision' as const, at: d.decided_at, decision: d })),
    ...arrivals.map((a) => ({ kind: 'arrival' as const, at: a.announcedAt, arrival: a })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Panel title={t('core.coordination.eventLogTitle')} titleId="journal" description={t('core.coordination.eventLogIntro')} bodyClassName="px-4">
      {items.length === 0 ? (
        <p className="py-6 text-sm text-ink-muted">{t('core.coordination.eventLogEmpty')}</p>
      ) : (
        <ol className="hairline-list">
          {items.map((item) =>
            item.kind === 'event' ? (
              <li key={`e${item.event.id}`} className="grid gap-x-6 gap-y-1 py-3 lg:grid-cols-[12rem_minmax(0,14rem)_minmax(0,1fr)]">
                <When at={item.at} />
                <span className="font-medium break-words text-ink">{item.event.molecule_name}</span>
                <span className="flex flex-col gap-1">
                  <Change from={item.event.from_level} to={item.event.to_level} />
                  <span className="font-mono text-xs text-ink-muted">{item.event.rule}</span>
                </span>
              </li>
            ) : item.kind === 'arrival' ? (
              <li key={`a${item.arrival.id}`} className="grid gap-x-6 gap-y-1 py-3 lg:grid-cols-[12rem_minmax(0,14rem)_minmax(0,1fr)]">
                <When at={item.at} />
                <span className="font-medium break-words text-ink">{item.arrival.moleculeName}</span>
                <span className="flex flex-col gap-1">
                  <span className="max-w-prose break-words text-ink">
                    {t('core.arrival.logLine', {
                      date: formatDate(item.arrival.expectedOn),
                      quantity: t(`core.arrival.quantity.${item.arrival.quantity}`),
                      level: t(`core.levels.${item.arrival.level}`),
                    })}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span className="font-mono">{t('core.arrival.logKind')}</span>
                    <OriginBadge origin={item.arrival.origin} />
                  </span>
                </span>
              </li>
            ) : (
              <li key={`d${item.decision.id}`} className="grid gap-x-6 gap-y-1 py-3 lg:grid-cols-[12rem_minmax(0,14rem)_minmax(0,1fr)]">
                <When at={item.at} />
                <span className="font-medium break-words text-ink">{item.decision.molecule_name}</span>
                <span className="flex flex-col gap-1">
                  <span className="max-w-prose break-words text-ink">
                    {item.decision.applied
                      ? t('core.coordination.decisionApplied', { stock: item.decision.stock })
                      : t('core.coordination.decisionNotApplied', { stock: item.decision.stock, reason: item.decision.deviation_reason ?? '' })}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span className="font-mono">{t('core.coordination.decisionKind')}</span>
                    <OriginBadge origin={item.decision.origin} />
                  </span>
                </span>
              </li>
            ),
          )}
        </ol>
      )}
    </Panel>
  );
}

export function SignalList({
  signals,
  selectedId,
  basePath,
  facts,
}: {
  signals: SignalRow[];
  selectedId: string | null;
  basePath: string;
  /** CNAM category and other brands, shown under each name (ministry, centrale). */
  facts?: Map<string, CatalogueFacts>;
}) {
  return (
    <ul className="hairline-list">
      {signals.map((s) => {
        const isSelected = s.molecule_id === selectedId;
        return (
          <li key={s.molecule_id}>
            <Link
              href={`${basePath}?m=${s.molecule_id}#detail`}
              aria-current={isSelected ? 'true' : undefined}
              data-pulse={s.molecule_id}
              className={`relative flex min-h-14 flex-col gap-1 px-4 py-3 no-underline transition-colors duration-150 hover:bg-surface-subtle ${
                isSelected ? 'bg-surface-subtle before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-brand' : ''
              }`}
            >
              <span className="font-medium break-words text-ink">{s.molecule_name}</span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                <LevelBadge level={s.level} />
                <span>{t('core.pharmacy.since', { date: formatDate(s.since) })}</span>
                <Origins origins={s.evidence.origins} />
                {isSelected ? <span className="sr-only">{t('core.coordination.selected')}</span> : null}
              </span>
              {facts ? (
                <span className="text-sm text-ink-muted">
                  <CatalogueLine facts={facts.get(s.molecule_id)} />
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SignalsDashboard({
  data,
  basePath,
  figures,
  afterSelected,
  listTitle,
  extraFigures,
  overview,
  facts,
  detailNote,
}: {
  data: DashboardData;
  basePath: string;
  /** A second strip of key figures (the ministry's situation). */
  extraFigures?: KeyFigure[];
  /** A panel between the key figures and the list (the ministry's national map). */
  overview?: ReactNode;
  facts?: Map<string, CatalogueFacts>;
  /** A line under the selected molecule's explanation (an arrival announced). */
  detailNote?: ReactNode;
  /** Key figures shown on top. Default: medicines at each level. */
  figures?: KeyFigure[];
  /** Extra panel under the selected molecule's header (the wholesaler's split). */
  afterSelected?: ReactNode;
  listTitle?: string;
}) {
  const { signals, selected } = data;
  return (
    <div className="flex flex-col gap-5">
      <LevelChangeWatcher
        items={signals.map((s) => ({ key: s.molecule_id, name: s.molecule_name, level: s.level }))}
        governorates={data.counts.map((c) => ({ code: c.governorate_code, text: c.pharmacies }))}
      />
      <KeyFigures label={t('core.figures.label')} figures={figures ?? levelFigures(signals, data.history)} />
      {extraFigures ? <KeyFigures label={t('core.ministry.figuresLabel')} figures={extraFigures} columns={extraFigures.length} /> : null}
      {overview}

      {signals.length === 0 ? (
        <div className="panel px-4">
          <EmptyState afterRule title={t('core.coordination.emptyTitle')} body={t('core.coordination.emptyBody')} />
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-12">
          <Panel
            title={listTitle ?? t('core.coordination.signalsTitle')}
            titleId="signaux"
            description={t('core.coordination.live')}
            className="self-start xl:col-span-4"
            bodyClassName=""
          >
            <SignalList signals={signals} selectedId={selected?.molecule_id ?? null} basePath={basePath} facts={facts} />
          </Panel>

          {selected ? (
            <div id="detail" className="flex scroll-mt-20 flex-col gap-5 xl:col-span-8">
              <section aria-labelledby="detail-titre" className="panel">
                <header className="flex flex-col gap-3 border-b border-line p-4">
                  <h2 id="detail-titre" className="text-xl font-semibold break-words text-ink">
                    {selected.molecule_name}
                  </h2>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                    <LevelBadge level={selected.level} />
                    <span>{t('core.pharmacy.since', { date: formatDate(selected.since) })}</span>
                    <Origins origins={selected.evidence.origins} />
                    <SignalFreshness at={selected.updated_at} />
                  </p>
                  <LevelExplanation rule={selected.rule} evidence={selected.evidence} showRule methodLink />
                  <MissingLine level={selected.level} rule={selected.rule} evidence={selected.evidence} />
                  {facts?.get(selected.molecule_id) ? (
                    <p className="text-sm text-ink-muted">
                      <CatalogueLine facts={facts.get(selected.molecule_id)} />
                    </p>
                  ) : null}
                  {detailNote}
                  <PlaybookLink molecule={selected.molecule_name} context="evenement" />
                  <p className="text-sm text-ink-muted">{t('core.guidance.disclaimer')}</p>
                </header>
                <div className="flex flex-col gap-6 p-4">
                  <LevelBand events={data.timeline} title={t('core.charts.levelTimeline', { days: 30 })} />
                  <GovernoratePanel level={selected.level} counts={data.counts} />
                </div>
              </section>
              {afterSelected}
              <div className="grid gap-5 lg:grid-cols-2">
                <Panel title={t('core.coordination.demandTitle', { days: DEMAND_WINDOW_DAYS })} titleId="demande" headingLevel={3}>
                  <DemandTable demand={data.demand} />
                </Panel>
                <Panel title={t('core.coordination.noticesTitle')} titleId="avis" headingLevel={3}>
                  <NoticesList notices={data.notices} />
                </Panel>
              </div>
              <Panel title={t('core.coordination.timelineTitle')} titleId="historique" headingLevel={3}>
                <TimelineList events={data.timeline} />
              </Panel>
            </div>
          ) : null}
        </div>
      )}
      {data.events ? <EventLog events={data.events} decisions={data.decisions ?? []} arrivals={data.arrivals ?? []} /> : null}
    </div>
  );
}
