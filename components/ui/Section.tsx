import type { ReactNode } from 'react';

// Each block of a page (rw-design-system): an optional eyebrow with a short rule, a title-2 and
// an optional link on the right. It sits on the page background; no box of its own.
export function Section({
  id,
  title,
  eyebrow,
  link,
  children,
  className = '',
}: {
  /** The heading's id, kept as the section's anchor (aria-labelledby). */
  id: string;
  title: ReactNode;
  eyebrow?: ReactNode;
  link?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-col gap-1.5">
          {eyebrow ? (
            <p className="eyebrow flex items-center gap-2 text-ink-muted">
              <span aria-hidden="true" className="h-px w-6 bg-ink-muted" />
              {eyebrow}
            </p>
          ) : null}
          <h2 id={id} className="title-2 break-words text-ink">
            {title}
          </h2>
        </div>
        {link ? <div className="shrink-0 text-sm">{link}</div> : null}
      </div>
      {children}
    </section>
  );
}
