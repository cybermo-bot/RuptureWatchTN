import { Send } from 'lucide-react';
import { redirect } from 'next/navigation';
import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { LevelChangeWatcher } from '@/components/live/LevelChangeWatcher';
import { LiveRefresh } from '@/components/LiveRefresh';
import { MoleculeSearch } from '@/components/MoleculeSearch';
import { InstallHint } from '@/components/pharmacy/InstallHint';
import { MoleculeRow } from '@/components/pharmacy/MoleculeRow';
import { getCurrentSession } from '@/lib/auth/session';
import { t } from '@/lib/i18n';
import { getFollowed } from '@/lib/pharmacy/data';

// "Mes médicaments": the followed medicines with their level, the report action first.
export default async function PharmacyHome() {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  const followed = await getFollowed();
  const withLevel = followed.filter((m) => m.signal && m.signal.level !== 'none').length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <LiveRefresh table="alerts" filter={`organisation_id=eq.${session.organisation.id}`} fallbackMs={15_000} />
      <LevelChangeWatcher items={followed.map((m) => ({ key: m.moleculeId, name: m.name, level: m.signal?.level ?? 'none' }))} />

      <ButtonLink href="/pharmacie/signaler" className="min-h-14 w-full sm:text-lg">
        <Send size={20} aria-hidden="true" />
        {t('core.pharmacy.reportCta')}
      </ButtonLink>

      <InstallHint />

      <section aria-labelledby="suivis" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 id="suivis" className="text-2xl font-semibold tracking-tight text-ink">
            {t('core.pharmacy.homeTitle')}
          </h1>
          {followed.length > 0 ? (
            <p className="text-sm text-ink-muted">
              {followed.length === 1 ? t('core.pharmacy.followedCountOne') : t('core.pharmacy.followedCount', { count: followed.length })}
              {withLevel > 0 ? `, ${t('core.pharmacy.levelsCount', { count: withLevel })}` : ''}
            </p>
          ) : null}
        </div>
        {followed.length === 0 ? (
          <div className="panel px-4">
            <EmptyState afterRule title={t('core.pharmacy.followedEmptyTitle')} body={t('core.pharmacy.followedEmptyBody')} />
          </div>
        ) : (
          <ul className="panel hairline-list overflow-hidden">
            {followed.map((m) => (
              <li key={m.moleculeId}>
                <MoleculeRow molecule={m} href={`/pharmacie/molecule/${m.moleculeId}`} label={t('core.pharmacy.openMolecule', { molecule: m.name })} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ajouter" className="flex flex-col gap-3">
        <h2 id="ajouter" className="text-lg font-semibold text-ink">
          {t('core.pharmacy.searchTitle')}
        </h2>
        <MoleculeSearch mode="follow" followedIds={followed.map((m) => m.moleculeId)} />
      </section>
    </div>
  );
}
