import { after, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { requireEnv } from '@/lib/env';
import type { RecomputeResult } from '@/lib/signals/recompute';
import { siteUrl } from '@/lib/site';
import { botReply, unlinkedReply } from '@/lib/whatsapp/bot';
import { sendMessage, whatsappEnv } from '@/lib/whatsapp/client';
import { hashSender, parseInbound, safeEqual, verifySignature, type InboundMessage } from '@/lib/whatsapp/inbound';
import { notifyLevelChange } from '@/lib/whatsapp/notify';
import { findLinkedPharmacy, supabaseBotDeps } from '@/lib/whatsapp/store';

/** A sender writing more than this many messages in ten minutes is stored but not answered. */
const MAX_MESSAGES_PER_10_MIN = 20;
/** An unlinked number gets the link once an hour, not once per message. */
const UNLINKED_REPLY_EVERY_MS = 3_600_000;

// GET: Meta's verification handshake.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token') ?? '';
  const challenge = params.get('hub.challenge') ?? '';
  const expected = process.env.WHATSAPP_VERIFY_TOKEN ?? '';

  if (mode === 'subscribe' && expected && safeEqual(token, expected) && /^[\w-]{1,200}$/.test(challenge)) {
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new Response('Forbidden', { status: 403 });
}

// POST: incoming events. Signature first, on the raw body. Answer 200 fast; reply after.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const appSecret = process.env.WHATSAPP_APP_SECRET ?? '';
  if (!verifySignature(rawBody, request.headers.get('x-hub-signature-256'), appSecret)) {
    return new Response('Invalid signature', { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const messages = parseInbound(payload);
  if (messages.length === 0) return new Response('OK', { status: 200 });

  try {
    const salt = requireEnv('WHATSAPP_HASH_SALT');
    const supabase = createServiceClient();
    const fresh: { message: InboundMessage; senderHash: string; recent: number; lastAt: string | null }[] = [];
    for (const message of messages) {
      const senderHash = hashSender(message, salt);
      // message_id is the primary key: a duplicate delivery inserts nothing and gets no second reply.
      const { data, error } = await supabase
        .from('wa_inbound')
        .upsert(
          { message_id: message.messageId, sender_hash: senderHash, body: message.replyId ?? message.body },
          { onConflict: 'message_id', ignoreDuplicates: true },
        )
        .select('message_id');
      if (error) throw new Error(`wa_inbound insert failed: ${error.message}`);
      if (!data || data.length === 0) continue;
      // Rate limit and the unlinked reminder: what this sender sent before this message.
      const { data: earlier, error: earlierError } = await supabase
        .from('wa_inbound')
        .select('received_at')
        .eq('sender_hash', senderHash)
        .neq('message_id', message.messageId)
        .gt('received_at', new Date(Date.now() - UNLINKED_REPLY_EVERY_MS).toISOString())
        .order('received_at', { ascending: false })
        .limit(MAX_MESSAGES_PER_10_MIN + 1);
      if (earlierError) throw new Error(`wa_inbound read failed: ${earlierError.message}`);
      const tenMinutesAgo = Date.now() - 600_000;
      const recent = (earlier ?? []).filter((r) => new Date(r.received_at as string).getTime() > tenMinutesAgo).length;
      fresh.push({ message, senderHash, recent, lastAt: (earlier?.[0]?.received_at as string | undefined) ?? null });
    }

    const env = whatsappEnv();
    if (fresh.length > 0 && env) {
      const ctx = { siteUrl: siteUrl() };
      after(async () => {
        for (const { message, recent, lastAt } of fresh) {
          if (recent >= MAX_MESSAGES_PER_10_MIN) continue;
          const changes: { result: RecomputeResult; reporter: string }[] = [];
          try {
            const pharmacy = await findLinkedPharmacy(supabase, message, salt);
            let replies;
            if (pharmacy) {
              const deps = supabaseBotDeps(supabase, {
                onLevelChange: (result, reporter) => changes.push({ result, reporter: reporter.organisationId }),
              });
              replies = await botReply(message, pharmacy, deps, ctx);
            } else {
              // Unlinked: the link to the web app, at most once an hour.
              replies = lastAt ? [] : unlinkedReply(ctx);
            }
            for (const reply of replies) {
              await sendMessage({ to: message.phone, recipient: message.userId }, reply, env, message.messageId);
            }
          } catch (error) {
            console.error('whatsapp reply failed', error instanceof Error ? error.message : error);
          }
          // The reporter has the answer; now the other linked pharmacies that follow the molecule.
          for (const c of changes) await notifyLevelChange(c.result, c.reporter);
        }
      });
    }
  } catch (error) {
    // Ask Meta to retry later: the message is not stored yet.
    console.error('whatsapp webhook failed', error instanceof Error ? error.message : error);
    return new Response('Temporary failure', { status: 500 });
  }

  return new Response('OK', { status: 200 });
}
