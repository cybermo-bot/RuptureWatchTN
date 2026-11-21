import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { getCurrentSession } from '@/lib/auth/session';
import { HOME_BY_TYPE, type OrganisationType } from '@/lib/demo/roles';
import { t } from '@/lib/i18n';

/**
 * Landing page of a role's space. Session 1 only shows who is signed in;
 * the role's screens arrive in later sessions.
 */
export async function SpacePage({ type }: { type: OrganisationType }) {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  if (session.organisation.type !== type) redirect(HOME_BY_TYPE[session.organisation.type]);

  const { organisation } = session;
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        meta={t(`orgTypes.${organisation.type}`)}
        title={t(`space.titles.${organisation.type}`)}
        description={
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pt-1">
            <dt>{t('space.organisation')}</dt>
            <dd className="text-ink">{organisation.displayName}</dd>
            <dt>{t('space.governorate')}</dt>
            <dd className="text-ink">
              {organisation.governorateName ?? organisation.governorateCode}{' '}
              <span className="font-mono text-sm text-ink-muted">{organisation.governorateCode}</span>
            </dd>
          </dl>
        }
      />
      <EmptyState title={t('space.emptyTitle')} body={t('space.emptyBody')} />
    </div>
  );
}
