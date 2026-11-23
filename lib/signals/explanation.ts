// Why a molecule is at its level, as one sentence: the sentence for the rule that fired, filled
// with the evaluation's counts as screens receive them (lib/signals/shown.ts): pharmacy counts
// below 3 read "moins de 3". Used by every screen and by the WhatsApp bot.

import { t } from '@/lib/i18n';
import type { RuleId } from '@/lib/signal';
import type { ShownCount, ShownEvidence } from '@/lib/signals/shown';

// Counts arrive already suppressed; a raw 1 or 2 is suppressed here too, so a caller passing
// exact counts by mistake still shows "moins de 3".
function pharmacies(n: ShownCount): string {
  return n === '<3' || (n > 0 && n < 3) ? t('core.common.fewerThan3') : String(n);
}

export function explanationText(rule: RuleId, evidence: ShownEvidence): string {
  const text = t(`core.rules.${rule}`, {
    pharmacies: pharmacies(evidence.pharmacies14d),
    pharmacies7d: pharmacies(evidence.pharmacies7d),
    delivered: pharmacies(evidence.deliveredAgainPharmacies),
    governorates: evidence.governorates14d === null || pharmacies(evidence.pharmacies14d) === t('core.common.fewerThan3')
      ? t('core.common.fewerThan3')
      : evidence.governorates14d,
    sources: (evidence.notices ?? []).map((n) => n.source).join(t('core.explanation.sourcesSeparator')),
  });
  // A sentence may start with a count ("moins de 3 pharmacies…"): capitalise it.
  return text.charAt(0).toLocaleUpperCase('fr') + text.slice(1);
}

