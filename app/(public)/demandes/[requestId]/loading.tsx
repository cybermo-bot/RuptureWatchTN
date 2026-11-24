import { Bone, SkeletonRows } from '@/components/Skeleton';
import { PublicMain } from '@/components/public/PublicChrome';
import { getTranslator } from '@/lib/i18n-server';

// Right after a patient sends a request, the answers page loads in its own shape: the title, the
// two figures, then the list. No figure is shown before it is known.
export default async function Loading() {
  const { t } = await getTranslator();
  return (
    <PublicMain narrow>
      <p role="status" className="text-sm text-ink-muted">
        {t('public.request.loading')}
      </p>
      <div aria-hidden="true" className="flex flex-col gap-2">
        <Bone className="h-7 w-64 max-w-full" />
        <Bone className="h-4 w-72 max-w-full" />
      </div>
      <div aria-hidden="true" className="panel flex flex-col gap-4 p-5">
        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bone className="h-3 w-24" />
              <Bone className="h-6 w-10" />
            </div>
          ))}
        </div>
        <Bone className="h-3 w-48 max-w-full" />
      </div>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Bone className="h-5 w-56 max-w-full" />
        <div className="panel overflow-hidden">
          <SkeletonRows rows={3} />
        </div>
      </div>
    </PublicMain>
  );
}
