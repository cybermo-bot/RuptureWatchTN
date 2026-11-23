import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SignalsDashboard } from '@/components/coordination/SignalsDashboard';
import { LiveRefresh } from '@/components/LiveRefresh';
import { OriginBadge } from '@/components/OriginBadge';
import { PageHeader } from '@/components/PageHeader';
import { listDecisions } from '@/lib/allocation/decisions';
import { getCurrentSession } from '@/lib/auth/session';
import { loadDashboard, selectedParam } from '@/lib/coordination/dashboard';
import { HOME_BY_TYPE } from '@/lib/demo/roles';
import { createUserClient } from '@/lib/db/server';
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
    listDecisions(supabase, null, 5),
  ]);
  // "Levée" is no longer a shortage to act on: the wholesaler sees watch, likely and confirmed.
  const signals = loaded.signals.filter((s) => s.level !== 'cleared');
  const data = loaded.selected?.level === 'cleared' ? { ...loaded, signals, selected: null } : { ...loaded, signals };
  const selected = data.selected;
  const canSplit = selected?.level === 'likely' || selected?.level === 'confirmed';

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        meta={session.organisation.displayName}
        title={t('core.space.titles.wholesaler')}
        description={t('wholesaler.home.intro')}
      />
      <LiveRefresh table="signals" fallbackMs={4_000} />

      {selected ? (
        <section aria-labelledby="repartition-equitable" className="flex flex-col gap-3 border-y border-line bg-surface-subtle px-4 py-5">
          <h2 id="repartition-equitable" className="font-semibold text-ink">
            {t('wholesaler.home.splitTitle')}
          </h2>
          {canSplit ? (
            <>
              <p className="text-ink">
                {t('wholesaler.home.splitFor', { molecule: selected.molecule_name, level: t(`core.levels.${selected.level}`) })}
              </p>
              <Link
                href={`/grossiste/repartition/${selected.molecule_id}`}
                className="inline-flex min-h-12 w-fit items-center rounded-md bg-brand px-5 font-medium text-white no-underline hover:opacity-90"
              >
                {t('wholesaler.home.splitAction')}
              </Link>
            </>
          ) : (
            <p className="text-ink-muted">
              {t('wholesaler.home.splitNotYet', { molecule: selected.molecule_name, level: t(`core.levels.${selected.level}`) })}
            </p>
          )}
        </section>
      ) : null}

      <SignalsDashboard data={data} basePath="/grossiste" />

      <section aria-labelledby="mes-decisions" className="flex flex-col gap-3">
        <h2 id="mes-decisions" className="text-lg font-semibold text-ink">
          {t('wholesaler.home.decisionsTitle')}
        </h2>
        {decisions === null ? (
          <p className="text-sm text-ink-muted">{t('wholesaler.home.decisionsUnavailable')}</p>
        ) : decisions.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('wholesaler.home.decisionsEmpty')}</p>
        ) : (
          <ul className="hairline-list border-y border-line text-sm">
            {decisions.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                <span className="text-ink-muted tabular-nums">{formatDate(d.decided_at)}</span>
                <Link href={`/grossiste/repartition/${d.molecule_id}`} className="font-medium">
                  {d.molecule_name}
                </Link>
                <span className="text-ink">
                  {d.applied ? t('wholesaler.split.historyApplied') : t('wholesaler.split.historyRejected')}
                </span>
                <OriginBadge origin={d.origin} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
