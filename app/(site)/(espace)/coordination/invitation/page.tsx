import { redirect } from 'next/navigation';
import { TesterInvitation } from '@/components/institutions/TesterInvitation';
import { getCurrentSession } from '@/lib/auth/session';

export const metadata = { robots: { index: false, follow: false } };

// The tester invite link as a QR code. The ministry's space; the Ordre has the same page.
export default async function InvitationPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  if (session.organisation.type !== 'coordinator') redirect('/');
  return <TesterInvitation backHref="/coordination" origin={session.organisation.origin} />;
}
