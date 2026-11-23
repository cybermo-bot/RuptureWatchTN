// WhatsApp alerts: when a followed molecule changes level, the linked pharmacies that follow it
// receive the alert. Inside the 24-hour window (the pharmacy wrote to us in the last 24 hours)
// a free-form message is allowed; outside it, Meta requires an approved utility template
// (WHATSAPP_ALERT_TEMPLATE). Until one is approved, pharmacies outside the window are skipped
// and counted: they still have the alert in their web space. Server only.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { t } from '@/lib/i18n';
import type { Level, RuleId } from '@/lib/signal';
import { explanationText } from '@/lib/signals/explanation';
import type { ShownEvidence } from '@/lib/signals/shown';
import { levelWord } from './bot';
import { sendMessage, type WhatsAppEnv } from './client';
import type { Outbound } from './messages';

const WINDOW_MS = 24 * 3_600_000;

export type AlertDelivery = 'text' | 'template' | 'skip';

/** Free-form inside the 24-hour window, the template outside it when approved, otherwise nothing. */
export function alertDelivery(lastInboundAt: string | null, now: Date, templateApproved: boolean): AlertDelivery {
  if (lastInboundAt && now.getTime() - new Date(lastInboundAt).getTime() < WINDOW_MS) return 'text';
  return templateApproved ? 'template' : 'skip';
}

export interface AlertEvent {
  moleculeName: string;
  from: Level;
  to: Level;
  rule: RuleId;
  evidence: ShownEvidence;
}

/** The free-form alert: level, explanation, link, and the disclaimer line. No pharmacy is named. */
export function alertText(e: AlertEvent, siteUrl: string): string {
  return t('core.whatsapp.alert', {
    name: e.moleculeName,
    level: levelWord(e.to),
    before: levelWord(e.from),
    explanation: explanationText(e.rule, e.evidence),
    url: `${siteUrl}/pharmacie/alertes`,
    disclaimer: t('core.guidance.disclaimer'),
  });
}

/** The template message: {{1}} medicine, {{2}} level, {{3}} link. The disclaimer is in the approved text. */
export function alertTemplate(e: AlertEvent, siteUrl: string, name: string): Outbound {
  return { type: 'template', name, language: 'fr', bodyParams: [e.moleculeName, levelWord(e.to), `${siteUrl}/pharmacie/alertes`] };
}

export interface AlertDispatchResult {
  text: number;
  template: number;
  skipped: number;
  failed: number;
}

/** Sends the WhatsApp alerts for one level change. The reporter, answered already, is left out. */
export async function sendWhatsAppAlerts(
  client: SupabaseClient,
  eventId: number,
  moleculeId: string,
  opts: { env: WhatsAppEnv; siteUrl: string; now?: Date; excludeOrganisationId?: string },
): Promise<AlertDispatchResult> {
  const now = opts.now ?? new Date();
  const result: AlertDispatchResult = { text: 0, template: 0, skipped: 0, failed: 0 };
  const template = process.env.WHATSAPP_ALERT_TEMPLATE || null;

  const { data: events, error: eventError } = await client.rpc('signal_events_view', { p_molecule_id: moleculeId, p_limit: 20 });
  if (eventError) throw new Error(`signal_events_view: ${eventError.message}`);
  const event = ((events ?? []) as { id: number; molecule_name: string; from_level: Level; to_level: Level; rule: RuleId; evidence: ShownEvidence }[]).find(
    (e) => Number(e.id) === Number(eventId),
  );
  if (!event) return result;

  const { data: alerts, error: alertError } = await client
    .from('alerts')
    .select('organisation_id, organisations!inner(type)')
    .eq('signal_event_id', eventId)
    .eq('organisations.type', 'pharmacy');
  if (alertError) throw new Error(`alerts: ${alertError.message}`);
  const orgs = [...new Set((alerts ?? []).map((a) => a.organisation_id as string))].filter((id) => id !== opts.excludeOrganisationId);
  if (orgs.length === 0) return result;

  const { data: links, error: linkError } = await client.from('wa_links').select('reply_to, last_inbound_at').in('organisation_id', orgs);
  if (linkError) throw new Error(`wa_links: ${linkError.message}`);

  const e: AlertEvent = { moleculeName: event.molecule_name, from: event.from_level, to: event.to_level, rule: event.rule, evidence: event.evidence };
  for (const link of (links ?? []) as { reply_to: string; last_inbound_at: string | null }[]) {
    const how = alertDelivery(link.last_inbound_at, now, template !== null);
    if (how === 'skip') {
      result.skipped += 1;
      continue;
    }
    const message = how === 'text' ? ({ type: 'text', body: alertText(e, opts.siteUrl) } as const) : alertTemplate(e, opts.siteUrl, template!);
    try {
      await sendMessage({ to: link.reply_to }, message, opts.env);
      result[how] += 1;
    } catch (error) {
      result.failed += 1;
      console.error('whatsapp alert failed', error instanceof Error ? error.message : error);
    }
  }
  return result;
}
