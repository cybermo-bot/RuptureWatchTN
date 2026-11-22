import { after, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { requireEnv } from '@/lib/env';
import { t } from '@/lib/i18n';
import { sendText } from '@/lib/whatsapp/client';
import {
  hashSender,
  parseInboundTexts,
  quoteForAck,
  safeEqual,
  verifySignature,
  type InboundText,
} from '@/lib/whatsapp/inbound';

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

  const messages = parseInboundTexts(payload);
  if (messages.length === 0) return new Response('OK', { status: 200 });

  try {
    const salt = requireEnv('WHATSAPP_HASH_SALT');
    const supabase = createServiceClient();
    const fresh: InboundText[] = [];
    for (const message of messages) {
      // message_id is the primary key: a duplicate delivery inserts nothing and gets no second reply.
      const { data, error } = await supabase
        .from('wa_inbound')
        .upsert(
          {
            message_id: message.messageId,
            sender_hash: hashSender(message, salt),
            body: message.body,
          },
          { onConflict: 'message_id', ignoreDuplicates: true },
        )
        .select('message_id');
      if (error) throw new Error(`wa_inbound insert failed: ${error.message}`);
      if (data && data.length > 0) fresh.push(message);
    }

    if (fresh.length > 0) {
      const env = {
        accessToken: requireEnv('WHATSAPP_ACCESS_TOKEN'),
        phoneNumberId: requireEnv('WHATSAPP_PHONE_NUMBER_ID'),
      };
      after(async () => {
        for (const message of fresh) {
          try {
            await sendText(
              {
                to: message.phone,
                recipient: message.userId,
                body: t('core.whatsapp.ack', { text: quoteForAck(message.body) }),
                replyTo: message.messageId,
              },
              env,
            );
          } catch (error) {
            console.error('whatsapp ack failed', error instanceof Error ? error.message : error);
          }
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
