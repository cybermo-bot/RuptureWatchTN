'use client';

import { Inbox, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';

// A new patient request while the pharmacy's home is open: one toast. The page polls (there is
// no realtime for requests), so the count rises on a refresh; the bottom bar's « Demandes »
// badge pulses once on its own. Nothing on the first render: only what arrives while one looks.
export function RequestWatcher({ count }: { count: number }) {
  const [previous, setPrevious] = useState(count);
  const [arrived, setArrived] = useState(0);
  if (count !== previous) {
    setPrevious(count);
    if (count > previous) setArrived(count - previous);
  }

  useEffect(() => {
    if (arrived === 0) return;
    const timer = setTimeout(() => setArrived(0), 8000);
    return () => clearTimeout(timer);
  }, [arrived]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed end-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col lg:bottom-6"
    >
      {arrived > 0 ? (
        <div
          data-request-toast
          className="rw-toast pointer-events-auto flex items-center gap-3 rounded-md border border-sidebar-line bg-sidebar px-4 py-2 text-sm text-sidebar-text shadow-[0_8px_24px_rgba(11,26,22,0.18)]"
        >
          <Inbox size={20} aria-hidden="true" className="shrink-0 text-sidebar-accent" />
          <p className="flex-1">{arrived === 1 ? t('core.pharmacy.today.toastOne') : t('core.pharmacy.today.toastMany', { count: arrived })}</p>
          <Link href="/pharmacie/demandes" className="inline-flex min-h-12 items-center font-medium text-white underline underline-offset-2">
            {t('core.requests.answerNow')}
          </Link>
          <button
            type="button"
            onClick={() => setArrived(0)}
            className="-me-2 inline-flex min-h-12 min-w-12 items-center justify-center rounded-sm text-sidebar-muted hover:text-white focus-visible:outline-sidebar-accent"
          >
            <X size={16} aria-hidden="true" />
            <span className="sr-only">{t('core.toast.close')}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
