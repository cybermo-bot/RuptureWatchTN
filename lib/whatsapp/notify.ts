// After a level change, from any path (web report, WhatsApp report, daily recompute): send the
// WhatsApp alerts to linked pharmacies. Does nothing when WhatsApp is not configured. Never
// throws: the level change is stored already, and the alert is in the web space anyway.

import 'server-only';
import { createServiceClient } from '@/lib/db/server';
import type { RecomputeResult } from '@/lib/signals/recompute';
import { siteUrl } from '@/lib/site';
import { sendWhatsAppAlerts } from './alerts';
import { whatsappEnv } from './client';

export async function notifyLevelChange(result: Pick<RecomputeResult, 'eventId' | 'moleculeId'>, excludeOrganisationId?: string) {
  const env = whatsappEnv();
  if (!env || result.eventId === null) return;
  try {
    const sent = await sendWhatsAppAlerts(createServiceClient(), result.eventId, result.moleculeId, {
      env,
      siteUrl: siteUrl(),
      excludeOrganisationId,
    });
    console.info('whatsapp alerts', { eventId: result.eventId, ...sent });
  } catch (error) {
    console.error('whatsapp alerts failed', error instanceof Error ? error.message : error);
  }
}
