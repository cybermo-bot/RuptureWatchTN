import { FormPicture } from '@/components/medicine/FormPicture';
import { t } from '@/lib/i18n';
import { PRESENTATIONS_WINDOW_DAYS, type ReportedPresentation } from '@/lib/presentations/reported';
import { presentationText } from '@/lib/public/presentation';

// Pilot-3 item 2: under the level on the coordination and centrale panels, the products named
// on reports, most reported first, each with its count of pharmacies (<3 below 3). The level
// itself stays per molecule.
export function ReportedPresentations({ rows, id }: { rows: ReportedPresentation[]; id: string }) {
  return (
    <section aria-labelledby={id} data-presentations-reported className="flex w-full flex-col gap-2">
      <h3 id={id} className="text-sm font-medium text-ink">
        {t('core.presentations.title')}{' '}
        <span className="font-normal text-ink-muted">{t('core.presentations.window', { days: PRESENTATIONS_WINDOW_DAYS })}</span>
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('core.presentations.none')}</p>
      ) : (
        <ul className="hairline-list w-full border-y border-line">
          {rows.map((row) => (
            <li key={row.medicine_id} className="flex min-h-12 items-center gap-3 py-1.5">
              <FormPicture label={row.label} brand={row.brand} className="size-10" />
              <span className="min-w-0 flex-1 text-sm break-words text-ink">{presentationText(row, t)}</span>
              <span className="shrink-0 font-mono text-sm text-ink tabular-nums">{t('core.presentations.count', { n: String(row.pharmacies) })}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
