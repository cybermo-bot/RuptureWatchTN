import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/EmptyState';
import { LevelBadge } from '@/components/LevelBadge';
import { LiveRefresh } from '@/components/LiveRefresh';
import { MoleculeSearch } from '@/components/MoleculeSearch';
import { PharmacyHeader } from '@/components/PharmacyHeader';
import { getCurrentSession } from '@/lib/auth/session';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { getFollowed } from '@/lib/pharmacy/data';

export default async function PharmacyHome() {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  const followed = await getFollowed();

  return (
    <div className="flex flex-col gap-8">
      <PharmacyHeader session={session} active="followed" />
      <LiveRefresh table="alerts" filter={`organisation_id=eq.${session.organisation.id}`} fallbackMs={15_000} />

      <section aria-labelledby="suivis" className="flex flex-col gap-4">
        <h2 id="suivis" className="sr-only">
          {t('core.pharmacy.tabs.followed')}
        </h2>
        {followed.length === 0 ? (
          <EmptyState title={t('core.pharmacy.followedEmptyTitle')} body={t('core.pharmacy.followedEmptyBody')} />
        ) : (
          <ul className="hairline-list border-b border-line">
            {followed.map((m) => (
              <li key={m.moleculeId}>
                <Link
                  href={`/pharmacie/molecule/${m.moleculeId}`}
                  aria-label={t('core.pharmacy.openMolecule', { molecule: m.name })}
                  className="flex min-h-16 items-center justify-between gap-4 py-3 no-underline hover:bg-surface-subtle"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium break-words text-ink">{m.name}</span>
                    <span className="flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
                      <LevelBadge level={m.signal?.level ?? 'none'} />
                      {m.signal && m.signal.level !== 'none' ? (
                        <span>{t('core.pharmacy.since', { date: formatDate(m.signal.since) })}</span>
                      ) : null}
                    </span>
                  </span>
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0 text-ink-muted rtl:-scale-x-100">
                    <path d="M6 3.5 L10.5 8 L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ajouter" className="flex flex-col gap-4">
        <h2 id="ajouter" className="text-lg font-semibold text-ink">
          {t('core.pharmacy.addTitle')}
        </h2>
        <MoleculeSearch mode="follow" followedIds={followed.map((m) => m.moleculeId)} />
      </section>
    </div>
  );
}
