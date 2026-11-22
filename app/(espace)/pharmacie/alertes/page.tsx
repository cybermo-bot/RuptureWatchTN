import Link from 'next/link';
import { redirect } from 'next/navigation';
import { markAlertRead, markAllAlertsRead } from '@/app/actions/pharmacy';
import { EmptyState } from '@/components/EmptyState';
import { Disclaimer, Guidance, ReviewStatus } from '@/components/Guidance';
import { LevelExplanation } from '@/components/LevelExplanation';
import { LevelBadge } from '@/components/LevelBadge';
import { LiveRefresh } from '@/components/LiveRefresh';
import { PharmacyHeader } from '@/components/PharmacyHeader';
import { getCurrentSession } from '@/lib/auth/session';
import { formatDate, formatTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { getAlerts, type AlertView } from '@/lib/pharmacy/data';
import { isActiveLevel } from '@/lib/signal';

function isStandDown(a: AlertView) {
  return isActiveLevel(a.from) && !isActiveLevel(a.to);
}

function AlertItem({ alert }: { alert: AlertView }) {
  const unread = alert.readAt === null;
  const standDown = isStandDown(alert);
  const headingId = `alerte-${alert.id}`;
  return (
    <li>
      <article
        aria-labelledby={headingId}
        className={`flex flex-col gap-4 border-s-2 py-6 ps-4 ${
          standDown ? 'border-level-cleared' : unread ? 'border-ink' : 'border-line'
        }`}
      >
        <header className="flex flex-col gap-2">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            <span>{standDown ? t('alerts.standDownLabel') : t('alerts.levelChangeLabel')}</span>
            <span>
              {t('alerts.received', {
                date: t('common.dateAt', { date: formatDate(alert.sentAt), time: formatTime(alert.sentAt) }),
              })}
            </span>
            {unread ? <span className="font-medium text-ink">{t('alerts.unread')}</span> : null}
          </p>
          <h2 id={headingId} className="text-lg font-semibold break-words text-ink">
            <Link href={`/pharmacie/molecule/${alert.moleculeId}`}>{alert.moleculeName}</Link>
          </h2>
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-muted">{t('alerts.from')}</span>
            <LevelBadge level={alert.from} />
            <span className="text-sm text-ink-muted">{t('alerts.to')}</span>
            <LevelBadge level={alert.to} />
          </p>
        </header>

        <LevelExplanation rule={alert.rule} evidence={alert.evidence} />

        {standDown ? (
          <div className="flex flex-col gap-3">
            <p className="max-w-prose text-ink">
              {t('guidance.standDown', { molecule: alert.moleculeName, level: t(`levels.${alert.to}`) })}
            </p>
            <Disclaimer />
            <ReviewStatus />
          </div>
        ) : (
          <Guidance level={alert.to} headingLevel={3} />
        )}

        {unread ? (
          <form action={markAlertRead}>
            <input type="hidden" name="alert_id" value={alert.id} />
            <button
              type="submit"
              className="min-h-12 text-sm font-medium text-brand underline underline-offset-4 hover:text-brand-strong"
            >
              {t('alerts.markRead')}
            </button>
          </form>
        ) : null}
      </article>
    </li>
  );
}

export default async function PharmacyAlerts() {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  const alerts = await getAlerts();
  const unread = alerts.some((a) => a.readAt === null);

  return (
    <div className="flex flex-col gap-8">
      <PharmacyHeader session={session} active="alerts" />
      <LiveRefresh table="alerts" filter={`organisation_id=eq.${session.organisation.id}`} fallbackMs={15_000} />
      <section aria-labelledby="alertes" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="alertes" className="sr-only">
            {t('alerts.title')}
          </h2>
          <p className="text-sm text-ink-muted">{t('alerts.live')}</p>
          {unread ? (
            <form action={markAllAlertsRead}>
              <button
                type="submit"
                className="min-h-12 text-sm font-medium text-brand underline underline-offset-4 hover:text-brand-strong"
              >
                {t('alerts.markAllRead')}
              </button>
            </form>
          ) : null}
        </div>
        {alerts.length === 0 ? (
          <EmptyState title={t('alerts.emptyTitle')} body={t('alerts.emptyBody')} />
        ) : (
          <ul className="hairline-list flex flex-col">
            {alerts.map((a) => (
              <AlertItem key={a.id} alert={a} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
