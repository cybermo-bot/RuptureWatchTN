// Dates and times on the public pages, in the visitor's language, Tunis time.
// Arabic uses the Maghreb's Latin digits (ar-TN), as on Tunisian documents.

import type { Locale } from '@/lib/i18n';

const TIME_ZONE = 'Africa/Tunis';
const tag = (locale: Locale) => (locale === 'ar' ? 'ar-TN' : 'fr-FR');

/** "13 novembre 2026" (French writes the first of the month "1er"). */
export function formatPublicDate(d: Date | string, locale: Locale): string {
  const text = new Intl.DateTimeFormat(tag(locale), {
    dateStyle: 'long',
    timeZone: TIME_ZONE,
  }).format(new Date(d));
  return locale === 'fr' ? text.replace(/^1 /, '1er ') : text;
}

/** "09:30" */
export function formatPublicTime(d: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(tag(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TIME_ZONE,
  }).format(new Date(d));
}
