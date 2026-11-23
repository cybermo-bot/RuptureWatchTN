import { MoleculeSearch } from '@/components/MoleculeSearch';
import { MoleculeRow } from '@/components/pharmacy/MoleculeRow';
import { ReportProgress } from '@/components/pharmacy/ReportProgress';
import { t } from '@/lib/i18n';
import { getFollowed } from '@/lib/pharmacy/data';

// Tap one: pick the medicine. Followed molecules first, as large rows; search below.
export default async function ReportPick() {
  const followed = await getFollowed();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-4">
        <ReportProgress step={1} />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('core.report.pickTitle')}</h1>
          <p className="text-ink-muted">{t('core.report.title')}</p>
        </div>
      </header>

      {followed.length > 0 ? (
        <section aria-labelledby="choix-suivis" className="flex flex-col gap-2">
          <h2 id="choix-suivis" className="text-sm font-medium text-ink-muted">
            {t('core.report.pickFollowed')}
          </h2>
          <ul className="panel hairline-list overflow-hidden">
            {followed.map((m) => (
              <li key={m.moleculeId}>
                <MoleculeRow molecule={m} href={`/pharmacie/signaler/${m.moleculeId}`} large />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="choix-autre" className="flex flex-col gap-2">
        <h2 id="choix-autre" className="text-sm font-medium text-ink-muted">
          {t('core.report.pickOther')}
        </h2>
        <MoleculeSearch mode="report" />
      </section>
    </div>
  );
}
