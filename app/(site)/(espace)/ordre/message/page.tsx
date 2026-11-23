import { redirect } from 'next/navigation';
import { Button } from '@/components/Button';
import { Panel } from '@/components/console/Panel';
import { OriginBadge } from '@/components/OriginBadge';
import { PageHeader } from '@/components/PageHeader';
import { getCurrentSession } from '@/lib/auth/session';
import { createUserClient } from '@/lib/db/server';
import { HOME_BY_TYPE } from '@/lib/demo/roles';
import { formatDate, formatTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { sentOrderMessages } from '@/lib/institutions/data';
import { governorates } from '@/lib/public/governorates';
import { sendOrderMessage } from './actions';

// "Message aux pharmaciens": a short professional message to the pharmacies of chosen
// governorates, shown in their alerts with the sender, its badge and the disclaimer.
export default async function OrderMessagePage({ searchParams }: PageProps<'/ordre/message'>) {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  if (session.organisation.type !== 'pharmacists_order') redirect(HOME_BY_TYPE[session.organisation.type]);

  const { envoye, erreur } = await searchParams;
  const client = await createUserClient();
  const sent = await sentOrderMessages(client);
  const govs = governorates('fr');
  const name = new Map(govs.map((g) => [g.code, g.name]));
  const status =
    envoye === '1'
      ? { ok: true, text: t('core.order.sent') }
      : erreur === 'texte'
        ? { ok: false, text: t('core.order.errorBody') }
        : erreur === 'gouvernorats'
          ? { ok: false, text: t('core.order.errorGovernorates') }
          : erreur
            ? { ok: false, text: t('core.order.error') }
            : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader meta={t('core.orgTypes.pharmacists_order')} title={t('core.order.messageTitle')} description={t('core.order.messageIntro')} />
      {status ? (
        <p role="status" className={`panel border-s-4 p-4 text-ink ${status.ok ? 'border-s-level-cleared' : 'border-s-level-confirmed'}`}>
          {status.text}
        </p>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title={t('core.order.messageTitle')} titleId="ecrire" className="self-start">
          <form action={sendOrderMessage} className="flex flex-col gap-5">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              {t('core.order.bodyLabel')}
              <span className="font-normal text-ink-muted">{t('core.order.bodyHint')}</span>
              <textarea
                name="body"
                required
                minLength={10}
                maxLength={600}
                rows={5}
                className="w-full rounded-md border border-ink-muted bg-surface p-3 text-base font-normal text-ink"
              />
            </label>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium text-ink">{t('core.order.governoratesLabel')}</legend>
              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                {govs.map((g) => (
                  <label key={g.code} className="flex min-h-12 items-center gap-3 text-ink">
                    <input type="checkbox" name="governorates" value={g.code} className="size-5 accent-[var(--brand)]" />
                    {g.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="text-sm text-ink-muted">{t('core.guidance.disclaimer')}</p>
            <Button type="submit" className="sm:self-start">
              {t('core.order.send')}
            </Button>
          </form>
        </Panel>
        <Panel title={t('core.order.sentTitle')} titleId="envoyes" id="envoyes" className="self-start scroll-mt-20" bodyClassName="px-4">
          {sent.length === 0 ? (
            <p className="py-6 text-sm text-ink-muted">{t('core.order.sentEmpty')}</p>
          ) : (
            <ul className="hairline-list">
              {sent.map((m) => (
                <li key={m.id} className="flex flex-col gap-1.5 py-3">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                    <time dateTime={m.sentAt}>{t('core.common.dateAt', { date: formatDate(m.sentAt), time: formatTime(m.sentAt) })}</time>
                    <OriginBadge origin={m.origin} />
                  </p>
                  <p className="max-w-prose break-words text-ink">{m.body}</p>
                  <p className="text-sm text-ink-muted">
                    {t('core.order.sentTo', { governorates: (m.governorates ?? []).map((c) => name.get(c) ?? c).join(', ') })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
