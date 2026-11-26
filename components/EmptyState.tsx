import type { ReactNode } from 'react';

// Missing data gets an honest empty state, never a placeholder figure: one sentence, one action,
// and optionally a small drawing (an icon or a FormPicture) in the picture slot.
export function EmptyState({
  title,
  body,
  action,
  picture,
  afterRule = false,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  /** A small drawing, decorative: give it aria-hidden. */
  picture?: ReactNode;
  /** Set inside a panel or under a hairline: no frame of its own. Otherwise it sits in its own panel. */
  afterRule?: boolean;
}) {
  return (
    <div className={afterRule ? 'py-8' : 'panel px-5 py-8'}>
      <div className="flex max-w-prose flex-col gap-2">
        {picture ? <div className="pb-2 text-ink-muted">{picture}</div> : null}
        <p className="font-medium text-ink">{title}</p>
        {body ? <div className="text-ink-muted">{body}</div> : null}
        {action ? <div className="pt-3">{action}</div> : null}
      </div>
    </div>
  );
}
