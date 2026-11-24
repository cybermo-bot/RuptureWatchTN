import { Bell, BookOpen, ChevronRight, House, MessageCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SwitchRole } from '@/components/console/ConsoleShell';
import { InstallHint } from '@/components/pharmacy/InstallHint';
import { getCurrentSession } from '@/lib/auth/session';
import { t, type MessageKey } from '@/lib/i18n';

export const metadata: Metadata = { title: t('core.more.title') };

const LINKS: { href: string; icon: typeof House; title: MessageKey; hint: MessageKey }[] = [
  { href: '/pharmacie/alertes', icon: Bell, title: 'core.nav.items.alerts', hint: 'core.more.alertsHint' },
  { href: '/pharmacie/whatsapp', icon: MessageCircle, title: 'core.more.whatsapp', hint: 'core.more.whatsappHint' },
  { href: '/methode', icon: BookOpen, title: 'core.more.method', hint: 'core.more.methodHint' },
  { href: '/', icon: House, title: 'core.more.home', hint: 'core.more.homeHint' },
];

// "Plus", the fourth tab on phones: the pharmacy's other tools, installing the app, changing role.
export default async function PharmacyMore() {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('core.more.title')}</h1>
        <p className="text-ink-muted">{t('core.more.intro')}</p>
      </header>
      <ul className="panel hairline-list overflow-hidden">
        {LINKS.map(({ href, icon: Icon, title, hint }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 no-underline hover:bg-surface-subtle">
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-muted" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium text-ink">{t(title)}</span>
                <span className="text-sm text-ink-muted">{t(hint)}</span>
              </span>
              <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-ink-muted rtl:-scale-x-100" />
            </Link>
          </li>
        ))}
      </ul>
      <InstallHint compact />
      <div className="panel overflow-hidden">
        <SwitchRole session={session} tone="light" />
      </div>
    </div>
  );
}
