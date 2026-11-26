'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/lib/i18n';
import { understandLinks } from '@/lib/nav';

// The "Comprendre" pages in the showcase header; the current one is marked.
export function UnderstandNav() {
  const pathname = usePathname();
  return (
    <nav aria-label={t('core.site.navLabel')}>
      <ul className="flex gap-x-1 whitespace-nowrap">
        {understandLinks().map((u) => {
          const current = pathname === u.href || pathname.startsWith(`${u.href}/`);
          return (
            <li key={u.href}>
              <Link
                href={u.href}
                aria-current={current ? 'page' : undefined}
                className={`relative inline-flex min-h-12 items-center px-2.5 text-sm no-underline transition-colors duration-(--dur-fast) ${
                  current
                    ? 'font-medium text-ink after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:bg-brand'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {t(u.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
