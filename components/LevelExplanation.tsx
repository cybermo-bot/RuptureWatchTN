import Link from 'next/link';
import type { ReactNode } from 'react';
import { t } from '@/lib/i18n';
import type { RuleId } from '@/lib/signal';
import { explanationText } from '@/lib/signals/explanation';
import type { ShownEvidence } from '@/lib/signals/shown';

// The sentence itself lives in lib/signals/explanation.ts (also used by the WhatsApp bot).
export { explanationText } from '@/lib/signals/explanation';

export function RuleDetails({ rule, children, showRule = true, methodLink = true }: { rule: RuleId; children?: ReactNode; showRule?: boolean; methodLink?: boolean }) {
  return (
    <details className="text-sm text-ink-muted">
      <summary className="min-h-12 w-fit cursor-pointer content-center font-medium text-brand">{t('core.decisionBlock.why')}</summary>
      <div className="flex flex-col gap-2 pb-2">
        {showRule ? <p><span>{t('core.explanation.ruleLabel')}{t('core.common.colon')}</span><code>{rule}</code></p> : null}
        {methodLink ? <Link href={`/methode#${rule}`} className="inline-flex min-h-12 w-fit items-center">{t('core.explanation.methodLink')}</Link> : null}
        {children}
      </div>
    </details>
  );
}

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
      {showRule || methodLink ? <RuleDetails rule={rule} showRule={showRule} methodLink={methodLink} /> : null}
    </div>
  );
}
