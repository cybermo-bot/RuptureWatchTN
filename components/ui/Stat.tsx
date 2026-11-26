import type { ReactNode } from 'react';

// Key figures (rw-design-system): an IBM Plex Mono figure with its label under it. Values come
// computed from the data, '<3' stays '<3', and a figure is never animated.

export function StatRow({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <dl aria-label={label} className="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-12">
      {children}
    </dl>
  );
}

export function Stat({ value, label, note }: { value: number | string; label: ReactNode; note?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col-reverse gap-1">
      {note ? <p className="order-first text-sm text-ink-muted">{note}</p> : null}
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="figure text-ink">{value}</dd>
    </div>
  );
}
