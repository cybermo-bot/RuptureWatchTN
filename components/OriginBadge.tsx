import type { Origin } from '@/lib/signal';
import { t } from '@/lib/i18n';

// Every observation shown on screen carries its origin. Simulated data never appears without this badge.

const STYLE: Record<Origin, string> = {
  official_source: 'border-ink text-ink',
  tester: 'border-brand text-brand',
  simulated: 'border-dashed border-ink-muted text-ink-muted',
};

export function OriginBadge({ origin, className = '' }: { origin: Origin; className?: string }) {
  const word = t(`core.origin.${origin}`);
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 font-mono text-xs leading-5 tracking-wide uppercase ${STYLE[origin]} ${className}`}
      title={t('core.origin.label', { origin: word })}
    >
      <span className="sr-only">{t('core.origin.label', { origin: word })}</span>
      <span aria-hidden="true">{word}</span>
    </span>
  );
}
