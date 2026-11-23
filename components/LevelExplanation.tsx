import Link from 'next/link';
import { t } from '@/lib/i18n';
import type { RuleId } from '@/lib/signal';
import { explanationText } from '@/lib/signals/explanation';
import type { ShownEvidence } from '@/lib/signals/shown';

// The sentence itself lives in lib/signals/explanation.ts (also used by the WhatsApp bot).
export { explanationText } from '@/lib/signals/explanation';

export function LevelExplanation({
  rule,
  evidence,
  showRule = false,
  methodLink = true,
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
