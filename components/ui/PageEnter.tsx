'use client';

import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

// Page transitions (pilot-4 step 2), the brief's fallback: the new page fades in rising 8 px
// (--dur-base, enter easing), header, rail and bottom bar stay still because they sit outside.
// Keyed on the path, so every navigation plays it, and a refresh (router.refresh, the polling
// pages) or a query change (?m=…) does not. Nothing on the first page a visitor lands on.
// Module state, written after commit: it survives the remount of the shells that live inside
// each page (SiteMain).
let landedOn: string | null = null;
let moved = false;

export function PageEnter({ children, className = '' }: { children: ReactNode; className?: string }) {
  const pathname = usePathname();
  const animate = moved || (landedOn !== null && pathname !== landedOn);
  useEffect(() => {
    if (landedOn === null) landedOn = pathname;
    else if (pathname !== landedOn) moved = true;
  }, [pathname]);
  return (
    <div key={pathname} className={`${animate ? 'rw-page' : ''} ${className}`}>
      {children}
    </div>
  );
}
