// WhatsApp Cloud API webhook: signature check, payload parsing, sender hashing.
// Pure functions (Node crypto only), unit tested in tests/whatsapp.test.ts.
// Payload shape: Meta "messages" webhook reference, read 21 November 2026 (see docs/DECISIONS.md).

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Checks X-Hub-Signature-256 ("sha256=<hex>"): HMAC-SHA256 of the raw request body
 * with the app secret. Constant-time comparison. Anything missing or malformed is rejected.
 */
export function verifySignature(rawBody: string | Buffer, header: string | null | undefined, appSecret: string): boolean {
  if (!header || !appSecret) return false;
  const match = /^sha256=([0-9a-f]{64})$/i.exec(header.trim());
  if (!match) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody).digest();
  const received = Buffer.from(match[1], 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Constant-time string comparison for the verify token. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb) && a.length === b.length;
}

export interface InboundText {
  messageId: string;
  /** Sender's phone number. Absent when the user has a username and hides their number. */
  phone: string | null;
  /** Business-scoped user id (BSUID), present since 2026. */
  userId: string | null;
  body: string;
  /** Seconds since epoch, as sent by Meta. */
  timestamp: number | null;
  phoneNumberId: string | null;
}

interface RawMessage {
  id?: unknown;
  from?: unknown;
  from_user_id?: unknown;
  timestamp?: unknown;
  type?: unknown;
  text?: { body?: unknown };
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

/**
 * Extracts incoming text messages. Status updates, reactions, media and anything
 * malformed are skipped, never thrown on: Meta must still get its 200.
 */
export function parseInboundTexts(payload: unknown): InboundText[] {
  const out: InboundText[] = [];
  if (!payload || typeof payload !== 'object') return out;
  const p = payload as { object?: unknown; entry?: unknown };
  if (p.object !== 'whatsapp_business_account' || !Array.isArray(p.entry)) return out;

  for (const entry of p.entry) {
    const changes = (entry as { changes?: unknown })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const c = change as { field?: unknown; value?: unknown };
      if (c?.field !== 'messages' || !c.value || typeof c.value !== 'object') continue;
      const value = c.value as { messaging_product?: unknown; metadata?: { phone_number_id?: unknown }; messages?: unknown };
      if (value.messaging_product !== 'whatsapp' || !Array.isArray(value.messages)) continue;
      const phoneNumberId = str(value.metadata?.phone_number_id);
      for (const raw of value.messages as RawMessage[]) {
        if (!raw || raw.type !== 'text') continue;
        const messageId = str(raw.id);
        const body = typeof raw.text?.body === 'string' ? raw.text.body : null;
        const phone = str(raw.from);
        const userId = str(raw.from_user_id);
        if (!messageId || body === null || (!phone && !userId)) continue;
        const ts = Number(raw.timestamp);
        out.push({
          messageId,
          phone,
          userId,
          body: body.slice(0, 4096),
          timestamp: Number.isFinite(ts) ? ts : null,
          phoneNumberId,
        });
      }
    }
  }
  return out;
}

/**
 * Salted hash of the sender. Uses the business-scoped user id when present (stable even
 * for users who hide their number), otherwise the phone number. The raw value is never stored.
 */
export function hashSender(message: Pick<InboundText, 'phone' | 'userId'>, salt: string): string {
  const key = message.userId ? `bsuid:${message.userId}` : `phone:${message.phone}`;
  return createHash('sha256').update(`${salt}\u0000${key}`).digest('hex');
}

/** The acknowledgement, with the quoted text shortened to keep the reply readable. */
export function quoteForAck(body: string, max = 200): string {
  const oneLine = body.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}
