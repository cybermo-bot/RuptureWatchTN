// Linking a WhatsApp number to a pharmacy: number normalisation, the 6-digit code and its hash.
// Pure (Node crypto only), tested in tests/whatsapp-link.test.ts.

import { createHash, randomInt } from 'node:crypto';

export const CODE_TTL_MS = 10 * 60_000;
export const MAX_CODE_ATTEMPTS = 5;
export const MAX_LINKS_PER_PHARMACY = 3;
/** A new code no sooner than this after the previous one. */
export const RESEND_AFTER_MS = 60_000;

/**
 * The number as WhatsApp gives it in webhooks: international, digits only, no "+".
 * Accepts "+216 98 123 456", "00216 98123456", "216-98-123-456" and the 8-digit Tunisian form
 * "98 123 456". Returns null for anything else.
 */
export function normalisePhone(input: string): string | null {
  const compact = input.trim().replace(/[\s.()-]/g, '');
  if (!/^\+?\d+$/.test(compact)) return null;
  let digits = compact.replace(/\D/g, '');
  if (compact.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.length === 8) {
    digits = `216${digits}`;
  }
  if (digits.startsWith('216')) return /^216[2-9][0-9]{7}$/.test(digits) ? digits : null;
  return /^[1-9][0-9]{7,14}$/.test(digits) ? digits : null;
}

/** "+216 •• ••• 456": enough for the pharmacist to recognise the number, no more. */
export function maskPhone(digits: string): string {
  const tail = digits.slice(-3);
  if (digits.startsWith('216') && digits.length === 11) return `+216 •• ••• ${tail}`;
  return `+${digits.slice(0, 2)} ••• ${tail}`;
}

export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Salted hash of the code, bound to the pharmacy: a code for one pharmacy is useless for another. */
export function hashCode(code: string, organisationId: string, salt: string): string {
  return createHash('sha256').update(`${salt}\u0000code:${organisationId}:${code}`).digest('hex');
}
