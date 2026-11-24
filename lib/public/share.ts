// What a visitor shares from a public medicine page ("Partager ce statut"), and what its share
// card says: the status sentence the page shows (rule 10: "confirmée", "levée" after a
// confirmation, otherwise "Aucune rupture confirmée à ce jour"), "Simulé" when the status comes
// from demonstration data, and always "Ceci n'est pas une déclaration officielle de rupture."
// The rumour check, travelling into the WhatsApp groups where rumours start. Pure: no fetch.

import type { Locale, Translate } from '@/lib/i18n';
import { formatPublicDate } from '@/lib/public/format';
import type { PublicStatus } from '@/lib/public/medicine';

/** The status sentence of the public page: "Rupture confirmée depuis le 14 novembre 2026." */
export function publicStatusSentence(status: PublicStatus, t: Translate, locale: Locale): string {
  if (status.level === 'confirmed' && status.since) return t('public.medicine.confirmed', { date: formatPublicDate(status.since, locale) });
  if (status.level === 'cleared' && status.since) return t('public.medicine.cleared', { date: formatPublicDate(status.since, locale) });
  return t('public.medicine.none');
}

/** A shown status ("confirmée" or "levée") that rests on demonstration data. */
export function isSimulatedStatus(status: PublicStatus): boolean {
  return (status.level === 'confirmed' || status.level === 'cleared') && status.since !== null && status.origins.includes('simulated');
}

/** The lines after the medicine's name: its status, "Simulé" when it applies, the disclaimer. */
export function statusLines(status: PublicStatus, t: Translate, locale: Locale): string[] {
  return [
    publicStatusSentence(status, t, locale),
    isSimulatedStatus(status) ? t('public.share.simulated') : null,
    t('public.medicine.disclaimer'),
  ].filter((line): line is string => line !== null);
}

/** The shared text, without the link (the share sheet or WhatsApp adds it). */
export function shareText(name: string, status: PublicStatus, t: Translate, locale: Locale): string {
  const [sentence, ...rest] = statusLines(status, t, locale);
  return [t('public.share.text', { name, status: sentence }), ...rest].join('\n');
}
