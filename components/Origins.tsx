import { OriginBadge } from '@/components/OriginBadge';
import { t } from '@/lib/i18n';
import type { Origin } from '@/lib/signal';

/** The origins of the data behind a level, as badges (rule 4). Nothing when there are none. */
export function Origins({ origins }: { origins: Origin[] | undefined }) {
  if (!origins?.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="sr-only">{t('core.coordination.originsLabel')}</span>
      {origins.map((o) => (
        <OriginBadge key={o} origin={o} />
      ))}
    </span>
  );
}
