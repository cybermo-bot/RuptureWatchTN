import Link from 'next/link';
import { LevelBadge } from '@/components/LevelBadge';
import { RuleDetails } from '@/components/LevelExplanation';
import { Origins } from '@/components/Origins';
import { formatDate, formatTime } from '@/lib/format';
import { freshness } from '@/lib/freshness';
import { t } from '@/lib/i18n';
import { DEFAULT_PARAMS } from '@/lib/signal';
import { changeCounts } from '@/lib/signals/recent';
import type { EventRow } from '@/lib/signals/views';

// The last level changes, newest first (part 8, item 7): the medicine, the change as shape and
// word, when, the pharmacies and governorates as shown ("<3" kept), the rule and the origins.
// Each row opens the medicine. Never a pharmacy.

const DAYS = DEFAULT_PARAMS.confirmWindowDays;

function countsText(e: EventRow): string {
  const c = changeCounts(e.evidence);
  switch (c.key) {
    case 'few':
      return t('core.recent.countsFew', { days: DAYS });
    case 'none':
      return t('core.recent.countsNone', { days: DAYS });
    case 'oneGovernorate':
      return t('core.recent.countsOneGovernorate', {
        pharmacies: c.pharmacies,
        days: DAYS,
      });
    case 'governorates':
      return t('core.recent.counts', {
        pharmacies: c.pharmacies,
        governorates: c.governorates,
        days: DAYS,
      });
  }
}

function agoText(at: string, now: Date): string {
  const f = freshness(at, now);
  if (!f) return formatDate(at);
  return f.unit === 'now' ? t('core.recent.ago.now') : t(`core.recent.ago.${f.unit}`, { n: f.n });
}

export function RecentChangesList({
  events,
  href,
  now = new Date(),
}: {
  events: EventRow[];
  href: (moleculeId: string) => string;
  now?: Date;
}) {
  if (events.length === 0) return <p className="px-4 py-5 text-sm text-ink-muted">{t('core.recent.empty')}</p>;
  return (
    <ol className="hairline-list">
      {events.map((e) => (
        <li key={e.id}>
          <Link
            href={href(e.molecule_id)}
            className="flex min-h-12 flex-col gap-1 px-4 py-3 no-underline transition-colors duration-(--dur-fast) hover:bg-surface-subtle"
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 font-medium break-words text-ink">{e.molecule_name}</span>
              <time
                dateTime={e.at}
                title={t('core.common.dateAt', {
                  date: formatDate(e.at),
                  time: formatTime(e.at),
                })}
                className="shrink-0 text-xs whitespace-nowrap text-ink-muted tabular-nums"
              >
                {agoText(e.at, now)}
              </time>
            </span>
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <LevelBadge level={e.from_level} className="font-normal text-ink-muted" />
              <span aria-hidden="true" className="text-ink-muted">
                {'→'}
              </span>
              <span className="sr-only">{t('core.coordination.changeTo')}</span>
              <LevelBadge level={e.to_level} />
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
              <span>{countsText(e)}</span>
              <Origins origins={e.evidence.origins} />
            </span>
          </Link>
          <div className="px-4"><RuleDetails rule={e.rule} /></div>
        </li>
      ))}
    </ol>
  );
}
