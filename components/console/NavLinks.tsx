'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ICONS } from '@/components/console/icons';
import { BottomBar } from '@/components/ui/BottomBar';
import { t } from '@/lib/i18n';
import { isCurrent, type NavItem } from '@/lib/nav';

export type Badges = Partial<Record<NonNullable<NavItem['badge']>, number>>;

function Count({ n }: { n: number }) {
  return (
    <span className="ms-auto rounded-full bg-sidebar-accent px-2 py-0.5 font-mono text-xs leading-4 text-sidebar">
      {n}
    </span>
  );
}

/** The space's sections in the dark sidebar (and the phone drawer). */
export function SidebarNav({ items, badges = {}, onNavigate }: { items: NavItem[]; badges?: Badges; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = NAV_ICONS[item.icon];
        const current = isCurrent(item, pathname);
        const count = item.badge ? (badges[item.badge] ?? 0) : 0;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={current ? 'page' : undefined}
              className={`relative flex min-h-12 items-center gap-3 rounded-sm px-3 text-[0.9375rem] no-underline transition-colors duration-(--dur-fast) focus-visible:outline-sidebar-accent ${
                current
                  ? 'bg-sidebar-raised font-medium text-white before:absolute before:inset-y-2.5 before:start-0 before:w-0.5 before:rounded-full before:bg-sidebar-accent'
                  : 'text-sidebar-text hover:bg-sidebar-raised hover:text-white'
              }`}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" className={current ? 'text-sidebar-accent' : 'text-sidebar-muted'} />
              <span>{t(item.label)}</span>
              {count > 0 ? (
                <>
                  <span aria-hidden="true" className="ms-auto">
                    <Count n={count} />
                  </span>
                  <span className="sr-only">
                    {count === 1 ? t('core.pharmacy.tabs.unreadOne') : t('core.pharmacy.tabs.unreadCount', { count })}
                  </span>
                </>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** The pharmacy's bottom tab bar on phones. */
export function BottomTabs({ items, badges = {} }: { items: NavItem[]; badges?: Badges }) {
  const pathname = usePathname();
  return (
    <BottomBar
      label={t('core.nav.tabsLabel')}
      hideFrom="lg"
      items={items.map((item) => {
        const count = item.badge ? (badges[item.badge] ?? 0) : 0;
        return {
          href: item.href,
          label: t(item.label),
          icon: NAV_ICONS[item.icon],
          current: isCurrent(item, pathname),
          badge: count,
          badgeText: count === 1 ? t('core.pharmacy.tabs.unreadOne') : t('core.pharmacy.tabs.unreadCount', { count }),
        };
      })}
    />
  );
}
