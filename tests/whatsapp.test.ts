import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { hashSender, parseInboundTexts, quoteForAck, safeEqual, verifySignature } from '@/lib/whatsapp/inbound';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', 'whatsapp', name), 'utf8');
const SECRET = 'test-app-secret';
const sign = (body: string, secret = SECRET) => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

describe('verifySignature', () => {
  const body = fixture('text-message.json');

  it('accepts the HMAC-SHA256 of the raw body with the app secret', () => {
    expect(verifySignature(body, sign(body), SECRET)).toBe(true);
    expect(verifySignature(Buffer.from(body), sign(body).toUpperCase().replace('SHA256=', 'sha256='), SECRET)).toBe(true);
  });

  it('rejects a missing, malformed or wrong signature', () => {
    expect(verifySignature(body, null, SECRET)).toBe(false);
    expect(verifySignature(body, '', SECRET)).toBe(false);
    expect(verifySignature(body, 'sha256=abc', SECRET)).toBe(false);
    expect(verifySignature(body, sign(body).replace('sha256=', 'sha1='), SECRET)).toBe(false);
    expect(verifySignature(body, sign(body, 'another-secret'), SECRET)).toBe(false);
  });

  it('rejects a body changed after signing, even by one space', () => {
    const signature = sign(body);
    expect(verifySignature(`${body} `, signature, SECRET)).toBe(false);
    expect(verifySignature(JSON.stringify(JSON.parse(body)), signature, SECRET)).toBe(false);
  });

  it('rejects everything when no app secret is configured', () => {
    expect(verifySignature(body, sign(body, ''), '')).toBe(false);
  });
});

describe('parseInboundTexts', () => {
  it('reads a text message as documented by Meta', () => {
    expect(parseInboundTexts(JSON.parse(fixture('text-message.json')))).toEqual([
      {
        messageId: 'wamid.HBgLMTY1MDM4Nzk0MzkVAgASGBQzQTRBNjU5OUFFRTAzODEwMTQ0RgA=',
        phone: '16505551234',
        userId: 'US.13491208655302741918',
        body: 'Does it come in another color?',
        timestamp: 1749416383,
        phoneNumberId: '106540352242922',
      },
    ]);
  });

  it('reads a message from a user with a username and no phone number', () => {
    const [message] = parseInboundTexts(JSON.parse(fixture('username-only.json')));
    expect(message.phone).toBeNull();
    expect(message.userId).toBe('TN.55501208655302741999');
  });

  it('ignores status updates and non-text messages', () => {
    expect(parseInboundTexts(JSON.parse(fixture('status-and-image.json')))).toEqual([]);
  });

  it('ignores anything that is not a WhatsApp business payload, without throwing', () => {
    for (const payload of [null, 'x', 42, {}, { object: 'page', entry: [] }, { object: 'whatsapp_business_account', entry: [{}] }]) {
      expect(parseInboundTexts(payload)).toEqual([]);
    }
  });
});

describe('hashSender', () => {
  it('is stable, salted, and never contains the number', () => {
    const a = hashSender({ phone: '21698000000', userId: null }, 'salt-1');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('21698000000');
    expect(hashSender({ phone: '21698000000', userId: null }, 'salt-1')).toBe(a);
    expect(hashSender({ phone: '21698000000', userId: null }, 'salt-2')).not.toBe(a);
  });

  it('uses the business-scoped id when present, so it survives a hidden phone number', () => {
    const withPhone = hashSender({ phone: '16505551234', userId: 'US.1' }, 's');
    const withoutPhone = hashSender({ phone: null, userId: 'US.1' }, 's');
    expect(withPhone).toBe(withoutPhone);
  });
});

describe('acknowledgement', () => {
  it('quotes the text on one line and shortens long messages', () => {
    expect(quoteForAck('Augmentin   commandé\nnon livré')).toBe('Augmentin commandé non livré');
    expect(quoteForAck('x'.repeat(300))).toHaveLength(200);
  });

  it('uses the agreed wording', () => {
    expect(t('core.whatsapp.ack', { text: 'Augmentin' })).toBe('Bien reçu : « Augmentin ». RuptureWatch TN, prototype.');
  });
});

describe('safeEqual', () => {
  it('compares tokens exactly', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
