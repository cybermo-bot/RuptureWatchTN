import { t } from '@/lib/i18n';
import { displayCount, type RuleId } from '@/lib/signal';
import type { StoredEvidence } from '@/lib/signals/recompute';

// Why a molecule is at its level: the sentence for the rule that fired, filled with the
// evaluation's counts. Pharmacy counts below 3 read "moins de 3". Reused by every role.

function pharmacies(n: number): string {
  const { display, suppressed } = displayCount(n);
  return suppressed ? t('core.common.fewerThan3') : display;
}

export function explanationText(rule: RuleId, evidence: StoredEvidence): string {
  const text = t(`core.rules.${rule}`, {
    pharmacies: pharmacies(evidence.pharmacies14d),
    pharmacies7d: pharmacies(evidence.pharmacies7d),
    delivered: pharmacies(evidence.deliveredAgainPharmacies),
    governorates: evidence.governorates14d,
    sources: (evidence.notices ?? []).map((n) => n.source).join(t('core.explanation.sourcesSeparator')),
  });
  // A sentence may start with a count ("moins de 3 pharmacies…"): capitalise it.
  return text.charAt(0).toLocaleUpperCase('fr') + text.slice(1);
}

export function LevelExplanation({
  rule,
  evidence,
  showRule = false,
}: {
  rule: RuleId;
  evidence: StoredEvidence;
  showRule?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="max-w-prose text-ink">{explanationText(rule, evidence)}</p>
      {showRule ? (
        <p className="text-sm text-ink-muted">
          {t('core.explanation.ruleLabel')}
          {': '}
          <span className="font-mono text-xs">{rule}</span>
        </p>
      ) : null}
    </div>
  );
}
