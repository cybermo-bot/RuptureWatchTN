'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { browserClient } from '@/lib/db/browser';

// Re-renders the page when a row of `table` changes, through Supabase Realtime (row-level
// security applies, so a visitor only hears about rows they may read). If the channel does
// not come up within a few seconds, or drops, the page polls every `fallbackMs` instead.
// The mode in use is written to <html data-live> ("realtime" or "polling") so a check can tell which one served.

export function LiveRefresh({
  table,
  filter,
  fallbackMs,
}: {
  table: 'alerts' | 'signals';
  filter?: string;
  fallbackMs: number;
}) {
  const router = useRouter();

  useEffect(() => {
    let poll: ReturnType<typeof setInterval> | null = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const mark = (mode: 'realtime' | 'polling') => {
      document.documentElement.dataset.live = mode;
    };
    const startPolling = () => {
      mark('polling');
      if (!poll) poll = setInterval(() => router.refresh(), fallbackMs);
    };
    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };
    const refresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => router.refresh(), 250);
    };

    const supabase = browserClient();
    const channel = supabase
      .channel(`live-${table}-${filter ?? 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, refresh)
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          stopPolling();
          mark('realtime');
        }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') startPolling();
      });
    const watchdog = setTimeout(() => {
      if (channel.state !== 'joined') startPolling();
    }, 5000);

    return () => {
      clearTimeout(watchdog);
      if (debounce) clearTimeout(debounce);
      stopPolling();
      void supabase.removeChannel(channel);
    };
  }, [router, table, filter, fallbackMs]);

  return null;
}
