import { redirect } from 'next/navigation';
import { DailyBars } from '@/components/charts/DailyBars';
import { Panel } from '@/components/console/Panel';
import { EmptyState } from '@/components/EmptyState';
import { Origins } from '@/components/Origins';
import { PageHeader } from '@/components/PageHeader';
import { getCurrentSession } from '@/lib/auth/session';
import { createUserClient } from '@/lib/db/server';
import { HOME_BY_TYPE } from '@/lib/demo/roles';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { NETWORK_ACTIVE_DAYS, networkWeekly, pharmacyNetwork } from '@/lib/institutions/data';
import type { Origin } from '@/lib/signal';

const WEEKS = 8;
const ORIGIN_ORDER: Origin[] = ['official_source', 'tester', 'simulated'];

// The Ordre des pharmaciens' space (designed for it, never "used by"): the participation picture.
// Member pharmacies and active ones by governorate, reports per week. Counts only, "<3" under three,
// never a pharmacy, never a report (pharmacy_network, network_weekly).
export default async function OrderHome() {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  if (session.organisation.type !== 'pharmacists_order') redirect(HOME_BY_TYPE[session.organisation.type]);

  const client = await createUserClient();
  const [network, weeks] = await Promise.all([pharmacyNetwork(client), networkWeekly(client, WEEKS)]);
  const weekOrigins = ORIGIN_ORDER.filter((o) => weeks.some((w) => w.origins?.includes(o)));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader meta={t('core.orgTypes.pharmacists_order')} title={t('core.space.titles.pharmacists_order')} description={t('core.order.intro')} />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title={t('core.order.networkTitle')}
          titleId="reseau"
          description={network[0]?.origins?.length ? <Origins origins={network[0].origins} /> : undefined}
          className="self-start"
        >
          {network.length === 0 ? (
            <EmptyState title={t('core.order.networkEmpty')} body={t('core.order.networkNote', { days: NETWORK_ACTIVE_DAYS })} />
          ) : (
            <div className="flex flex-col gap-3">
              <table className="hairline-table text-sm">
                <thead>
                  <tr>
                    <th scope="col">{t('core.coordination.colGovernorate')}</th>
                    <th scope="col" className="text-end">
                      {t('core.order.colMembers')}
                    </th>
                    <th scope="col" className="text-end">
                      {t('core.order.colActive', { days: NETWORK_ACTIVE_DAYS })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {network.map((r) => (
                    <tr key={r.governorate_code}>
                      <td>{r.governorate_name}</td>
                      <td className="text-end font-mono">{r.members}</td>
                      <td className="text-end font-mono">{r.active}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-sm text-ink-muted">{t('core.order.networkNote', { days: NETWORK_ACTIVE_DAYS })}</p>
            </div>
          )}
        </Panel>
        <Panel title={t('core.order.weeklyTitle')} titleId="semaines" description={weekOrigins.length ? <Origins origins={weekOrigins} /> : undefined} className="self-start">
          <div className="flex flex-col gap-4">
            <DailyBars
              id="signalements-semaine"
              title={t('core.order.colReports')}
              colour="var(--brand)"
              data={weeks.map((w) => ({ day: new Date(`${w.week_start}T12:00:00Z`), value: w.reports === '<3' ? '<3' : Number(w.reports) || 0 }))}
            />
            <table className="hairline-table text-sm">
              <thead>
                <tr>
                  <th scope="col">{t('core.order.colWeek')}</th>
                  <th scope="col" className="text-end">
                    {t('core.order.colReports')}
                  </th>
                  <th scope="col" className="text-end">
                    {t('core.order.colPharmacies')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.week_start}>
                    <td>{t('core.order.weekOf', { date: formatDate(w.week_start) })}</td>
                    <td className="text-end font-mono">{w.reports}</td>
                    <td className="text-end font-mono">{w.pharmacies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
