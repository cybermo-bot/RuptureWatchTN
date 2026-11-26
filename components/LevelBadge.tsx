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

/** On the petrol stage (home, scenario): lighter tints, 7:1 or more on petrol. */
const COLOR_ON_STAGE: Record<Level, string> = {
  none: 'text-on-stage-muted',
  watch: 'text-level-watch-on-stage',
  likely: 'text-level-likely-on-stage',
  confirmed: 'text-level-confirmed-on-stage',
  cleared: 'text-level-cleared-on-stage',
};

export type LevelTone = 'light' | 'stage';

export function LevelShape({ level, size = 14, tone = 'light' }: { level: Level; size?: number; tone?: LevelTone }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    'aria-hidden': true as const,
    focusable: false as const,
    className: `shrink-0 ${tone === 'stage' ? COLOR_ON_STAGE[level] : COLOR[level]}`,
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

/** sm in dense tables, md everywhere else, lg in the StatusCard. The shape never changes. */
const SIZE = {
  sm: { text: 'gap-1 text-xs font-medium', shape: 12 },
  md: { text: 'gap-1.5 text-sm font-medium', shape: 14 },
  lg: { text: 'gap-2 text-lg font-semibold', shape: 20 },
} as const;

export function LevelBadge({
  level,
  className = '',
  tone = 'light',
  size = 'md',
}: {
  level: Level;
  className?: string;
  tone?: LevelTone;
  size?: keyof typeof SIZE;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap ${SIZE[size].text} ${tone === 'stage' ? 'text-on-stage' : 'text-ink'} ${className}`}
    >
      <LevelShape level={level} tone={tone} size={SIZE[size].shape} />
      <span>{t(`core.levels.${level}`)}</span>
    </span>
  );
}
