import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PharmacyHeader } from '@/components/PharmacyHeader';
import { WhatsAppLinkForm } from '@/components/WhatsAppLinkForm';
import { unlinkNumber } from '@/app/actions/whatsapp';
import { getCurrentSession } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/db/server';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { whatsappEnv } from '@/lib/whatsapp/client';
import { maskPhone } from '@/lib/whatsapp/link';

export const metadata: Metadata = { title: t('core.whatsappLink.title') };

const HOW = ['report', 'search', 'alerts'] as const;

// The pharmacy's WhatsApp numbers. wa_links is service-role only, so the session's own
// organisation is the only filter, applied here; numbers are shown masked.
export default async function PharmacyWhatsApp() {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');
  const { data, error } = await createServiceClient()
    .from('wa_links')
    .select('id, reply_to, linked_at')
    .eq('organisation_id', session.organisation.id)
    .order('linked_at', { ascending: true });
  if (error) console.error('wa_links read failed', { code: error.code });
  const links = (data ?? []) as { id: string; reply_to: string; linked_at: string }[];
  const enabled = whatsappEnv() !== null;

  return (
    <div className="flex flex-col gap-8">
      <PharmacyHeader session={session} active="whatsapp" />
      <p className="max-w-prose text-ink">{t('core.whatsappLink.intro')}</p>
      {!enabled ? <p className="max-w-prose border-s-2 border-line ps-4 text-ink-muted">{t('core.whatsappLink.unavailable')}</p> : null}

      <section aria-labelledby="relies" className="flex flex-col gap-3">
        <h2 id="relies" className="text-lg font-semibold text-ink">
          {t('core.whatsappLink.linkedTitle')}
        </h2>
        {links.length === 0 ? (
          <p className="text-ink-muted">{t('core.whatsappLink.linkedNone')}</p>
        ) : (
          <ul className="hairline-list max-w-md border-y border-line">
            {links.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-4 py-2">
                <span className="flex flex-col">
                  <span className="font-mono text-ink">{maskPhone(l.reply_to)}</span>
                  <span className="text-sm text-ink-muted">{t('core.whatsappLink.linkedSince', { date: formatDate(l.linked_at) })}</span>
                </span>
                <form action={unlinkNumber}>
                  <input type="hidden" name="link_id" value={l.id} />
                  <button type="submit" className="flex min-h-12 items-center px-2 text-brand underline underline-offset-2">
                    {t('core.whatsappLink.unlink')}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {enabled ? (
        <section aria-labelledby="relier" className="flex flex-col gap-3">
          <h2 id="relier" className="text-lg font-semibold text-ink">
            {t('core.whatsappLink.addTitle')}
          </h2>
          <WhatsAppLinkForm />
        </section>
      ) : null}

      <section aria-labelledby="sur-whatsapp" className="flex flex-col gap-3">
        <h2 id="sur-whatsapp" className="text-lg font-semibold text-ink">
          {t('core.whatsappLink.howTitle')}
        </h2>
        <ul className="flex max-w-prose list-disc flex-col gap-2 ps-5 text-ink marker:text-ink-muted">
          {HOW.map((k) => (
            <li key={k}>{t(`core.whatsappLink.how.${k}`)}</li>
          ))}
        </ul>
        <p className="max-w-prose text-sm text-ink-muted">{t('core.whatsappLink.alertsWindow')}</p>
      </section>
    </div>
  );
}
