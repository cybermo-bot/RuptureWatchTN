import Link from 'next/link';
import { ButtonLink } from '@/components/Button';
import type { CurrentSession } from '@/lib/auth/session';
import { t } from '@/lib/i18n';
import { countUnreadAlerts } from '@/lib/pharmacy/data';

// Top of the pharmacy space: the primary action, then two tabs (followed medicines, alerts).
export async function PharmacyHeader({ session, active }: { session: CurrentSession; active: 'followed' | 'alerts' }) {
  const unread = await countUnreadAlerts();
  const tab = (key: 'followed' | 'alerts', href: string, label: string, extra?: React.ReactNode) => (
    <Link
      href={href}
      aria-current={active === key ? 'page' : undefined}
      className={`flex min-h-12 items-center gap-2 border-b-2 px-1 font-medium no-underline ${
        active === key ? 'border-brand text-ink' : 'border-transparent text-ink-muted hover:text-ink'
      }`}
    >
      {label}
      {extra}
    </Link>
  );

  return (
    <header className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-ink-muted">{t('core.orgTypes.pharmacy')}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t('core.space.titles.pharmacy')}</h1>
        <p className="text-ink-muted">
          {session.organisation.governorateName ?? session.organisation.governorateCode}{' '}
          <span className="font-mono text-sm">{session.organisation.governorateCode}</span>
        </p>
      </div>
      <ButtonLink href="/pharmacie/signaler" className="w-full sm:w-auto sm:self-start">
        {t('core.pharmacy.reportCta')}
      </ButtonLink>
      <nav aria-label={t('core.pharmacy.tabsLabel')} className="flex gap-6 border-b border-line">
        {tab('followed', '/pharmacie', t('core.pharmacy.tabs.followed'))}
        {tab(
          'alerts',
          '/pharmacie/alertes',
          t('core.pharmacy.tabs.alerts'),
          unread > 0 ? (
            <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-xs text-white">
              <span aria-hidden="true">{unread}</span>
              <span className="sr-only">
                {unread === 1 ? t('core.pharmacy.tabs.unreadOne') : t('core.pharmacy.tabs.unreadCount', { count: unread })}
              </span>
            </span>
          ) : null,
        )}
      </nav>
    </header>
  );
}
