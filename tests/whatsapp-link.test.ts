// Linking a WhatsApp number: the number as WhatsApp sends it, the mask, the code and its hash.

import { describe, expect, it } from 'vitest';
import { hashPhone, hashSender } from '@/lib/whatsapp/inbound';
import { hashCode, maskPhone, newCode, normalisePhone } from '@/lib/whatsapp/link';

describe('normalisePhone', () => {
  it('gives the international digits WhatsApp uses, from the ways people type a Tunisian number', () => {
    for (const input of ['98 123 456', '+216 98 123 456', '00216 98123456', '+216-98-123-456', '(+216) 98.123.456']) {
      expect(normalisePhone(input)).toBe('21698123456');
    }
  });

  it('accepts other international numbers and refuses anything else', () => {
    expect(normalisePhone('+33 6 12 34 56 78')).toBe('33612345678');
    for (const bad of ['', '123', '+216 12 345 678', '98 123 45', 'abc', '+216 98 123 456 789', '216981234567']) {
      expect(normalisePhone(bad)).toBeNull();
    }
  });
});

describe('the link', () => {
  it('masks all but the last three digits', () => {
    expect(maskPhone('21698123456')).toBe('+216 •• ••• 456');
    expect(maskPhone('33612345678')).not.toContain('1234');
  });

  it('makes 6-digit codes', () => {
    for (let i = 0; i < 50; i++) expect(newCode()).toMatch(/^\d{6}$/);
  });

  it('binds the code hash to the pharmacy and the salt', () => {
    const a = hashCode('123456', 'org-a', 'salt');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCode('123456', 'org-b', 'salt')).not.toBe(a);
    expect(hashCode('123456', 'org-a', 'other')).not.toBe(a);
    expect(hashCode('123457', 'org-a', 'salt')).not.toBe(a);
  });

  it('finds a linked number again by the same hash the webhook computes for a sender without user id', () => {
    expect(hashPhone('21698123456', 's')).toBe(hashSender({ phone: '21698123456', userId: null }, 's'));
  });
});
