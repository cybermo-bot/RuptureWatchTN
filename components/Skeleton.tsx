// Placeholders while a page loads its data (part 8, item 8): the page's shape in grey, never a
// figure or a made-up text. The status line above says it is loading, in words. The pulse is
// motion only, off with prefers-reduced-motion.

export function Bone({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block rounded-sm bg-line/70 motion-safe:animate-pulse ${className}`} />;
}

/** A list inside a panel: one row per item, a name and a level line. */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <ul aria-hidden="true" className="hairline-list">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex min-h-14 flex-col justify-center gap-2 px-4 py-3">
          <Bone className={`h-4 ${i % 2 ? 'w-36' : 'w-48'}`} />
          <Bone className="h-3 w-56 max-w-full" />
        </li>
      ))}
    </ul>
  );
}

/** A console page: header, key figures, the list and the selected medicine. */
export function ConsoleSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-5">
      <p role="status" className="text-sm text-ink-muted">
        {label}
      </p>
      <div aria-hidden="true" className="flex flex-col gap-2">
        <Bone className="h-3 w-32" />
        <Bone className="h-7 w-80 max-w-full" />
      </div>
      <div aria-hidden="true" className="panel grid grid-cols-2 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`flex flex-col gap-2.5 px-4 py-3.5 ${i > 0 ? 'sm:border-s sm:border-line' : ''} ${i % 2 ? 'max-sm:border-s max-sm:border-line' : ''} ${i > 1 ? 'max-sm:border-t max-sm:border-line' : ''}`}>
            <Bone className="h-3 w-28" />
            <div className="flex items-end justify-between gap-3">
              <Bone className="h-6 w-10" />
              <Bone className="h-5 w-20" />
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="grid gap-5 xl:grid-cols-12">
        <div className="panel self-start xl:col-span-4">
          <div className="panel-header">
            <Bone className="h-4 w-40" />
          </div>
          <SkeletonRows />
        </div>
        <div className="panel flex flex-col gap-4 p-4 xl:col-span-8">
          <Bone className="h-6 w-48" />
          <Bone className="h-4 w-64 max-w-full" />
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-5/6" />
          <Bone className="mt-2 h-56 w-full" />
        </div>
      </div>
    </div>
  );
}

/** The pharmacy's app pages: the main action, then a list of medicines. */
export function PharmacySkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <p role="status" className="text-sm text-ink-muted">
        {label}
      </p>
      <Bone className="h-14 w-full rounded-md" />
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Bone className="h-6 w-52" />
        <div className="panel overflow-hidden">
          <SkeletonRows rows={4} />
        </div>
      </div>
    </div>
  );
}
