import Link from 'next/link';
import { redirect } from 'next/navigation';
import { markAlertRead, markAllAlertsRead } from '@/app/actions/pharmacy';
import { EmptyState } from '@/components/EmptyState';
import { Disclaimer, Guidance, ReviewStatus } from '@/components/Guidance';
import { LevelExplanation } from '@/components/LevelExplanation';
import { LevelBadge } from '@/components/LevelBadge';
import { Origins } from '@/components/Origins';
import { LiveRefresh } from '@/components/LiveRefresh';
import { getCurrentSession } from '@/lib/auth/session';
import { formatDate, formatTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { ArrivalLine } from '@/components/institutions/Lines';
import { OriginBadge } from '@/components/OriginBadge';
import { createUserClient } from '@/lib/db/server';
import { orderMessagesForMe, upcomingArrivals, type Arrival, type OrderMessage } from '@/lib/institutions/data';
import { getAlerts, type AlertView } from '@/lib/pharmacy/data';
import { isActiveLevel } from '@/lib/signal';

function isStandDown(a: AlertView) {
  return isActiveLevel(a.from) && !isActiveLevel(a.to);
}

function AlertItem({ alert, arrival }: { alert: AlertView; arrival: Arrival | null }) {
  const unread = alert.readAt === null;
  const standDown = isStandDown(alert);
  const headingId = `alerte-${alert.id}`;
  return (
    <li>
      <article
        aria-labelledby={headingId}
        className={`panel flex flex-col gap-4 border-s-4 p-4 ${
          standDown ? 'border-s-level-cleared' : unread ? 'border-s-ink' : 'border-s-line'
        }`}
      >
        <header className="flex flex-col gap-2">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            <span>{standDown ? t('core.alerts.standDownLabel') : t('core.alerts.levelChangeLabel')}</span>
            <span>
              {t('core.alerts.received', {
                date: t('core.common.dateAt', { date: formatDate(alert.sentAt), time: formatTime(alert.sentAt) }),
              })}
            </span>
            {unread ? <span className="font-medium text-ink">{t('core.alerts.unread')}</span> : null}
          </p>
          <h2 id={headingId} className="text-lg font-semibold break-words text-ink">
            <Link href={`/pharmacie/molecule/${alert.moleculeId}`}>{alert.moleculeName}</Link>
          </h2>
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-muted">{t('core.alerts.from')}</span>
            <LevelBadge level={alert.from} />
            <span className="text-sm text-ink-muted">{t('core.alerts.to')}</span>
            <LevelBadge level={alert.to} />
            <Origins origins={alert.evidence.origins} />
          </p>
        </header>

        <LevelExplanation rule={alert.rule} evidence={alert.evidence} />
        {arrival && !standDown ? <ArrivalLine arrival={arrival} /> : null}

        {standDown ? (
          <div className="flex flex-col gap-3">
            <p className="max-w-prose text-ink">
              {t('core.guidance.standDown', { molecule: alert.moleculeName, level: t(`core.levels.${alert.to}`) })}
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
              {t('core.alerts.markRead')}
            </button>
          </form>
        ) : null}
      </article>
    </li>
  );
}

/** Messages from the Ordre des pharmaciens to this pharmacy's governorate: sender, badge, disclaimer. */
function OrderMessages({ messages }: { messages: OrderMessage[] }) {
  if (messages.length === 0) return null;
  return (
    <section aria-labelledby="messages-ordre" className="flex flex-col gap-3">
      <h2 id="messages-ordre" className="text-lg font-semibold text-ink">
        {t('core.alerts.orderTitle')}
      </h2>
      <ul className="flex flex-col gap-3">
        {messages.map((m) => (
          <li key={m.id}>
            <article className="panel flex flex-col gap-2 border-s-4 border-s-brand p-4">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                <span className="font-medium text-ink">{t('core.alerts.orderFrom', { sender: m.senderName ?? '' })}</span>
                <time dateTime={m.sentAt}>{t('core.common.dateAt', { date: formatDate(m.sentAt), time: formatTime(m.sentAt) })}</time>
                <OriginBadge origin={m.origin} />
              </p>
              <p className="max-w-prose break-words text-ink">{m.body}</p>
              <Disclaimer />
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function PharmacyAlerts() {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  const alerts = await getAlerts();
  const client = await createUserClient();
  const [messages, arrivals] = await Promise.all([
    orderMessagesForMe(client).catch(() => [] as OrderMessage[]),
    upcomingArrivals(client, [...new Set(alerts.map((a) => a.moleculeId))]).catch(() => new Map<string, Arrival>()),
  ]);
  const unread = alerts.some((a) => a.readAt === null);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <LiveRefresh table="alerts" filter={`organisation_id=eq.${session.organisation.id}`} fallbackMs={15_000} />
      <section aria-labelledby="alertes" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 id="alertes" className="text-2xl font-semibold tracking-tight text-ink">
              {t('core.alerts.title')}
            </h1>
            <p className="text-sm text-ink-muted">{t('core.alerts.live')}</p>
          </div>
          {unread ? (
            <form action={markAllAlertsRead}>
              <button
                type="submit"
                className="min-h-12 text-sm font-medium text-brand underline underline-offset-4 hover:text-brand-strong"
              >
                {t('core.alerts.markAllRead')}
              </button>
            </form>
          ) : null}
        </div>
        <OrderMessages messages={messages} />
        {alerts.length === 0 ? (
          <div className="panel px-4">
            <EmptyState afterRule title={t('core.alerts.emptyTitle')} body={t('core.alerts.emptyBody')} />
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {alerts.map((a) => (
              <AlertItem key={a.id} alert={a} arrival={arrivals.get(a.moleculeId) ?? null} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
