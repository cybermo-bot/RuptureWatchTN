import type { ReactNode } from 'react';

// A panel groups related content: white, hairline border, 8 px radius, no shadow.
// Lists and tables inside stay separated by hairlines, not boxed again.

export function Panel({
  title,
  titleId,
  description,
  actions,
  children,
  className = '',
  bodyClassName = 'p-4',
  as: Tag = 'section',
  headingLevel = 2,
  id,
}: {
  title?: ReactNode;
  titleId?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: 'section' | 'div' | 'article';
  headingLevel?: 2 | 3;
  id?: string;
}) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <Tag id={id} aria-labelledby={title && titleId ? titleId : undefined} className={`panel min-w-0 ${className}`}>
      {title ? (
        <header className="panel-header">
          <div className="flex min-w-0 flex-col gap-0.5">
            <H id={titleId} className="text-base font-semibold text-ink">
              {title}
            </H>
            {description ? <div className="text-sm text-ink-muted">{description}</div> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </Tag>
  );
}
