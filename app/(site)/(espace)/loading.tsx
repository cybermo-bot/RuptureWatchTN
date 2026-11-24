import { ConsoleSkeleton } from '@/components/Skeleton';
import { t } from '@/lib/i18n';

// Shown while a signed-in page loads its data on a slow connection: the console's shape, no figure.
export default function Loading() {
  return <ConsoleSkeleton label={t('core.app.loading')} />;
}
