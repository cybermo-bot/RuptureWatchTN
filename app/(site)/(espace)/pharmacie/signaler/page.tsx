import Link from 'next/link';
import { LevelBadge } from '@/components/LevelBadge';
import { MoleculeSearch } from '@/components/MoleculeSearch';
import { t } from '@/lib/i18n';
import { getFollowed } from '@/lib/pharmacy/data';

// Tap one: pick the medicine. Followed molecules first, as large rows; search below.
export default async function ReportPick() {
  const followed = await getFollowed();
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link href="/pharmacie" className="text-sm text-ink-muted">
          {t('core.molecule.backHome')}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t('core.report.title')}</h1>
        <p className="text-lg text-ink">{t('core.report.pickTitle')}</p>
      </header>

      {followed.length > 0 ? (
        <section aria-labelledby="choix-suivis" className="flex flex-col gap-2">
          <h2 id="choix-suivis" className="text-sm font-medium text-ink-muted">
            {t('core.report.pickFollowed')}
          </h2>
          <ul className="hairline-list border-y border-line">
            {followed.map((m) => (
              <li key={m.moleculeId}>
                <Link
                  href={`/pharmacie/signaler/${m.moleculeId}`}
                  className="flex min-h-16 items-center justify-between gap-4 py-3 no-underline hover:bg-surface-subtle"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-lg font-medium break-words text-ink">{m.name}</span>
                    <LevelBadge level={m.signal?.level ?? 'none'} />
                  </span>
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0 text-ink-muted rtl:-scale-x-100">
                    <path d="M6 3.5 L10.5 8 L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="choix-autre" className="flex flex-col gap-3">
        <h2 id="choix-autre" className="text-sm font-medium text-ink-muted">
          {t('core.report.pickOther')}
        </h2>
        <MoleculeSearch mode="report" />
      </section>
    </div>
  );
}
