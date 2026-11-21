import type { ReactNode } from 'react';

// Missing data gets an honest empty state, never a placeholder figure.
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="border-y border-line py-10">
      <div className="flex max-w-prose flex-col gap-2">
        <p className="font-medium text-ink">{title}</p>
        {body ? <div className="text-ink-muted">{body}</div> : null}
        {action ? <div className="pt-3">{action}</div> : null}
      </div>
    </div>
  );
}
