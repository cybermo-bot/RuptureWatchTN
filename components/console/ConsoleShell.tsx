import { ArrowLeftRight, LogOut } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { switchRole } from '@/app/actions/auth';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { HintStrip } from '@/components/console/HintStrip';
import { MobileDrawer } from '@/components/console/MobileDrawer';
import { BottomTabs, SidebarNav, type Badges } from '@/components/console/NavLinks';
import { OriginBadge } from '@/components/OriginBadge';
import type { CurrentSession } from '@/lib/auth/session';
import { hintFor } from '@/lib/demo/hints';
import { t } from '@/lib/i18n';
import { MORE_NAV, NAV, PHARMACY_TABS, UNDERSTAND } from '@/lib/nav';

// The professional spaces as an operations console: a fixed dark sidebar (logo, who you are,
// the space's sections, "Changer de rôle"), a light content area. On phones the sidebar becomes
// a bottom tab bar for the pharmacy (an app at the counter) and a top drawer for other roles.

function WhoAmI({ session }: { session: CurrentSession }) {
  const { organisation } = session;
  return (
    <div className="flex flex-col gap-1.5 rounded-sm border border-sidebar-line px-3 py-3">
      <p className="text-xs text-sidebar-muted">{t(`core.orgTypes.${organisation.type}`)}</p>
      <p className="text-[0.9375rem] leading-snug font-medium text-white">{organisation.displayName}</p>
      <p>
        <OriginBadge origin={organisation.origin} tone="dark" />
      </p>
    </div>
  );
}

export function SwitchRole({ session, tone = 'dark' }: { session: CurrentSession; tone?: 'dark' | 'light' }) {
  // Testers get no role switch: their account lives only in this browser's session.
  if (session.organisation.origin === 'tester') return null;
  const dark = tone === 'dark';
  const demo = session.organisation.origin === 'simulated';
  const Icon = demo ? ArrowLeftRight : LogOut;
  return (
    <form action={switchRole}>
      <button
        type="submit"
        className={
          dark
            ? 'flex min-h-12 w-full items-center gap-3 rounded-sm px-3 text-start text-[0.9375rem] text-sidebar-text hover:bg-sidebar-raised hover:text-white focus-visible:outline-sidebar-accent'
            : 'flex min-h-14 w-full items-center gap-3 px-4 text-start text-ink hover:bg-surface-subtle'
        }
      >
        <Icon size={18} strokeWidth={1.75} aria-hidden="true" className={dark ? 'text-sidebar-muted' : 'text-ink-muted'} />
        {t(demo ? 'core.roles.switch' : 'core.access.signOut')}
      </button>
    </form>
  );
}

function Understand({ demo }: { demo: boolean }) {
  const links = demo ? UNDERSTAND : UNDERSTAND.filter(({ href }) => href === '/methode');
  return (
    <div className="flex flex-col gap-1">
      <ul className="flex flex-col">
        {links.map((u) => (
          <li key={u.href}>
            <Link
              href={u.href}
              className="flex min-h-12 items-center rounded-sm px-3 text-sm text-sidebar-muted no-underline hover:bg-sidebar-raised hover:text-white focus-visible:outline-sidebar-accent"
            >
              {t(u.label)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SidebarBody({ session, badges }: { session: CurrentSession; badges: Badges }) {
  const type = session.organisation.type;
  const secondary = MORE_NAV[type];
  return (
    <div className="flex flex-1 flex-col gap-6">
      <WhoAmI session={session} />
      <nav aria-label={t('core.nav.label')}>
        <SidebarNav items={NAV[type]} badges={badges} />
        {type !== 'pharmacy' ? (
          <details>
            <summary className="min-h-12 cursor-pointer content-center rounded-sm px-3 text-sm text-sidebar-text hover:bg-sidebar-raised focus-visible:outline-sidebar-accent">{t('core.nav.items.more')}</summary>
            {secondary ? <SidebarNav items={secondary} /> : null}
            <Understand demo={session.organisation.origin === 'simulated'} />
          </details>
        ) : null}
      </nav>
      <div className="mt-auto flex flex-col gap-4 border-t border-sidebar-line pt-4">
        <SwitchRole session={session} />
      </div>
    </div>
  );
}

export function ConsoleShell({
  session,
  badges = {},
  children,
}: {
  session: CurrentSession;
  badges?: Badges;
  children: ReactNode;
}) {
  const pharmacy = session.organisation.type === 'pharmacy';
  const hint = hintFor(session.organisation.type, session.organisation.origin);
  return (
    <div className="flex min-h-full flex-1 flex-col bg-page lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] print:block print:bg-white">
      {/* Desktop: the sidebar, a full-height column whose content stays in view. */}
      <aside className="hidden bg-sidebar lg:block print:hidden">
        <div className="sticky top-0 flex h-dvh flex-col overflow-y-auto px-3 pt-4 pb-4">
          <Link href="/" className="mb-6 flex min-h-12 items-center rounded-sm px-3 no-underline focus-visible:outline-sidebar-accent">
            <Logo tone="dark" />
            <span className="sr-only">, {t('core.nav.home')}</span>
          </Link>
          <SidebarBody session={session} badges={badges} />
        </div>
      </aside>

      {/* Phones and tablets. */}
      {pharmacy ? (
        <header className="sticky top-0 z-30 border-b border-line bg-surface lg:hidden print:hidden">
          <div className="flex min-h-14 items-center justify-between gap-3 px-4">
            <Link href="/" className="flex min-h-12 min-w-12 shrink-0 items-center no-underline">
              <LogoMark size={26} className="text-brand" />
              <span className="sr-only">{t('core.app.name')}, {t('core.nav.home')}</span>
            </Link>
            <p className="flex min-w-0 flex-1 items-center justify-end gap-2 text-sm">
              <span className="truncate font-medium text-ink">{session.organisation.displayName}</span>
              <OriginBadge origin={session.organisation.origin} />
            </p>
          </div>
        </header>
      ) : (
        <header className="sticky top-0 z-30 bg-sidebar lg:hidden print:hidden">
          <div className="relative flex min-h-14 items-center justify-between gap-3 ps-4 pe-2">
            <Link href="/" className="flex min-h-12 items-center no-underline focus-visible:outline-sidebar-accent">
              <Logo tone="dark" compact />
              <span className="sr-only">, {t('core.nav.home')}</span>
            </Link>
            <MobileDrawer>
              <SidebarBody session={session} badges={badges} />
            </MobileDrawer>
          </div>
        </header>
      )}

      <main
        id="contenu"
        className={`mx-auto w-full max-w-[90rem] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0 ${pharmacy ? 'pb-28 lg:pb-8' : ''}`}
      >
        {children}
        {hint ? (
          <details className="mt-4 print:hidden">
            <summary className="min-h-12 w-fit cursor-pointer content-center text-sm font-medium text-brand">{t('core.tryHint.label')}</summary>
            <HintStrip type={session.organisation.type} hint={hint} />
          </details>
        ) : null}
      </main>

      {pharmacy ? <BottomTabs items={PHARMACY_TABS} badges={badges} /> : null}
    </div>
  );
}
