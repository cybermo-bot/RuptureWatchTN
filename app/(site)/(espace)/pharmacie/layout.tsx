import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth/session';
import { HOME_BY_TYPE } from '@/lib/demo/roles';

// Every page under /pharmacie is for a pharmacy session only.
export default async function PharmacyLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  if (session.organisation.type !== 'pharmacy') redirect(HOME_BY_TYPE[session.organisation.type]);
  return children;
}
