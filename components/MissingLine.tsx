import { ListChecks } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { Level, RuleId } from '@/lib/signal';
import { missingForNextLevel, missingText, type MissingEvidence } from '@/lib/signals/missing';

// "Ce qui manque", beside a level: the condition still missing for the next level, computed from
// the evaluator's rule and evidence (lib/signals/missing.ts). On real data (exact = false) it never
// prints a count of pharmacies. Nothing is shown at "levée".
export function MissingLine({
  level,
  rule,
  evidence,
  exact = false,
  now = new Date(),
  className = '',
}: {
  level: Level;
  rule: RuleId;
  evidence: MissingEvidence;
  exact?: boolean;
  now?: Date;
  className?: string;
}) {
  const missing = missingForNextLevel(level, rule, evidence, { exact, now });
  if (!missing) return null;
  return (
    <p className={`flex items-start gap-2 text-sm text-ink ${className}`}>
      <ListChecks aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-ink-muted" />
      <span>
        <span className="font-medium">{t('core.missing.label')}</span>
        {t('core.common.colon')}
        {missingText(missing)}
      </span>
    </p>
  );
}
