import type { Origin } from '@/lib/signal';
import { t as frenchT, translator, type Locale } from '@/lib/i18n';

// Every observation shown on screen carries its origin. Simulated data never appears without this badge.

const STYLE: Record<'light' | 'dark', Record<Origin, string>> = {
  light: {
    official_source: 'border-ink text-ink',
    tester: 'border-brand text-brand',
    simulated: 'border-dashed border-ink-muted text-ink-muted',
  },
  dark: {
    official_source: 'border-white text-white',
    tester: 'border-sidebar-accent text-sidebar-accent',
    simulated: 'border-dashed border-sidebar-muted text-sidebar-muted',
  },
};

export function OriginBadge({
  origin,
  className = '',
  tone = 'light',
  locale,
}: {
  origin: Origin;
  className?: string;
  tone?: 'light' | 'dark';
  /** On the public pages: the visitor's language (public.origin texts). Otherwise French. */
  locale?: Locale;
}) {
  const t = locale ? translator(locale) : frenchT;
  const ns = locale ? 'public' : 'core';
  const word = t(`${ns}.origin.${origin}`);
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 font-mono text-xs leading-5 tracking-wide uppercase ${STYLE[tone][origin]} ${className}`}
      title={t(`${ns}.origin.label`, { origin: word })}
    >
      <span className="sr-only">{t(`${ns}.origin.label`, { origin: word })}</span>
      <span aria-hidden="true">{word}</span>
    </span>
  );
}
