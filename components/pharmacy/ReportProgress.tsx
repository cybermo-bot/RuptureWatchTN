import { t } from '@/lib/i18n';

// The progress line of the two-tap report: step 1 the medicine, step 2 the date of the order.
export function ReportProgress({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-ink">{t('core.report.progressLabel', { n: step })}</span>
        <span className="text-ink-muted">{step === 1 ? t('core.report.steps.pick') : t('core.report.steps.when')}</span>
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={step}
        aria-label={t('core.report.progressLabel', { n: step })}
        className="grid grid-cols-2 gap-1.5"
      >
        <span className="h-1.5 rounded-full bg-brand" />
        <span className={`h-1.5 rounded-full ${step === 2 ? 'bg-brand' : 'bg-line'}`} />
      </div>
    </div>
  );
}
