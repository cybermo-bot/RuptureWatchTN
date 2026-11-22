import Link from 'next/link';
import type { ReactNode } from 'react';
import { t } from '@/lib/i18n';

export function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-12 items-center gap-1.5 text-ink no-underline hover:text-ink"
    >
      <span className="text-[1.0625rem] font-semibold tracking-tight">{t('core.app.wordmark')}</span>
      <span className="font-mono text-sm text-ink-muted">{t('core.app.wordmarkCountry')}</span>
      <span className="sr-only">, {t('core.app.title')}</span>
    </Link>
  );
}

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-1 sm:px-8">
        <Wordmark />
        {children ?? <span className="text-sm text-ink-muted">{t('core.app.prototype')}</span>}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-ink-muted sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <p className="max-w-prose">{t('core.home.footer')}</p>
        <Link href="/status" className="shrink-0 text-ink-muted underline hover:text-ink">
          {t('core.home.statusLink')}
        </Link>
      </div>
    </footer>
  );
}
