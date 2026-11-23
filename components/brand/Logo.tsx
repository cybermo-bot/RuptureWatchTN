import { MARK_DOT, MARK_RING, MARK_STROKE } from '@/lib/og/mark';
import { t } from '@/lib/i18n';

// The mark alone, in the current colour (or with the dot in the brand tint on dark surfaces).
export function LogoMark({ size = 24, className = '', dotClassName = '' }: { size?: number; className?: string; dotClassName?: string }) {
  return (
    <svg width={size} height={size} viewBox="4 4 24 24" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <path d={MARK_RING} fill="none" stroke="currentColor" strokeWidth={MARK_STROKE} strokeLinecap="round" />
      <circle cx={MARK_DOT.cx} cy={MARK_DOT.cy} r={MARK_DOT.r} fill="currentColor" className={dotClassName} />
    </svg>
  );
}

/** Mark and wordmark. `tone` is the surface it sits on. Its accessible name is the product's full title. */
export function Logo({ tone = 'light', compact = false }: { tone?: 'light' | 'dark'; compact?: boolean }) {
  const dark = tone === 'dark';
  return (
    <span className="inline-flex items-center gap-2.5" dir="ltr">
      <LogoMark
        size={compact ? 22 : 26}
        className={dark ? 'text-white' : 'text-brand'}
        dotClassName={dark ? 'fill-[var(--sidebar-accent)]' : ''}
      />
      <span className="inline-flex items-baseline gap-1">
        <span className={`text-[1.0625rem] font-semibold tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
          {t('core.app.wordmark')}
        </span>
        <span className={`font-mono text-sm ${dark ? 'text-[var(--sidebar-muted)]' : 'text-ink-muted'}`}>{t('core.app.wordmarkCountry')}</span>
      </span>
    </span>
  );
}
