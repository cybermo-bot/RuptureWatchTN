'use client';

import { History, MapPin, Search, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { translator, type Locale, type MessageKey } from '@/lib/i18n';

// The public side's sections: a row of links in the header on wide screens, a bottom tab bar on
// phones, like an app. The Library is not a tab: it sits in the footer, away from the patient's
// request flow (rule 12).

const TABS: { href: string; label: MessageKey; icon: LucideIcon; match: RegExp }[] = [
  { href: '/medicaments', label: 'public.nav.medicines', icon: Search, match: /^\/(medicaments|demandes)(\/|$)/ },
  { href: '/pharmacies', label: 'public.nav.pharmacies', icon: MapPin, match: /^\/pharmacies(\/|$)/ },
  { href: '/ruptures-passees', label: 'public.nav.past', icon: History, match: /^\/ruptures-passees(\/|$)/ },
];

export function PublicNav({ locale, variant }: { locale: Locale; variant: 'top' | 'bottom' }) {
  const pathname = usePathname();
  const t = translator(locale);
  if (variant === 'top') {
    return (
      <nav aria-label={t('public.nav.label')} className="hidden sm:block">
        <ul className="flex gap-1">
          {TABS.map((tab) => {
            const current = tab.match.test(pathname);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={current ? 'page' : undefined}
                  className={`relative inline-flex min-h-12 items-center px-3 text-sm no-underline transition-colors duration-150 ${
                    current
                      ? 'font-medium text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-brand'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {t(tab.label)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }
  return (
    <nav aria-label={t('public.nav.label')} className="safe-bottom fixed inset-x-0 bottom-0 z-[1100] border-t border-line bg-surface sm:hidden">
      <ul className="grid grid-cols-3">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const current = match.test(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs no-underline ${
                  current ? 'font-semibold text-brand' : 'text-ink-muted'
                }`}
              >
                <Icon size={22} strokeWidth={current ? 2.25 : 1.75} aria-hidden="true" />
                {t(label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
