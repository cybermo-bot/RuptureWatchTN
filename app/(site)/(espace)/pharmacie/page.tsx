import { ChevronDown, Inbox, Send } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { LevelChangeWatcher } from '@/components/live/LevelChangeWatcher';
import { LiveRefresh } from '@/components/LiveRefresh';
import { MoleculeSearch } from '@/components/MoleculeSearch';
import { PageHeader } from '@/components/PageHeader';
import { MoleculeRow } from '@/components/pharmacy/MoleculeRow';
import { RequestList } from '@/components/pharmacy/RequestList';
import { RequestWatcher } from '@/components/pharmacy/RequestWatcher';
import { AutoRefresh } from '@/components/public/AutoRefresh';
import { Section } from '@/components/ui/Section';
import { getCurrentSession } from '@/lib/auth/session';
import { showcaseLocked } from '@/lib/demo/showcase';
import { formatWeekday } from '@/lib/format';
import { t } from '@/lib/i18n';
import { getAlerts, getFollowed, type FollowedMolecule } from '@/lib/pharmacy/data';
import { getOpenRequests } from '@/lib/pharmacy/requests';
import { todayOrder } from '@/lib/pharmacy/today';

/** Waiting requests answered from the home; the rest wait on « Demandes ». */
const REQUESTS_HERE = 2;

// « Aujourd'hui » (pilot-4 step 4): what needs the pharmacist now, in this order. Patients
// waiting (answered in one tap from here), then the followed medicines with their levels, the
// changed ones first, then the report action. The medicines without any signal fold away.
export default async function PharmacyToday() {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  const [followed, requests, alerts] = await Promise.all([
    getFollowed(),
    getOpenRequests().catch(() => []),
    getAlerts().catch(() => []),
  ]);

  // « nouveau »: an alert this pharmacy has not opened yet (its level changed since it looked).
  const unread = new Set(alerts.filter((a) => a.readAt === null).map((a) => a.moleculeId));
  const { active, quiet } = todayOrder(followed, unread);
  const withLevel = followed.filter((m) => m.signal && m.signal.level !== 'none').length;

  const row = (m: FollowedMolecule) => (
    <li key={m.moleculeId}>
      <MoleculeRow
        molecule={m}
        href={`/pharmacie/molecule/${m.moleculeId}`}
        showcase={showcaseLocked(session.organisation.id, m.name)}
        isNew={unread.has(m.moleculeId)}
      />
    </li>
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <LiveRefresh table="alerts" filter={`organisation_id=eq.${session.organisation.id}`} fallbackMs={15_000} />
      <AutoRefresh seconds={15} />
      <LevelChangeWatcher items={followed.map((m) => ({ key: m.moleculeId, name: m.name, level: m.signal?.level ?? 'none' }))} />
      <RequestWatcher count={requests.length} />

      <PageHeader eyebrow={formatWeekday(new Date())} title={t('core.pharmacy.today.title')} />

      {requests.length > 0 ? (
        <Section
          id="patients"
          title={requests.length === 1 ? t('core.requests.homeStripOne') : t('core.requests.homeStrip', { count: requests.length })}
          link={
            requests.length > REQUESTS_HERE ? (
              <Link href="/pharmacie/demandes" className="inline-flex min-h-12 items-center text-brand">
                {t('core.pharmacy.today.allRequests', { count: requests.length })}
              </Link>
            ) : null
          }
        >
          <RequestList requests={requests.slice(0, REQUESTS_HERE)} />
        </Section>
      ) : (
        <p className="flex items-center gap-2 text-ink-muted">
          <Inbox size={20} aria-hidden="true" className="shrink-0" />
          {t('core.pharmacy.today.noRequests')}
        </p>
      )}

      <Section id="suivis" title={t('core.pharmacy.homeTitle')}>
        {followed.length > 0 ? (
          <p className="-mt-1 text-sm text-ink-muted">
            {followed.length === 1 ? t('core.pharmacy.followedCountOne') : t('core.pharmacy.followedCount', { count: followed.length })}
            {withLevel > 0 ? `, ${t('core.pharmacy.levelsCount', { count: withLevel })}` : ''}
          </p>
        ) : null}
        {followed.length === 0 ? (
          <EmptyState afterRule title={t('core.pharmacy.followedEmptyTitle')} body={t('core.pharmacy.followedEmptyBody')} />
        ) : active.length === 0 ? (
          <ul className="hairline-list border-y border-line">{quiet.map(row)}</ul>
        ) : (
          <>
            <ul className="hairline-list border-y border-line">{active.map(row)}</ul>
            {quiet.length > 0 ? (
              <details className="group">
                <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-brand [&::-webkit-details-marker]:hidden">
                  <ChevronDown size={20} aria-hidden="true" className="transition-transform duration-(--dur-fast) group-open:rotate-180" />
                  {quiet.length === 1 ? t('core.pharmacy.today.quietOne') : t('core.pharmacy.today.quiet', { count: quiet.length })}
                </summary>
                <ul className="hairline-list border-y border-line">{quiet.map(row)}</ul>
              </details>
            ) : null}
          </>
        )}
      </Section>

      <ButtonLink href="/pharmacie/signaler" className="min-h-16 w-full text-lg">
        <Send size={24} aria-hidden="true" />
        {t('core.pharmacy.reportCta')}
      </ButtonLink>

      <section aria-labelledby="ajouter" className="flex flex-col gap-3">
        <h2 id="ajouter" className="title-3 text-ink">
          {t('core.pharmacy.searchTitle')}
        </h2>
        <MoleculeSearch mode="follow" followedIds={followed.map((m) => m.moleculeId)} />
      </section>
    </div>
  );
}
