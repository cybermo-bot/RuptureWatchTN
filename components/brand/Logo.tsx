import { MARK_PATH, MARK_STROKE } from '@/lib/og/mark';
import { t } from '@/lib/i18n';

export function LogoMark({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="3 3 26 26" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <path d={MARK_PATH} fill="none" stroke="currentColor" strokeWidth={MARK_STROKE} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Mark and wordmark on light and dark surfaces. */
export function Logo({ tone = 'light', compact = false }: { tone?: 'light' | 'dark'; compact?: boolean }) {
  const dark = tone === 'dark';
  return (
    <span className="inline-flex items-center gap-2" dir="ltr">
      <LogoMark
        size={compact ? 24 : 28}
        className={dark ? 'text-white' : 'text-brand'}
      />
      <span className="inline-flex items-baseline gap-1.5">
        <span className={`text-[1.0625rem] leading-none font-semibold tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
          {t('core.app.wordmark')}
        </span>
        <span className={`text-[0.6875rem] font-semibold tracking-[0.08em] ${dark ? 'text-[var(--sidebar-muted)]' : 'text-ink-muted'}`}>{t('core.app.wordmarkCountry')}</span>
      </span>
    </span>
  );
}
