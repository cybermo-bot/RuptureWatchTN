import { redirect } from 'next/navigation';
import { ButtonLink } from '@/components/Button';
import { Panel } from '@/components/console/Panel';
import { FIGURE_DAYS, levelFigures, SignalsDashboard } from '@/components/coordination/SignalsDashboard';
import { LiveRefresh } from '@/components/LiveRefresh';
import { OriginBadge } from '@/components/OriginBadge';
import { PageHeader } from '@/components/PageHeader';
import { List, ListRow } from '@/components/ui/ListRow';
import { listDecisions } from '@/lib/allocation/decisions';
import { getCurrentSession } from '@/lib/auth/session';
import { lastDays } from '@/lib/charts/series';
import { loadDashboard, selectedParam } from '@/lib/coordination/dashboard';
import { createUserClient } from '@/lib/db/server';
import { HOME_BY_TYPE } from '@/lib/demo/roles';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';

// Track D: the wholesaler space. The same list, map and demand as the coordination space, read
// through the wholesaler's own access rules (counts by governorate only, '<3' below 3), limited
// to "sous surveillance" and above. For a molecule at "probable" or "confirmée", the fair split.
export default async function WholesalerHome({ searchParams }: PageProps<'/grossiste'>) {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  if (session.organisation.type !== 'wholesaler') redirect(HOME_BY_TYPE[session.organisation.type]);

  const { m } = await searchParams;
  const supabase = await createUserClient();
  const [loaded, decisions] = await Promise.all([
    loadDashboard(supabase, selectedParam(m), { withEventLog: false }),
    listDecisions(supabase, null, 100),
  ]);
  // "Levée" is no longer a shortage to act on: the wholesaler sees watch, likely and confirmed.
  const signals = loaded.signals.filter((s) => s.level !== 'cleared');
  const data = loaded.selected?.level === 'cleared' ? { ...loaded, signals, selected: null } : { ...loaded, signals };
  const selected = data.selected;
  const canSplit = selected?.level === 'likely' || selected?.level === 'confirmed';

  // Key figures: the three levels a wholesaler acts on, and its own split decisions per day.
  const days = lastDays(FIGURE_DAYS);
  const decisionSeries = days.map(
    ({ start, end }) => (decisions ?? []).filter((d) => new Date(d.decided_at) >= start && new Date(d.decided_at) < end).length,
  );
  const figures = [
    ...levelFigures(signals, data.history, ['confirmed', 'likely', 'watch']),
    {
      key: 'decisions',
      label: t('wholesaler.home.figureDecisions', { days: FIGURE_DAYS }),
      value: String(decisionSeries.reduce((a, b) => a + b, 0)),
      series: decisionSeries,
    },
  ];

  const action = selected && canSplit ? (
    <ButtonLink href={`/grossiste/repartition/${selected.molecule_id}`}>{t('core.decisionDemo.allocation')}</ButtonLink>
  ) : selected ? (
    <p className="text-ink-muted">{t('wholesaler.home.splitNotYet', { molecule: selected.molecule_name, level: t(`core.levels.${selected.level}`) })}</p>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('core.space.titles.wholesaler')} description={t('wholesaler.home.intro')} />
      <LiveRefresh table="signals" fallbackMs={4_000} />

      <SignalsDashboard data={data} basePath="/grossiste" figures={figures} decisionAction={action} />

      <Panel title={t('wholesaler.home.decisionsTitle')} titleId="mes-decisions" bodyClassName="">
        {decisions === null ? (
          <p className="p-4 text-sm text-ink-muted">{t('wholesaler.home.decisionsUnavailable')}</p>
        ) : decisions.length === 0 ? (
          <p className="p-4 text-sm text-ink-muted">{t('wholesaler.home.decisionsEmpty')}</p>
        ) : (
          <List className="border-y-0">
            {decisions.slice(0, 5).map((d) => (
              <ListRow
                key={d.id}
                href={`/grossiste/repartition/${d.molecule_id}`}
                title={d.molecule_name}
                meta={
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="tabular-nums">{formatDate(d.decided_at)}</span>
                    <span>{d.applied ? t('wholesaler.split.historyApplied') : t('wholesaler.split.historyRejected')}</span>
                    <OriginBadge origin={d.origin} />
                  </span>
                }
              />
            ))}
          </List>
        )}
      </Panel>
    </div>
  );
}
