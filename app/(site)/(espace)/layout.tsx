import { redirect } from 'next/navigation';
import { ConsoleShell } from '@/components/console/ConsoleShell';
import { getCurrentSession } from '@/lib/auth/session';
import { countUnreadAlerts } from '@/lib/pharmacy/data';

export default async function SpaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');

  const alerts = session.organisation.type === 'pharmacy' ? await countUnreadAlerts().catch(() => 0) : 0;
  return (
    <ConsoleShell session={session} badges={{ alerts }}>
      {children}
    </ConsoleShell>
  );
}
