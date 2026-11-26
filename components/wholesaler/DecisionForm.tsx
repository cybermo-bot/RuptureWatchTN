'use client';

import { useActionState, useId } from 'react';
import { buttonClass } from '@/components/Button';
import { recordDecision, type DecisionState } from '@/app/(site)/(espace)/grossiste/actions';
import { t } from '@/lib/i18n';

// "Appliquer" or "Ne pas appliquer". Not applying needs a reason of a few words: checked here,
// again in the server action, and by the database.
export function DecisionForm({ moleculeId, stock }: { moleculeId: string; stock: number }) {
  const [state, action, pending] = useActionState<DecisionState, FormData>(recordDecision, { status: 'idle' });
  const reasonId = useId();
  const hintId = `${reasonId}-hint`;
  const errorId = `${reasonId}-error`;
  const missing = state.status === 'reason_missing';

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="molecule_id" value={moleculeId} />
      <input type="hidden" name="stock" value={stock} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={reasonId} className="text-sm font-medium text-ink">
          {t('wholesaler.split.reasonLabel')}
        </label>
        <textarea
          id={reasonId}
          name="reason"
          rows={3}
          maxLength={2000}
          aria-describedby={missing ? `${hintId} ${errorId}` : hintId}
          aria-invalid={missing || undefined}
          className="w-full rounded-sm border border-ink-muted bg-surface px-3.5 py-3 text-base text-ink focus:border-brand aria-invalid:border-level-confirmed"
        />
        <p id={hintId} className="text-sm text-ink-muted">
          {t('wholesaler.split.reasonHint')}
        </p>
        {missing ? (
          <p id={errorId} role="alert" className="text-sm font-medium text-ink">
            {t('wholesaler.split.reasonMissing')}
          </p>
        ) : null}
      </div>
      {state.status === 'error' ? (
        <p role="alert" className="text-sm font-medium text-ink">
          {t('wholesaler.split.saveError')}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="decision"
          value="apply"
          disabled={pending}
          className={buttonClass()}
        >
          {t('wholesaler.split.apply')}
        </button>
        <button
          type="submit"
          name="decision"
          value="reject"
          disabled={pending}
          className={buttonClass('secondary')}
        >
          {t('wholesaler.split.reject')}
        </button>
      </div>
    </form>
  );
}
