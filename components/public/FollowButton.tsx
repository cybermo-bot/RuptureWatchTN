'use client';

import { Bell, BellOff } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';
import { buttonClass } from '@/components/Button';
import { translator, type Locale } from '@/lib/i18n';
import { FOLLOW_EVENT, followedList, setFollowed, type PublicLevel } from '@/lib/public/device';

function subscribe(onChange: () => void) {
  window.addEventListener(FOLLOW_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(FOLLOW_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

// "Préviens-moi": the followed list stays on the visitor's phone. Opening the medicine's page
// counts as having seen its current status.
export function FollowButton({
  moleculeId,
  name,
  level,
  since,
  locale,
}: {
  moleculeId: string;
  name: string;
  level: PublicLevel;
  since: string | null;
  locale: Locale;
}) {
  const t = translator(locale);
  // Read from the phone's storage; null while the page is drawn on the server.
  const following = useSyncExternalStore(
    subscribe,
    () => moleculeId in followedList(),
    () => null,
  );

  useEffect(() => {
    // Seen now: the banner will not announce what this page already shows.
    if (moleculeId in followedList()) setFollowed(moleculeId, { name, level, since });
  }, [moleculeId, name, level, since]);

  if (following === null) return <div className="min-h-12" aria-hidden="true" />;

  return (
    <div className="flex flex-col gap-2">
      {following ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="inline-flex items-center gap-2 font-medium text-ink" role="status">
            <Bell size={20} aria-hidden="true" className="text-brand" />
            {t('public.watch.following')}
          </p>
          <button type="button" className={buttonClass('quiet', 'min-h-12')} onClick={() => setFollowed(moleculeId, null)}>
            <BellOff size={20} aria-hidden="true" />
            {t('public.watch.stop')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={buttonClass('quiet', 'self-start')}
          onClick={() => setFollowed(moleculeId, { name, level, since })}
        >
          <Bell size={20} aria-hidden="true" />
          {t('public.watch.follow')}
        </button>
      )}
      {following ? (
        <>
          <p className="text-sm text-ink-muted">{t('public.watch.stored')}</p>
          <p className="text-sm text-ink-muted">{t('public.watch.how')}</p>
        </>
      ) : null}
    </div>
  );
}
