import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}

// The top of a page: what it is, one sentence on what it is for, and its actions.
export function PageHeader({ title, description, meta, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 pb-1 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        {meta ? <div className="text-sm text-ink-muted">{meta}</div> : null}
        <h1 className="text-2xl leading-tight font-semibold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
        {description ? <div className="max-w-prose text-ink-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
