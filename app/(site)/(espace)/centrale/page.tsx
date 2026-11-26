import { redirect } from 'next/navigation';
import { Button, buttonClass } from '@/components/Button';
import { Panel } from '@/components/console/Panel';
import { MedicineDecision } from '@/components/coordination/MedicineDecision';
import { presentationsReported } from '@/lib/presentations/reported';
import { EmptyState } from '@/components/EmptyState';
import { ArrivalLine, CatalogueLine } from '@/components/institutions/Lines';
import { LiveRefresh } from '@/components/LiveRefresh';
import { PageHeader } from '@/components/PageHeader';
import { getCurrentSession } from '@/lib/auth/session';
import { createUserClient } from '@/lib/db/server';
import { HOME_BY_TYPE } from '@/lib/demo/roles';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { byLevelCategoryBrands } from '@/lib/institutions/catalogue';
import { ARRIVAL_QUANTITIES, loadCatalogueFacts, tunisDayIn, tunisToday, upcomingArrivals } from '@/lib/institutions/data';
import { listSignals, sortSignals } from '@/lib/signals/views';
import { announceArrival } from './actions';

// The Pharmacie centrale's space (designed for it, never "used by"): every medicine with a level,
// its CNAM category and other brands, and for "probable" or "confirmée" the "Arrivage annoncé"
// form. An announcement never changes a level; pharmacies and, once confirmed, the public see it.
export default async function CentralHome({ searchParams }: PageProps<'/centrale'>) {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  if (session.organisation.type !== 'central_pharmacy') redirect(HOME_BY_TYPE[session.organisation.type]);

  const { annonce, erreur, m } = await searchParams;
  const client = await createUserClient();
  const all = sortSignals(await listSignals(client));
  const ids = all.map((s) => s.molecule_id);
  const [facts, arrivals] = await Promise.all([loadCatalogueFacts(client, ids), upcomingArrivals(client, ids)]);
  const signals = byLevelCategoryBrands(all, facts);
  // Pilot-3 item 2: the presentations reported for each medicine of the list.
  const presentations = new Map(await Promise.all(signals.map(async (s) => [s.molecule_id, await presentationsReported(s.molecule_id)] as const)));
  const today = tunisToday();
  const max = tunisDayIn(365);
  const named = signals.find((s) => s.molecule_id === m)?.molecule_name ?? '';
  const message =
    annonce === 'ok' && named
      ? { ok: true, text: t('core.central.sent', { molecule: named }) }
      : erreur === 'niveau'
        ? { ok: false, text: t('core.central.errorLevel') }
        : erreur === 'date'
          ? { ok: false, text: t('core.central.errorDate') }
          : erreur
            ? { ok: false, text: t('core.central.error') }
            : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader meta={t('core.orgTypes.central_pharmacy')} title={t('core.space.titles.central_pharmacy')} description={t('core.central.intro')} />
      <LiveRefresh table="signals" fallbackMs={15_000} />
      {message ? (
        <p role="status" className={`panel border-s-4 p-4 text-ink ${message.ok ? 'border-s-level-cleared' : 'border-s-level-confirmed'}`}>
          {message.text}
        </p>
      ) : null}
      <Panel title={t('core.central.listTitle')} titleId="risque" description={t('core.central.listIntro')} bodyClassName="">
        {signals.length === 0 ? (
          <div className="px-4">
            <EmptyState title={t('core.central.empty')} body={t('core.coordination.emptyBody')} />
          </div>
        ) : (
          <ul className="hairline-list">
            {signals.map((s) => {
              const arrival = arrivals.get(s.molecule_id);
              const eligible = s.level === 'likely' || s.level === 'confirmed';
              const formId = `annonce-${s.molecule_id}`;
              return (
                <li key={s.molecule_id} id={`m-${s.molecule_id}`} className="flex scroll-mt-20 flex-col gap-2 px-4 py-4">
                  <span className="font-medium break-words text-ink">{s.molecule_name}</span>
                  <MedicineDecision signal={s} presentations={presentations.get(s.molecule_id)} action={eligible ? (
                    <details className="group mt-1" open={m === s.molecule_id && Boolean(erreur)}>
                      <summary className={buttonClass('primary', 'w-fit cursor-pointer list-none [&::-webkit-details-marker]:hidden')}>
                        {t('core.central.announceTitle')}
                      </summary>
                      <form action={announceArrival} aria-labelledby={`${formId}-titre`} className="mt-2 flex max-w-xl flex-col gap-4 rounded-sm border border-line p-4">
                        <input type="hidden" name="molecule_id" value={s.molecule_id} />
                        <p id={`${formId}-titre`} className="text-sm text-ink-muted">
                          {t('core.central.announceHint')}
                        </p>
                        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
                          {t('core.central.dateLabel')}
                          <input
                            type="date"
                            name="expected_on"
                            required
                            min={today}
                            max={max}
                            className="min-h-12 w-full max-w-xs rounded-sm border border-ink-muted bg-surface px-3 text-base font-normal"
                          />
                        </label>
                        <fieldset className="flex flex-col gap-1">
                          <legend className="mb-1 text-sm font-medium text-ink">{t('core.central.quantityLabel')}</legend>
                          {ARRIVAL_QUANTITIES.map((q, i) => (
                            <label key={q} className="flex min-h-12 items-center gap-3 text-ink">
                              <input type="radio" name="quantity" value={q} required defaultChecked={i === 1} className="size-5 accent-[var(--brand)]" />
                              {t(`core.arrival.quantity.${q}`)}
                            </label>
                          ))}
                        </fieldset>
                        <p className="text-sm text-ink-muted">{t('core.arrival.levelNote')}</p>
                        <Button type="submit" className="sm:self-start">
                          {t('core.central.submit')}
                        </Button>
                      </form>
                    </details>
                  ) : null}>
                    <p>{t('core.pharmacy.since', { date: formatDate(s.since) })}</p>
                    <p><CatalogueLine facts={facts.get(s.molecule_id)} /></p>
                  </MedicineDecision>
                  {arrival ? <ArrivalLine arrival={arrival} /> : null}
                </li>
              );
            })}
          </ul>
        )}
        <p className="border-t border-line px-4 py-3 text-xs text-ink-muted">{t('core.catalogue.source')}</p>
      </Panel>
    </div>
  );
}
