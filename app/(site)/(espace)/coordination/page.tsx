import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ButtonLink } from '@/components/Button';
import { DemandChart, NationalMapPanel, SourcesAndNews } from '@/components/coordination/MinistryPanels';
import { MedicineDecision } from '@/components/coordination/MedicineDecision';
import { DemandTable, SignalsDashboard } from '@/components/coordination/SignalsDashboard';
import { presentationsReported } from '@/lib/presentations/reported';
import { ArrivalLine } from '@/components/institutions/Lines';
import { LevelShape } from '@/components/LevelBadge';
import { Panel } from '@/components/console/Panel';
import { Tabs } from '@/components/ui/Tabs';
import { LiveRefresh } from '@/components/LiveRefresh';
import { PageHeader } from '@/components/PageHeader';
import { RecentChangesList } from '@/components/RecentChanges';
import { getCurrentSession } from '@/lib/auth/session';
import { selectedParam } from '@/lib/coordination/dashboard';
import { DEMAND_FIGURE_DAYS, levelParam, loadMinistry } from '@/lib/coordination/ministry';
import { createUserClient } from '@/lib/db/server';
import { HOME_BY_TYPE } from '@/lib/demo/roles';
import { t } from '@/lib/i18n';
import { DEFAULT_PARAMS } from '@/lib/signal';
import { RECENT_CHANGES } from '@/lib/signals/recent';
import { DEMAND_WINDOW_DAYS } from '@/lib/signals/views';

// The ministry's space (cellule nationale), designed for the Ministry of Health, never "used by":
// key figures, the national map by level, every molecule with a level in the ministry's order
// (level, then CNAM category, then fewer other brands), and for the selected one its map, charts,
// demand, notices and timeline; the decision log (levels, wholesalers' decisions, arrivals);
// the export and the "Note de situation". Refreshes live when a signal changes.
export default async function CoordinationHome({ searchParams }: PageProps<'/coordination'>) {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  if (session.organisation.type !== 'coordinator') redirect(HOME_BY_TYPE[session.organisation.type]);

  const { m, niveau, vue } = await searchParams;
  const view = vue === 'demande' || vue === 'journal' ? vue : 'signaux';
  const mapLevel = levelParam(niveau);
  const supabase = await createUserClient();
  const data = await loadMinistry(supabase, selectedParam(m), mapLevel);
  const selectedId = data.dashboard.selected?.molecule_id ?? null;
  const presentations = selectedId ? await presentationsReported(selectedId) : null;
  const priority = data.dashboard.signals[0];
  const keep = selectedId ? `m=${selectedId}` : '';
  const tabHref = (v: string) => `/coordination${v === 'signaux' ? (keep ? `?${keep}` : '') : `?${keep ? `${keep}&` : ''}vue=${v}`}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        meta={t('core.orgTypes.coordinator')}
        title={t('core.space.titles.coordinator')}
        description={t('core.ministry.intro')}
      />
      <LiveRefresh table="signals" fallbackMs={4_000} />
      <Panel title={t('core.decisionBlock.review')} titleId="a-examiner">
        {priority ? (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="flex min-w-0 flex-col gap-2">
              <h3 className="break-words text-xl font-semibold text-ink">
                <Link href={`/coordination?m=${priority.molecule_id}#detail`}>{priority.molecule_name}</Link>
              </h3>
              <MedicineDecision signal={priority} action={<ButtonLink href="/coordination/note">{t('core.ministry.noteLink')}</ButtonLink>} />
              <Link href="/coordination?vue=journal#journal-decisions" className="min-h-12 w-fit content-center text-sm">{t('core.decisionBlock.log')}</Link>
            </div>
          </div>
        ) : <p className="text-ink-muted">{t('core.coordination.emptyTitle')}</p>}
      </Panel>
      <SignalsDashboard
        data={data.dashboard}
        presentations={presentations}
        basePath="/coordination"
        facts={data.facts}
        extraFigures={[
          {
            key: 'vital',
            label: t('core.ministry.vitalConfirmed'),
            value: String(data.vitalConfirmed),
            marker: <LevelShape level="confirmed" size={16} />,
            series: data.vitalConfirmedSeries,
            colour: 'var(--level-confirmed)',
          },
          {
            key: 'governorates',
            label: t('core.ministry.governorates'),
            value: String(data.governoratesAffected),
            note: t('core.ministry.governoratesNote', { days: DEFAULT_PARAMS.confirmWindowDays }),
          },
          {
            key: 'unanswered',
            label: t('core.ministry.unanswered', { days: DEMAND_FIGURE_DAYS }),
            value: data.demand?.unanswered ?? '–',
            note: data.demand ? t('core.ministry.unansweredNote', { requests: data.demand.requests }) : undefined,
          },
        ]}
        overview={
          <div className="grid gap-5 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-7">
              <NationalMapPanel map={data.map} level={mapLevel} selectedId={selectedId} />
            </div>
            <Panel
              title={t('core.recent.title')}
              titleId="derniers-changements"
              description={t('core.recent.intro')}
              className="self-start xl:col-span-5"
              bodyClassName=""
            >
              <RecentChangesList events={data.dashboard.history.slice(0, RECENT_CHANGES)} href={(id) => `/coordination?m=${id}#detail`} />
            </Panel>
          </div>
        }
        detailNote={data.arrival ? <ArrivalLine arrival={data.arrival} /> : null}
        view={view}
        tabs={
          <Tabs
            label={t('core.coordination.tabs.label')}
            current={view}
            items={[
              { key: 'signaux', label: t('core.coordination.tabs.signals'), href: tabHref('signaux') },
              { key: 'demande', label: t('core.coordination.tabs.demand'), href: tabHref('demande') },
              { key: 'journal', label: t('core.coordination.tabs.journal'), href: tabHref('journal') },
            ]}
          />
        }
        demandView={
          <div className="grid gap-5 lg:grid-cols-2">
            {data.activity ? (
              <Panel title={t('core.coordination.tabs.demand')} titleId="demande-nationale">
                <DemandChart rows={data.activity} />
              </Panel>
            ) : null}
            {data.dashboard.selected ? (
              <Panel title={`${data.dashboard.selected.molecule_name} · ${t('core.coordination.demandTitle', { days: DEMAND_WINDOW_DAYS })}`} titleId="demande">
                <DemandTable demand={data.dashboard.demand} />
              </Panel>
            ) : null}
          </div>
        }
      />
      <SourcesAndNews />
    </div>
  );
}
