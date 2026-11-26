'use client';

import { BellRing, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { translator, type Locale } from '@/lib/i18n';
import { formatPublicDate } from '@/lib/public/format';
import { FOLLOW_EVENT, followedList, setFollowed, type Followed, type PublicLevel } from '@/lib/public/device';

// Under the public header: when the status of a followed medicine has changed since the
// visitor last saw it, one calm line says so. Checked each time a public page opens.
interface Change {
  id: string;
  name: string;
  level: PublicLevel;
  since: string | null;
}

export function FollowBanner({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [changes, setChanges] = useState<Change[]>([]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const followed = followedList();
      const ids = Object.keys(followed);
      if (ids.length === 0) {
        setChanges([]);
        return;
      }
      try {
        const res = await fetch(`/api/public/status?ids=${ids.join(',')}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const now = (await res.json()) as Record<string, { level: PublicLevel; since: string | null }>;
        if (cancelled) return;
        setChanges(
          ids
            .filter((id) => now[id] && (now[id].level !== followed[id].level || now[id].since !== followed[id].since))
            .map((id) => ({
              id,
              name: followed[id].name,
              level: now[id].level,
              since: now[id].since,
            })),
        );
      } catch {
        // Offline: nothing to announce.
      }
    };
    void check();
    const onChange = () => setChanges((list) => list.filter((c) => c.id in followedList() && !seen(c, followedList()[c.id])));
    window.addEventListener(FOLLOW_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(FOLLOW_EVENT, onChange);
    };
  }, []);

  if (changes.length === 0) return null;

  const acknowledge = (c: Change) => setFollowed(c.id, { name: c.name, level: c.level, since: c.since });
  const line = (c: Change) => {
    // First-strong isolate: a Latin medicine name keeps its direction inside an Arabic sentence.
    const name = String.fromCharCode(0x2068) + c.name + String.fromCharCode(0x2069);
    if (c.level === 'confirmed' && c.since)
      return t('public.watch.bannerConfirmed', {
        name,
        date: formatPublicDate(c.since, locale),
      });
    if (c.level === 'cleared' && c.since)
      return t('public.watch.bannerCleared', {
        name,
        date: formatPublicDate(c.since, locale),
      });
    return t('public.watch.bannerNone', { name });
  };

  return (
    <section aria-labelledby="follow-banner-title" className="border-b border-line bg-surface-subtle">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 sm:px-8">
        <h2 id="follow-banner-title" className="inline-flex items-center gap-2 text-sm font-medium text-ink">
          <BellRing size={16} aria-hidden="true" className="text-brand" />
          {t('public.watch.bannerTitle')}
        </h2>
        <ul className="flex flex-col gap-1">
          {changes.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-ink">{line(c)}</span>
              <span className="inline-flex items-center gap-1">
                <Link
                  href={`/medicaments/${c.id}`}
                  onClick={() => acknowledge(c)}
                  className="inline-flex min-h-12 items-center px-1 text-brand underline"
                >
                  {t('public.watch.see')}
                </Link>
                <button
                  type="button"
                  onClick={() => acknowledge(c)}
                  className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-sm text-ink-muted hover:text-ink"
                >
                  <X size={18} aria-hidden="true" />
                  <span className="sr-only">{t('public.watch.dismiss')}</span>
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function seen(c: Change, stored: Followed | undefined): boolean {
  return !!stored && stored.level === c.level && stored.since === c.since;
}
