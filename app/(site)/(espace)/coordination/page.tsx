import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SignalsDashboard } from '@/components/coordination/SignalsDashboard';
import { LiveRefresh } from '@/components/LiveRefresh';
import { PageHeader } from '@/components/PageHeader';
import { getCurrentSession } from '@/lib/auth/session';
import { listDecisions } from '@/lib/allocation/decisions';
import { loadDashboard, selectedParam } from '@/lib/coordination/dashboard';
import { HOME_BY_TYPE } from '@/lib/demo/roles';
import { createUserClient } from '@/lib/db/server';
import { t } from '@/lib/i18n';

// The coordination space: every molecule with an active level, most serious first; for the
// selected one its map, patients' demand, foreign notices and timeline; the event log; export.
// Refreshes live when a signal changes (Realtime, or polling every 4 seconds).
export default async function CoordinationHome({ searchParams }: PageProps<'/coordination'>) {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  if (session.organisation.type !== 'coordinator') redirect(HOME_BY_TYPE[session.organisation.type]);

  const { m } = await searchParams;
  const supabase = await createUserClient();
  const [data, decisions] = await Promise.all([
    loadDashboard(supabase, selectedParam(m), { withEventLog: true }),
    // Wholesalers' decisions: a coordinator reads all of them (row-level security). A failure hides them only.
    listDecisions(supabase, null, 50).catch((error) => {
      console.error('allocation decisions failed', error instanceof Error ? error.message : error);
      return null;
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        meta={t('core.orgTypes.coordinator')}
        title={t('core.space.titles.coordinator')}
        description={t('core.coordination.intro')}
        actions={
          <>
            <Link href="/coordination/export" className="flex min-h-12 items-center text-sm font-medium">
              {t('core.coordination.exportLink')}
            </Link>
            <Link href="/coordination/invitation" className="flex min-h-12 items-center text-sm font-medium">
              {t('core.coordination.invite')}
            </Link>
          </>
        }
      />
      <LiveRefresh table="signals" fallbackMs={4_000} />
      <SignalsDashboard data={{ ...data, decisions }} basePath="/coordination" />
    </div>
  );
}
