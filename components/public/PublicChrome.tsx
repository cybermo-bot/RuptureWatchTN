import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { translator, type Locale } from '@/lib/i18n';
import { LanguageSwitch } from './LanguageSwitch';
import { PublicNav } from './PublicNav';

// Header, footer and main frame of the public pages, built like a phone app: an app header with
// the mark and the language switch, the sections as a bottom tab bar on phones (a row of links
// on wide screens). Shared by tracks B and C: change them through the team lead.

export function PublicHeader({ locale }: { locale: Locale }) {
  const t = translator(locale);
  return (
    <header className="sticky top-0 z-[1100] border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-x-6 px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" aria-label={t('public.shell.wordmarkTitle')} className="inline-flex min-h-14 items-center no-underline">
            <Logo compact />
          </Link>
          <PublicNav locale={locale} variant="top" />
        </div>
        <LanguageSwitch locale={locale} />
      </div>
    </header>
  );
}

export function PublicFooter({ locale }: { locale: Locale }) {
  const t = translator(locale);
  return (
    <>
      <footer className="mt-auto border-t border-line bg-surface-subtle pb-20 sm:pb-0">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-muted sm:flex-row sm:items-start sm:justify-between sm:px-8">
          <p className="flex max-w-prose items-start gap-3">
            <LogoMark size={20} className="mt-0.5 text-ink-muted" />
            <span>{t('public.shell.footer')}</span>
          </p>
          <ul className="flex shrink-0 flex-wrap gap-x-5 gap-y-1">
            <li>
              <Link href="/ruptures-passees" className="inline-flex min-h-12 items-center text-ink-muted underline hover:text-ink">
                {t('public.nav.past')}
              </Link>
            </li>
            <li>
              <Link href="/bibliotheque" className="inline-flex min-h-12 items-center text-ink-muted underline hover:text-ink">
                {t('public.nav.library')}
              </Link>
            </li>
            <li>
              <Link href="/" className="inline-flex min-h-12 items-center text-ink-muted underline hover:text-ink">
                {t('public.shell.professionals')}
              </Link>
            </li>
          </ul>
        </div>
      </footer>
      <PublicNav locale={locale} variant="bottom" />
    </>
  );
}

export function PublicMain({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <main id="contenu" className="w-full flex-1">
      <div className={`mx-auto flex w-full flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10 ${narrow ? 'max-w-3xl' : 'max-w-6xl'}`}>{children}</div>
    </main>
  );
}
