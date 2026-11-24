import { PharmacySkeleton } from '@/components/Skeleton';
import { t } from '@/lib/i18n';

// The pharmacy's pages load in the shape of the app: the main action, then the list.
export default function Loading() {
  return <PharmacySkeleton label={t('core.app.loading')} />;
}
