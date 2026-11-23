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

/** A text, or a tap on a list row or a button we sent: replyId is the id we gave that row or button. */
export interface InboundMessage extends InboundText {
  replyId: string | null;
}

interface RawMessage {
  id?: unknown;
  from?: unknown;
  from_user_id?: unknown;
  timestamp?: unknown;
  type?: unknown;
  text?: { body?: unknown };
  interactive?: {
    type?: unknown;
    list_reply?: { id?: unknown; title?: unknown };
    button_reply?: { id?: unknown; title?: unknown };
  };
  /** Quick-reply button of a template message. */
  button?: { payload?: unknown; text?: unknown };
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

/** Text and reply of one raw message: a text body, or a list row, reply button or template button. */
function contentOf(raw: RawMessage): { body: string; replyId: string | null } | null {
  if (raw.type === 'text') return typeof raw.text?.body === 'string' ? { body: raw.text.body, replyId: null } : null;
  if (raw.type === 'interactive') {
    const r = raw.interactive?.type === 'list_reply' ? raw.interactive.list_reply : raw.interactive?.type === 'button_reply' ? raw.interactive.button_reply : null;
    const id = str(r?.id);
    return id ? { body: typeof r?.title === 'string' ? r.title : '', replyId: id } : null;
  }
  if (raw.type === 'button') {
    const id = str(raw.button?.payload);
    return id ? { body: typeof raw.button?.text === 'string' ? raw.button.text : '', replyId: id } : null;
  }
  return null;
}

/** Incoming text messages only (kept for the acknowledgement tests). */
export function parseInboundTexts(payload: unknown): InboundText[] {
  return parseInbound(payload)
    .filter((m) => m.replyId === null)
    .map((m) => ({ messageId: m.messageId, phone: m.phone, userId: m.userId, body: m.body, timestamp: m.timestamp, phoneNumberId: m.phoneNumberId }));
}

/**
 * Extracts incoming texts and taps on our lists and buttons. Status updates, reactions,
 * media and anything malformed are skipped, never thrown on: Meta must still get its 200.
 */
export function parseInbound(payload: unknown): InboundMessage[] {
  const out: InboundMessage[] = [];
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
        if (!raw || typeof raw !== 'object') continue;
        const content = contentOf(raw);
        const messageId = str(raw.id);
        const phone = str(raw.from);
        const userId = str(raw.from_user_id);
        if (!messageId || !content || (!phone && !userId)) continue;
        const ts = Number(raw.timestamp);
        out.push({
          messageId,
          phone,
          userId,
          body: content.body.slice(0, 4096),
          replyId: content.replyId ? content.replyId.slice(0, 200) : null,
          timestamp: Number.isFinite(ts) ? ts : null,
          phoneNumberId,
        });
      }
    }
  }
  return out;
}

/** Salted SHA-256 of a sender key ("phone:<digits>" or "bsuid:<id>"). The raw value is never stored. */
function saltedHash(key: string, salt: string): string {
  return createHash('sha256').update(`${salt}\u0000${key}`).digest('hex');
}

/** Salted hash of a phone number, digits only: how a linked number is found again. */
export function hashPhone(digits: string, salt: string): string {
  return saltedHash(`phone:${digits}`, salt);
}

/** Salted hash of a business-scoped user id. */
export function hashUserId(userId: string, salt: string): string {
  return saltedHash(`bsuid:${userId}`, salt);
}

/**
 * Salted hash of the sender. Uses the business-scoped user id when present (stable even
 * for users who hide their number), otherwise the phone number. The raw value is never stored.
 */
export function hashSender(message: Pick<InboundText, 'phone' | 'userId'>, salt: string): string {
  return message.userId ? hashUserId(message.userId, salt) : hashPhone(message.phone ?? '', salt);
}

/** The acknowledgement, with the quoted text shortened to keep the reply readable. */
export function quoteForAck(body: string, max = 200): string {
  const oneLine = body.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}
