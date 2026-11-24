import type { ReactNode } from 'react';
import { LevelBadge } from '@/components/LevelBadge';
import { MissingLine } from '@/components/MissingLine';
import { Origins } from '@/components/Origins';
import { PlaybookLink } from '@/components/PlaybookLink';
import { t } from '@/lib/i18n';
import { explanationText } from '@/lib/signals/explanation';
import type { SignalRow } from '@/lib/signals/views';
import { RuleDetails } from '@/components/LevelExplanation';

export function MedicineDecision({ signal, action, children }: { signal: SignalRow; action: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <LevelBadge level={signal.level} />
        <Origins origins={signal.evidence.origins} />
      </div>
      <p className="max-w-prose text-ink">{explanationText(signal.rule, signal.evidence)}</p>
      <MissingLine level={signal.level} rule={signal.rule} evidence={signal.evidence} />
      {action ? (
        <div className="flex flex-col items-start gap-1">
          <p className="text-sm font-medium text-ink">{t('core.decisionBlock.next')}</p>
          {action}
        </div>
      ) : null}
      <PlaybookLink molecule={signal.molecule_name} context="evenement" />
      <RuleDetails rule={signal.rule}>{children}</RuleDetails>
      <p className="text-sm text-ink-muted">{t('core.guidance.disclaimer')}</p>
    </div>
  );
}
