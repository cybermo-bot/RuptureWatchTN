import { t } from '@/lib/i18n';

// Days of cover by governorate, before and after the split, as paired bars. The table next to it
// carries the same numbers: the bars are a picture, hidden from screen readers.

export interface CoverRow {
  code: string;
  name: string;
  before: number | null;
  after: number | null;
}

export function CoverChart({ rows, maxDays }: { rows: CoverRow[]; maxDays: number }) {
  const pct = (d: number | null) => `${Math.min(100, Math.max(0, ((d ?? 0) / maxDays) * 100))}%`;
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex flex-col gap-1">
        <span className="font-semibold text-ink">{t('wholesaler.split.chartTitle')}</span>
        <span className="text-sm text-ink-muted">{t('wholesaler.split.chartNote', { days: maxDays })}</span>
        <span aria-hidden="true" className="flex gap-4 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-6 rounded-sm bg-line" />
            {t('wholesaler.split.chartBefore')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-6 rounded-sm bg-brand" />
            {t('wholesaler.split.chartAfter')}
          </span>
        </span>
      </figcaption>
      <ul aria-hidden="true" className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.code} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 text-sm">
            <span className="truncate text-ink">{r.name}</span>
            <span className="flex flex-col gap-0.5">
              <span className="block h-2 rounded-sm bg-line" style={{ width: pct(r.before) }} />
              <span className="block h-2 rounded-sm bg-brand" style={{ width: pct(r.after) }} />
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
