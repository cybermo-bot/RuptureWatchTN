'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

// One bottom tab bar for the public side and the pharmacy (rw-design-system): 56 px tall plus the
// safe area, icons 24 px, the current tab in brand with a thicker stroke and aria-current. The
// page keeps clear of it with padding-bottom calc(3.5rem + env(safe-area-inset-bottom)).

export interface BottomBarItem {
  href: string;
  label: string;
  icon: LucideIcon;
  current: boolean;
  /** A count shown on the icon (unread alerts, waiting requests). */
  badge?: number;
  /** What the count means, for screen readers. */
  badgeText?: string;
}

/** The count on a tab. When it rises while the page is open, it pulses once (no loop). */
function Badge({ count }: { count: number }) {
  const [previous, setPrevious] = useState(count);
  const [pulses, setPulses] = useState(0);
  if (count !== previous) {
    setPrevious(count);
    if (count > previous) setPulses(pulses + 1);
  }
  if (count <= 0) return null;
  return (
    <span
      key={pulses}
      aria-hidden="true"
      data-badge
      className={`absolute -end-2.5 -top-1.5 min-w-5 rounded-full bg-level-confirmed px-1 text-center font-mono text-xs leading-5 font-medium text-white ${pulses > 0 ? 'rw-badge-pulse' : ''}`}
    >
      {count}
    </span>
  );
}

const HIDE = { sm: 'sm:hidden', lg: 'lg:hidden' } as const;
const COLS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' } as const;

export function BottomBar({ label, items, hideFrom }: { label: string; items: BottomBarItem[]; hideFrom: keyof typeof HIDE }) {
  const cols = COLS[Math.min(4, Math.max(2, items.length)) as 2 | 3 | 4];
  return (
    <nav aria-label={label} data-bottom-bar className={`safe-bottom fixed inset-x-0 bottom-0 z-[1100] border-t border-line bg-surface ${HIDE[hideFrom]}`}>
      <ul className={`mx-auto grid max-w-xl ${cols}`}>
        {items.map(({ href, label: text, icon: Icon, current, badge = 0, badgeText }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={current ? 'page' : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs leading-tight whitespace-nowrap no-underline transition-colors duration-(--dur-fast) ${
                current ? 'font-semibold text-brand' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <span className="relative">
                <Icon size={24} strokeWidth={current ? 2.25 : 1.75} aria-hidden="true" />
                <Badge count={badge} />
              </span>
              <span>{text}</span>
              {badge > 0 && badgeText ? <span className="sr-only">{badgeText}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
