import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { UnderstandNav } from '@/components/console/UnderstandNav';
import { t } from '@/lib/i18n';

// Chrome of the showcase pages (home, scenario, four views, method, replay, status): the logo,
// the "Comprendre" pages, and the way into the roles. Same identity as the console.

export function Wordmark() {
  return (
    <Link href="/" className="inline-flex min-h-12 items-center no-underline hover:text-ink">
      <Logo />
      <span className="sr-only">, {t('core.app.title')}</span>
    </Link>
  );
}

export function SiteHeader({ children, compact = false }: { children?: ReactNode; compact?: boolean }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 sm:px-6 lg:px-8">
        <Wordmark />
        {!compact ? <div className="order-3 -mx-4 w-[calc(100%+2rem)] overflow-x-auto border-t border-line px-4 sm:order-none sm:mx-0 sm:w-auto sm:border-0 sm:px-0 lg:flex-1">
          <UnderstandNav />
        </div> : null}
        {children ?? (!compact && (
          <Link
            href="/#roles"
            className="inline-flex min-h-11 items-center rounded-md bg-brand px-4 text-sm font-medium text-white no-underline hover:bg-brand-strong hover:text-white"
          >
            {t('core.site.chooseRole')}
          </Link>
        ))}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-start gap-3">
          <LogoMark size={20} className="mt-0.5 text-ink-muted" />
          <p className="max-w-prose">{t('core.home.footer')}</p>
        </div>
        <div className="flex shrink-0 gap-5">
          <Link href="/medicaments" className="text-ink-muted underline hover:text-ink">
            {t('core.site.public')}
          </Link>
        </div>
      </div>
    </footer>
  );
}

/** The content area of a showcase page: light page, panels inside. */
export function SiteMain({ children, narrow = false, className = '' }: { children: ReactNode; narrow?: boolean; className?: string }) {
  return (
    <main id="contenu" className={`w-full flex-1 bg-page ${className}`}>
      <div className={`mx-auto flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10 ${narrow ? 'max-w-3xl' : 'max-w-7xl'}`}>
        {children}
      </div>
    </main>
  );
}
