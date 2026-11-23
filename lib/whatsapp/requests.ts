// When a patient asks, the linked pharmacies of that governorate hear of it on WhatsApp, with
// a button that opens the question. Free-form messages only reach a pharmacy that wrote to the
// bot in the last 24 hours (Meta's rule); the others are skipped and still see the request in
// their web space. Does nothing when WhatsApp is not configured. Never throws, never names the
// patient (there is no one to name) or another pharmacy. Server only.

import 'server-only';
import { createServiceClient } from '@/lib/db/server';
import { t } from '@/lib/i18n';
import { alertDelivery } from './alerts';
import { sendMessage, whatsappEnv } from './client';

export async function notifyNewRequest(requestId: string, governorateCode: string, moleculeName: string, now = new Date()): Promise<void> {
  const env = whatsappEnv();
  if (!env) return;
  const sent = { text: 0, skipped: 0, failed: 0 };
  try {
    const client = createServiceClient();
    const { data, error } = await client
      .from('wa_links')
      .select('reply_to, last_inbound_at, organisations!inner(type, governorate_code)')
      .eq('organisations.type', 'pharmacy')
      .eq('organisations.governorate_code', governorateCode);
    if (error) throw new Error(`wa_links: ${error.code}`);
    for (const link of (data ?? []) as unknown as { reply_to: string; last_inbound_at: string | null }[]) {
      if (alertDelivery(link.last_inbound_at, now, false) !== 'text') {
        sent.skipped += 1;
        continue;
      }
      try {
        await sendMessage(
          { to: link.reply_to },
          {
            type: 'buttons',
            body: t('core.whatsapp.newRequest', { name: moleculeName }),
            buttons: [{ id: `rw:q:${requestId}`, title: t('core.requests.answerNow') }],
          },
          env,
        );
        sent.text += 1;
      } catch {
        sent.failed += 1;
      }
    }
    console.info('whatsapp request notices', sent);
  } catch (error) {
    console.error('whatsapp request notices failed', error instanceof Error ? error.message : error);
  }
}
