import Link from 'next/link';
import { t } from '@/lib/i18n';
import type { RuleId } from '@/lib/signal';
import type { ShownCount, ShownEvidence } from '@/lib/signals/shown';

// Why a molecule is at its level: the sentence for the rule that fired, filled with the
// evaluation's counts as screens receive them (lib/signals/shown.ts): pharmacy counts below 3
// read "moins de 3". Reused by every role.

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

export function LevelExplanation({
  rule,
  evidence,
  showRule = false,
  methodLink = false,
}: {
  rule: RuleId;
  evidence: ShownEvidence;
  showRule?: boolean;
  /** Link to the methods page (/methode). */
  methodLink?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="max-w-prose text-ink">{explanationText(rule, evidence)}</p>
      {showRule || methodLink ? (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
          {showRule ? (
            <span>
              {t('core.explanation.ruleLabel')}
              {': '}
              <span className="font-mono text-xs">{rule}</span>
            </span>
          ) : null}
          {methodLink ? (
            <Link href={`/methode#${rule}`} className="underline underline-offset-2">
              {t('core.explanation.methodLink')}
            </Link>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
