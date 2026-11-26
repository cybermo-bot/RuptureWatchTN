import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** A small line above the title (role, molecule family); `eyebrow` sets it in Mono capitals. */
  meta?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  /** A way back, above everything else. */
  back?: { href: string; label: string };
  /** A FormPicture, 64–96 px, beside the title. */
  picture?: ReactNode;
  /** The h1's id, for aria-labelledby and shared-element transitions. */
  titleId?: string;
  /** view-transition-name for the title (shared elements, unique per page). */
  titleTransition?: string;
}

// The top of a page: what it is, one sentence on what it is for (60 characters a line at most),
// and its actions.
export function PageHeader({ title, description, meta, eyebrow, actions, back, picture, titleId, titleTransition }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 pb-1">
      {back ? (
        <Link href={back.href} className="inline-flex min-h-12 w-fit items-center gap-2 text-sm text-brand no-underline hover:underline">
          <ArrowLeft size={16} aria-hidden="true" className="rtl:-scale-x-100" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {picture ? <div className="shrink-0">{picture}</div> : null}
          <div className="flex min-w-0 flex-col gap-1.5">
            {eyebrow ? <p className="eyebrow text-ink-muted">{eyebrow}</p> : null}
            {meta ? <div className="text-sm text-ink-muted">{meta}</div> : null}
            <h1 id={titleId} className="title-1 break-words text-ink" style={titleTransition ? { viewTransitionName: titleTransition } : undefined}>
              {title}
            </h1>
            {description ? <div className="max-w-[60ch] text-ink-muted">{description}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
