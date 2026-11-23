import { ArrivalLine, CatalogueLine } from '@/components/institutions/Lines';
import type { ReactNode } from 'react';
import { Origins } from '@/components/Origins';
import { GOVERNORATE_SHAPES } from '@/components/GovernorateMap';
import { LevelBadge } from '@/components/LevelBadge';
import { LevelExplanation } from '@/components/LevelExplanation';
import { OriginBadge } from '@/components/OriginBadge';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { DEFAULT_PARAMS, type Level, type RuleId } from '@/lib/signal';
import type { ShownEvidence } from '@/lib/signals/shown';
import { DEMAND_WINDOW_DAYS, type DemandRow, type GovernorateCount } from '@/lib/signals/views';
import type { AlertView } from '@/lib/pharmacy/data';
import type { FourViews, PanelKey, ProbeKey, Probes } from '@/lib/views/four-views';

// The four panels of /vues. Server component: each panel renders only what its own role's
// loader returned (lib/views/four-views.ts). data-panel marks each panel for the checks.

const GOV_NAME = new Map(GOVERNORATE_SHAPES.map((g) => [g.code, g.name]));

function Panel({ panel, account, children }: { panel: PanelKey; account: ReactNode; children: ReactNode }) {
  const id = `panneau-${panel}`;
  return (
    <section aria-labelledby={id} data-panel={panel} className="panel flex min-w-0 flex-col gap-5 border-t-4 border-t-ink p-4">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-lg font-semibold text-ink">
          {t(`core.views.panels.${panel}`)}
        </h2>
        <div className="text-sm text-ink-muted">{account}</div>
      </div>
      {children}
    </section>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <h3 className="text-sm font-medium text-ink-muted">{title}</h3>
      {children}
    </div>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <p className="text-sm text-ink-muted">{children}</p>;
}

function SignalBlock({ signal }: { signal: { level: Level; rule: RuleId; evidence: ShownEvidence } | null }) {
  return (
    <Block title={t('core.views.level')}>
      {signal ? (
        <>
          <p className="flex flex-wrap items-center gap-2">
            <LevelBadge level={signal.level} />
            <Origins origins={signal.evidence.origins ?? []} />
          </p>
          <LevelExplanation rule={signal.rule} evidence={signal.evidence} />
        </>
      ) : (
        <Muted>{t('core.views.noSignal')}</Muted>
      )}
    </Block>
  );
}

function AlertsBlock({ alerts }: { alerts: AlertView[] }) {
  return (
    <Block title={t('core.views.alerts')}>
      {alerts.length === 0 ? (
        <Muted>{t('core.views.alertsNone')}</Muted>
      ) : (
        <ul className="hairline-list text-sm">
          {alerts.slice(0, 5).map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5">
              <time dateTime={a.sentAt} className="font-mono text-ink-muted">
                {formatDate(a.sentAt)}
              </time>
              <LevelBadge level={a.from} />
              <span aria-hidden="true">{'→'}</span>
              <LevelBadge level={a.to} />
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

function CountsBlock({ counts }: { counts: GovernorateCount[] }) {
  return (
    <Block title={t('core.views.counts', { days: DEFAULT_PARAMS.confirmWindowDays })}>
      {counts.length === 0 ? (
        <Muted>{t('core.views.countsNone')}</Muted>
      ) : (
        <ul className="hairline-list text-sm">
          {counts.map((c) => (
            <li key={c.governorate_code} className="flex justify-between gap-3 py-1.5">
              <span>{c.governorate_name || GOV_NAME.get(c.governorate_code)}</span>
              <span className="font-mono">{c.pharmacies}</span>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

function DemandBlock({ demand }: { demand: DemandRow[] }) {
  return (
    <Block title={t('core.views.demand', { days: DEMAND_WINDOW_DAYS })}>
      {demand.length === 0 ? (
        <Muted>{t('core.views.demandNone')}</Muted>
      ) : (
        <ul className="hairline-list text-sm">
          {demand.map((d) => (
            <li key={d.governorate_code} className="flex flex-col py-1.5">
              <span>{GOV_NAME.get(d.governorate_code) ?? d.governorate_code}</span>
              <span className="text-ink-muted">{t('core.views.demandRow', { requests: d.requests, unanswered: d.unanswered })}</span>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

function Withheld({ probes }: { probes: Probes }) {
  const keys = Object.keys(probes) as ProbeKey[];
  if (keys.length === 0) return null;
  return (
    <Block title={t('core.views.withheld')}>
      <ul className="flex flex-col gap-1 text-sm">
        {keys.map((k) => (
          <li key={k} data-probe={k} data-result={probes[k]}>
            {t(`core.views.probe.${k}`)}
            {' : '}
            <span className="font-medium">{t(`core.views.result.${probes[k]!}`)}</span>
          </li>
        ))}
      </ul>
      <Muted>{t('core.views.withheldNote')}</Muted>
    </Block>
  );
}

export function FourViewsPanels({
  data,
  accounts,
}: {
  data: FourViews;
  accounts: Record<'wholesaler' | 'coordination' | 'central' | 'order', string>;
}) {
  const { pharmacy, wholesaler, coordination, central, order } = data;
  const pub = data.public;
  return (
    <div className="grid gap-10 md:grid-cols-2 md:gap-8 xl:grid-cols-3 xl:gap-6">
      <Panel
        panel="pharmacy"
        account={
          <>
            <p>{t('core.views.account', { account: pharmacy.organisationName ?? '' })}</p>
            <p>{t('core.views.ownName')}</p>
          </>
        }
      >
        <SignalBlock signal={pharmacy.view.signal} />
        <Muted>{pharmacy.view.followed ? t('core.views.follows') : t('core.views.notFollowing')}</Muted>
        <Block title={t('core.views.ownReports')}>
          {pharmacy.view.reports.length === 0 ? (
            <Muted>{t('core.views.ownReportsNone')}</Muted>
          ) : (
            <ul className="hairline-list text-sm">
              {pharmacy.view.reports.slice(0, 5).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5">
                  <time dateTime={r.reportedAt} className="font-mono text-ink-muted">
                    {formatDate(r.reportedAt)}
                  </time>
                  <span>{t(`core.views.kind.${r.kind}`)}</span>
                  <OriginBadge origin={r.origin} />
                </li>
              ))}
            </ul>
          )}
        </Block>
        <AlertsBlock alerts={pharmacy.alerts} />
        <Withheld probes={pharmacy.probes} />
      </Panel>

      <Panel panel="wholesaler" account={<p>{t('core.views.account', { account: accounts.wholesaler })}</p>}>
        <SignalBlock signal={wholesaler.signal} />
        <CountsBlock counts={wholesaler.counts} />
        <DemandBlock demand={wholesaler.demand} />
        <AlertsBlock alerts={wholesaler.alerts} />
        <Withheld probes={wholesaler.probes} />
      </Panel>

      <Panel panel="coordination" account={<p>{t('core.views.account', { account: accounts.coordination })}</p>}>
        <SignalBlock signal={coordination.signal} />
        <CountsBlock counts={coordination.counts} />
        <DemandBlock demand={coordination.demand} />
        <Block title={t('core.views.notices')}>
          {coordination.notices.length === 0 ? (
            <Muted>{t('core.views.noticesNone')}</Muted>
          ) : (
            <ul className="hairline-list text-sm">
              {coordination.notices.map((n) => (
                <li key={n.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5">
                  <a href={n.url} target="_blank" rel="noopener noreferrer">
                    {n.source}
                  </a>
                  <time dateTime={n.publishedAt.toISOString()} className="font-mono text-ink-muted">
                    {formatDate(n.publishedAt.toISOString())}
                  </time>
                  <OriginBadge origin={n.origin} />
                </li>
              ))}
            </ul>
          )}
        </Block>
        <Block title={t('core.views.timeline')}>
          {coordination.timeline.length === 0 ? (
            <Muted>{t('core.views.timelineNone')}</Muted>
          ) : (
            <ol className="hairline-list text-sm">
              {coordination.timeline.slice(0, 6).map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5">
                  <time dateTime={e.at} className="font-mono text-ink-muted">
                    {formatDate(e.at)}
                  </time>
                  <LevelBadge level={e.to_level} />
                </li>
              ))}
            </ol>
          )}
        </Block>
        <Withheld probes={coordination.probes} />
      </Panel>

      <Panel panel="central" account={<p>{t('core.views.account', { account: accounts.central })}</p>}>
        <SignalBlock signal={central.signal} />
        <Block title={t('core.views.catalogue')}>
          {central.facts ? (
            <p className="text-sm text-ink">
              <CatalogueLine facts={central.facts} />
            </p>
          ) : (
            <Muted>{t('core.catalogue.categoryNone')}</Muted>
          )}
        </Block>
        <Block title={t('core.views.arrival')}>
          {central.arrival ? <ArrivalLine arrival={central.arrival} /> : <Muted>{t('core.views.noArrival')}</Muted>}
        </Block>
        <Muted>{t('core.views.centralSees')}</Muted>
        <Withheld probes={central.probes} />
      </Panel>

      <Panel panel="order" account={<p>{t('core.views.account', { account: accounts.order })}</p>}>
        <Block title={t('core.views.network')}>
          <p className="text-sm text-ink">{t('core.views.orderNetwork', { n: order.governorates })}</p>
        </Block>
        <Muted>{t('core.views.orderSees')}</Muted>
        <Withheld probes={order.probes} />
      </Panel>

      <Panel panel="public" account={<p>{t('core.views.publicAccount')}</p>}>
        <Block title={t('core.views.level')}>
          {pub.status.confirmed && pub.status.since ? (
            <>
              <p className="flex flex-wrap items-center gap-2">
                <LevelBadge level="confirmed" />
                <Origins origins={pub.status.origins} />
              </p>
              <p className="text-ink">{t('core.views.publicConfirmed', { date: formatDate(pub.status.since) })}</p>
              <p className="text-sm text-ink">{t('core.views.publicGuidance')}</p>
              <p className="text-sm font-medium text-ink">{t('core.guidance.disclaimer')}</p>
            </>
          ) : (
            <>
              <p className="font-medium text-ink">{t('core.views.publicNone')}</p>
              <Muted>{t('core.views.publicNoneNote')}</Muted>
            </>
          )}
        </Block>
        <Withheld probes={pub.probes} />
      </Panel>
    </div>
  );
}
