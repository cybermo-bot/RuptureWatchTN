import { redirect } from 'next/navigation';
import { SignalsDashboard } from '@/components/coordination/SignalsDashboard';
import { LiveRefresh } from '@/components/LiveRefresh';
import { PageHeader } from '@/components/PageHeader';
import { getCurrentSession } from '@/lib/auth/session';
import { loadDashboard, selectedParam } from '@/lib/coordination/dashboard';
import { createUserClient } from '@/lib/db/server';
import { HOME_BY_TYPE } from '@/lib/demo/roles';
import { t } from '@/lib/i18n';

// The hospital pharmacy space: the same list and map as the coordination unit, read through the
// hospital pharmacy's own access rules, without the export and the full event log.
export default async function HospitalHome({ searchParams }: PageProps<'/hopital'>) {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  if (session.organisation.type !== 'hospital_pharmacy') redirect(HOME_BY_TYPE[session.organisation.type]);

  const { m } = await searchParams;
  const supabase = await createUserClient();
  const data = await loadDashboard(supabase, selectedParam(m), { withEventLog: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('core.space.titles.hospital_pharmacy')} description={t('core.coordination.hospitalIntro')} />
      <LiveRefresh table="signals" fallbackMs={4_000} />
      <SignalsDashboard data={data} basePath="/hopital" />
    </div>
  );
}
