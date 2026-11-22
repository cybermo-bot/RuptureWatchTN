import Link from 'next/link';
import type { ReactNode } from 'react';
import { translator, type Locale } from '@/lib/i18n';
import { LanguageSwitch } from './LanguageSwitch';
import { Ltr } from './Ltr';

// Header, footer and main frame of the public pages. Shared by tracks B and C: change them
// through the team lead.

export function PublicHeader({ locale }: { locale: Locale }) {
  const t = translator(locale);
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 px-5 py-1 sm:px-8">
        <Link href="/medicaments" className="inline-flex min-h-12 items-center text-ink no-underline hover:text-ink">
          <Ltr className="inline-flex items-center gap-1.5">
            <span className="text-[1.0625rem] font-semibold tracking-tight">{t('core.app.wordmark')}</span>
            <span className="font-mono text-sm text-ink-muted">{t('core.app.wordmarkCountry')}</span>
          </Ltr>
          <span className="sr-only">{t('public.shell.wordmarkTitle')}</span>
        </Link>
        <LanguageSwitch locale={locale} />
      </div>
    </header>
  );
}

export function PublicFooter({ locale }: { locale: Locale }) {
  const t = translator(locale);
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-ink-muted sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <p className="max-w-prose">{t('public.shell.footer')}</p>
        <Link href="/" className="shrink-0 text-ink-muted underline hover:text-ink">
          {t('public.shell.professionals')}
        </Link>
      </div>
    </footer>
  );
}

export function PublicMain({ children }: { children: ReactNode }) {
  return (
    <main id="contenu" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      {children}
    </main>
  );
}
