import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import type { Translate } from '@/lib/i18n';
import { PublicMain } from './PublicChrome';

// Honest placeholder for a public page a track has not built yet. Shows nothing invented.
export function UnderConstruction({ title, t }: { title: string; t: Translate }) {
  return (
    <PublicMain>
      <PageHeader title={title} />
      <EmptyState title={t('public.shell.underConstruction')} body={t('public.shell.underConstructionBody')} afterRule />
    </PublicMain>
  );
}
