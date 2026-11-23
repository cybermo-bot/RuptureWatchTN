'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Re-renders the server page every few seconds (until a time, if given), so a new answer or a
// new request appears without anyone doing anything. Skips while the page is hidden.
export function AutoRefresh({ seconds, until }: { seconds: number; until?: string }) {
  const router = useRouter();
  useEffect(() => {
    const end = until ? Date.parse(until) : Infinity;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
      if (Date.now() > end + seconds * 1000) clearInterval(timer);
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds, until]);
  return null;
}
