'use client';

import { Lightbulb, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { hintShownOn, hintStorageKey, type SpaceHint } from '@/lib/demo/hints';
import type { OrganisationType } from '@/lib/demo/roles';
import { t } from '@/lib/i18n';

// One dismissible line at the top of a demo account's space: what to try first. The dismissal is
// kept in this browser only (localStorage), never sent anywhere. Until the browser has said
// whether it was dismissed, nothing is drawn, so a dismissed hint never flashes back.

const CHANGED = 'rw-try-hint-change';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

function isDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function HintStrip({ type, hint }: { type: OrganisationType; hint: SpaceHint }) {
  const key = hintStorageKey(type);
  const pathname = usePathname();
  // Server and first paint: hidden. Then the browser's answer.
  const dismissed = useSyncExternalStore(subscribe, () => isDismissed(key), () => true);
  if (dismissed || !hintShownOn(hint, pathname)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(key, '1');
    } catch {
      // Private mode without storage: hide for this page view only.
    }
    window.dispatchEvent(new Event(CHANGED));
  };

  return (
    <aside
      aria-label={t('core.tryHint.label')}
      className="mb-5 flex items-center gap-3 rounded-sm border border-line bg-surface py-1 ps-3 pe-1 text-sm text-ink print:hidden"
    >
      <Lightbulb size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-brand" />
      <p className="min-w-0 flex-1 py-2">
        {t(hint.text, hint.vars)}
        {hint.link ? (
          <>
            {' '}
            <Link href={hint.link.href} className="font-medium whitespace-nowrap">
              {t(hint.link.label)}
            </Link>
          </>
        ) : null}
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-subtle hover:text-ink"
      >
        <X size={20} aria-hidden="true" />
        <span className="sr-only">{t('core.tryHint.dismiss')}</span>
      </button>
    </aside>
  );
}
