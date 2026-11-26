import type { ReactNode } from 'react';
import { LevelBadge } from '@/components/LevelBadge';
import type { Level } from '@/lib/signal';

// The one panel per screen (rw-design-system): powder blue, --radius-md, a large level badge, one
// sentence, the origin badge and the not-official line, once. Public pages pass their own badge
// (French or Arabic); professional pages pass the level.
export function StatusCard({
  headingId,
  level,
  badge,
  origin,
  sentence,
  disclaimer,
  eyebrow,
  children,
  className = '',
}: {
  headingId: string;
  level?: Level;
  /** Replaces the French LevelBadge (public pages, Arabic). */
  badge?: ReactNode;
  origin?: ReactNode;
  sentence: ReactNode;
  disclaimer: ReactNode;
  eyebrow?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={headingId} data-status-card className={`flex flex-col gap-3 rounded-md bg-powder-blue p-4 sm:p-5 ${className}`}>
      {eyebrow ? <p className="eyebrow text-ink-muted">{eyebrow}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        {badge ?? (level ? <LevelBadge level={level} size="lg" /> : null)}
        {origin}
      </div>
      <h2 id={headingId} className="title-3 max-w-[60ch] text-ink">
        {sentence}
      </h2>
      {children}
      <p className="text-sm text-ink-muted">{disclaimer}</p>
    </section>
  );
}
