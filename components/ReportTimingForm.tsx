'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitReport, type ReportState } from '@/app/actions/pharmacy';
import { t, type MessageKey } from '@/lib/i18n';

// Tap two of the report flow: when the order was placed. One tap sends the report.

const CHOICES: { value: 'd3' | 'd5' | 'd8' | 'lt3'; label: MessageKey }[] = [
  { value: 'd3', label: 'core.report.delays.d3' },
  { value: 'd5', label: 'core.report.delays.d5' },
  { value: 'd8', label: 'core.report.delays.d8' },
  { value: 'lt3', label: 'core.report.delays.lt3' },
];

function Choices() {
  const { pending, data } = useFormStatus();
  const chosen = data?.get('delay');
  return (
    <div className="flex flex-col gap-3">
      {CHOICES.map((c) => (
        <button
          key={c.value}
          type="submit"
          name="delay"
          value={c.value}
          disabled={pending}
          className={`flex min-h-14 w-full items-center justify-between rounded-md border px-5 text-start text-lg font-medium transition-colors disabled:cursor-wait ${
            c.value === 'lt3'
              ? 'border-line bg-surface text-ink-muted hover:border-ink-muted'
              : 'border-brand bg-surface text-ink hover:bg-surface-subtle'
          }`}
        >
          <span>{t(c.label)}</span>
          {pending && chosen === c.value ? (
            <span className="text-sm font-normal text-ink-muted">{t('core.common.sending')}</span>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="text-ink-muted rtl:-scale-x-100">
              <path d="M6 3.5 L10.5 8 L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

export function ReportTimingForm({ moleculeId, headingId }: { moleculeId: string; headingId?: string }) {
  const [state, action] = useActionState<ReportState, FormData>(submitReport, { status: 'idle' });
  return (
    <div className="flex flex-col gap-4">
      <form action={action} aria-labelledby={headingId}>
        <input type="hidden" name="molecule_id" value={moleculeId} />
        <Choices />
      </form>
      <div aria-live="polite">
        {state.status === 'too_early' ? (
          <div role="status" className="flex flex-col gap-1 border-s-2 border-level-watch ps-4">
            <p className="font-semibold text-ink">{t('core.guidance.tooEarly.title')}</p>
            <p className="max-w-prose text-ink">{t('core.guidance.tooEarly.body')}</p>
          </div>
        ) : null}
        {state.status === 'rate_limited' ? (
          <p role="alert" className="border-s-2 border-level-confirmed ps-4 text-ink">
            {t('core.report.rateLimited')}
          </p>
        ) : null}
        {state.status === 'error' ? (
          <p role="alert" className="border-s-2 border-level-confirmed ps-4 text-ink">
            {t('core.report.failed')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
