import { redirect } from 'next/navigation';
import { ConsoleShell } from '@/components/console/ConsoleShell';
import { getCurrentSession } from '@/lib/auth/session';
import { countUnreadAlerts } from '@/lib/pharmacy/data';
import { countOpenRequests } from '@/lib/pharmacy/requests';

export default async function SpaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');

  const pharmacy = session.organisation.type === 'pharmacy';
  const [alerts, requests] = pharmacy
    ? await Promise.all([countUnreadAlerts().catch(() => 0), countOpenRequests().catch(() => 0)])
    : [0, 0];
  return (
    <ConsoleShell session={session} badges={{ alerts, requests }}>
      {children}
    </ConsoleShell>
  );
}
