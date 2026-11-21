import type { Level } from '@/lib/signal';
import { t } from '@/lib/i18n';

// A level is always a shape plus a word, never colour alone.
// watch: open circle. likely: half-filled circle. confirmed: filled circle. cleared: check mark.

const COLOR: Record<Level, string> = {
  none: 'text-ink-muted',
  watch: 'text-level-watch',
  likely: 'text-level-likely',
  confirmed: 'text-level-confirmed',
  cleared: 'text-level-cleared',
};

export function LevelShape({ level, size = 14 }: { level: Level; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    'aria-hidden': true as const,
    focusable: false as const,
    className: `shrink-0 ${COLOR[level]}`,
  };
  switch (level) {
    case 'watch':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'likely':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
          {/* Bottom half filled: reads the same in left-to-right and right-to-left layouts. */}
          <path d="M2 8 A6 6 0 0 0 14 8 Z" fill="currentColor" />
        </svg>
      );
    case 'confirmed':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
        </svg>
      );
    case 'cleared':
      return (
        <svg {...common}>
          <path
            d="M2.5 8.5 L6.5 12.5 L13.5 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M4 8 H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

export function LevelBadge({ level, className = '' }: { level: Level; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-ink ${className}`}
    >
      <LevelShape level={level} />
      <span>{t(`levels.${level}`)}</span>
    </span>
  );
}
