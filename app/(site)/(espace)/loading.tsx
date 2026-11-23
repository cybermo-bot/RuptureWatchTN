import { t } from '@/lib/i18n';

// Shown while a signed-in page loads its data on a slow connection.
export default function Loading() {
  return (
    <p role="status" className="text-ink-muted">
      {t('core.app.loading')}
    </p>
  );
}
