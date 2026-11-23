import { redirect } from 'next/navigation';
import { TesterInvitation } from '@/components/institutions/TesterInvitation';
import { getCurrentSession } from '@/lib/auth/session';
import { t } from '@/lib/i18n';

export const metadata = { robots: { index: false, follow: false } };

// The same tester invitation as the ministry's, from the Ordre's space.
export default async function OrderInvitationPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  if (session.organisation.type !== 'pharmacists_order') redirect('/');
  return <TesterInvitation backHref="/ordre" intro={t('core.order.inviteIntro')} />;
}
