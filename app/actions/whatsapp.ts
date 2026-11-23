'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentSession, type CurrentSession } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/db/server';
import { t } from '@/lib/i18n';
import { sendMessage, whatsappEnv, WhatsAppSendError } from '@/lib/whatsapp/client';
import { hashPhone } from '@/lib/whatsapp/inbound';
import {
  CODE_TTL_MS,
  hashCode,
  maskPhone,
  MAX_CODE_ATTEMPTS,
  MAX_LINKS_PER_PHARMACY,
  newCode,
  normalisePhone,
  RESEND_AFTER_MS,
} from '@/lib/whatsapp/link';

// Linking a WhatsApp number from the pharmacy space: type the number, receive a 6-digit code
// on WhatsApp, type it back. The tables are service-role only (no policy), so every action
// checks the pharmacy session first and only ever touches that pharmacy's rows.

export type LinkState =
  | { status: 'idle' }
  | { status: 'invalid' | 'unavailable' | 'wait' | 'taken' | 'limit' | 'send_failed' | 'error' }
  | { status: 'sent'; masked: string }
  | { status: 'wrong' | 'expired' | 'locked'; masked?: string }
  | { status: 'linked' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requirePharmacy(): Promise<CurrentSession | null> {
  const session = await getCurrentSession();
  return session?.organisation.type === 'pharmacy' ? session : null;
}

/** Step one: the number. Sends the code by WhatsApp (the approved template when there is one). */
export async function requestLinkCode(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const session = await requirePharmacy();
  if (!session) return { status: 'error' };
  const digits = normalisePhone(String(formData.get('phone') ?? ''));
  if (!digits) return { status: 'invalid' };
  const env = whatsappEnv();
  const salt = process.env.WHATSAPP_HASH_SALT;
  if (!env || !salt) return { status: 'unavailable' };

  const db = createServiceClient();
  const orgId = session.organisation.id;
  const phoneHash = hashPhone(digits, salt);

  const [{ data: existing }, { count: links }, { data: pending }] = await Promise.all([
    db.from('wa_links').select('organisation_id').eq('phone_hash', phoneHash).maybeSingle(),
    db.from('wa_links').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
    db.from('wa_link_codes').select('created_at').eq('organisation_id', orgId).maybeSingle(),
  ]);
  if (existing) return existing.organisation_id === orgId ? { status: 'linked' } : { status: 'taken' };
  if ((links ?? 0) >= MAX_LINKS_PER_PHARMACY) return { status: 'limit' };
  if (pending && Date.now() - new Date(pending.created_at as string).getTime() < RESEND_AFTER_MS) return { status: 'wait' };

  const code = newCode();
  const now = new Date();
  const { error } = await db.from('wa_link_codes').upsert(
    {
      organisation_id: orgId,
      phone_hash: phoneHash,
      reply_to: digits,
      code_hash: hashCode(code, orgId, salt),
      attempts: 0,
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + CODE_TTL_MS).toISOString(),
    },
    { onConflict: 'organisation_id' },
  );
  if (error) {
    console.error('wa_link_codes upsert failed', { code: error.code });
    return { status: 'error' };
  }

  const template = process.env.WHATSAPP_LINK_TEMPLATE;
  try {
    await sendMessage(
      { to: digits },
      template
        ? { type: 'template', name: template, language: 'fr', bodyParams: [code], urlButtonParam: code }
        : { type: 'text', body: t('core.whatsapp.linkCode', { code }) },
      env,
    );
  } catch (sendError) {
    await db.from('wa_link_codes').delete().eq('organisation_id', orgId);
    console.error('link code send failed', sendError instanceof WhatsAppSendError ? { status: sendError.status, code: sendError.code } : 'network');
    return { status: 'send_failed' };
  }
  return { status: 'sent', masked: maskPhone(digits) };
}

/** Step two: the code typed back. Five tries, ten minutes. */
export async function confirmLinkCode(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const session = await requirePharmacy();
  if (!session) return { status: 'error' };
  const salt = process.env.WHATSAPP_HASH_SALT;
  if (!salt) return { status: 'unavailable' };
  const code = String(formData.get('code') ?? '').replace(/\s/g, '');
  const orgId = session.organisation.id;
  const db = createServiceClient();

  const { data: pending, error } = await db
    .from('wa_link_codes')
    .select('phone_hash, reply_to, code_hash, attempts, expires_at')
    .eq('organisation_id', orgId)
    .maybeSingle();
  if (error) return { status: 'error' };
  if (!pending || new Date(pending.expires_at as string).getTime() < Date.now()) return { status: 'expired' };
  const masked = maskPhone(pending.reply_to as string);
  if ((pending.attempts as number) >= MAX_CODE_ATTEMPTS) return { status: 'locked', masked };
  if (!/^\d{6}$/.test(code) || hashCode(code, orgId, salt) !== pending.code_hash) {
    await db.from('wa_link_codes').update({ attempts: (pending.attempts as number) + 1 }).eq('organisation_id', orgId);
    return { status: (pending.attempts as number) + 1 >= MAX_CODE_ATTEMPTS ? 'locked' : 'wrong', masked };
  }

  const { error: linkError } = await db.from('wa_links').insert({
    organisation_id: orgId,
    phone_hash: pending.phone_hash,
    reply_to: pending.reply_to,
  });
  // 23505: linked meanwhile (same number, maybe another pharmacy).
  if (linkError) return linkError.code === '23505' ? { status: 'taken' } : { status: 'error' };
  await db.from('wa_link_codes').delete().eq('organisation_id', orgId);

  const env = whatsappEnv();
  if (env) {
    // Best effort: inside the 24-hour window only, which is the usual case right after the code.
    sendMessage({ to: pending.reply_to as string }, { type: 'text', body: t('core.whatsapp.linkedWelcome') }, env).catch(() => undefined);
  }
  revalidatePath('/pharmacie/whatsapp');
  return { status: 'linked' };
}

export async function unlinkNumber(formData: FormData): Promise<void> {
  const session = await requirePharmacy();
  const id = String(formData.get('link_id') ?? '');
  if (!session || !UUID.test(id)) return;
  const { error } = await createServiceClient().from('wa_links').delete().eq('id', id).eq('organisation_id', session.organisation.id);
  if (error) console.error('unlink failed', { code: error.code });
  revalidatePath('/pharmacie/whatsapp');
}
