import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

// Every list item (rw-design-system): a picture or icon, a title, one meta line, then a badge or
// a chevron. At least 56 px tall, 12 × 16 px padding, hairlines between rows (List). A linked row
// tints powder blue on hover and its arrow moves 4 px (only on devices that hover).

export function List({ children, label, className = '' }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <ul aria-label={label} className={`hairline-list border-y border-line ${className}`}>
      {children}
    </ul>
  );
}

interface RowContent {
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  /** A level badge, a count or a tag, before the chevron. */
  trailing?: ReactNode;
}

export interface RowLinkProps extends RowContent {
  href: string;
  current?: boolean;
  prefetch?: boolean;
  ariaLabel?: string;
  /** data-* attributes for tests, anchors and the live highlight, set on the link. */
  data?: Record<`data-${string}`, string | undefined>;
}

export interface ListRowProps extends RowContent {
  href?: string;
  current?: boolean;
  prefetch?: boolean;
  ariaLabel?: string;
  data?: Record<`data-${string}`, string | undefined>;
}

const ROW = 'group flex min-h-14 items-center gap-3 px-4 py-3';

function Body({ leading, title, meta, trailing, linked }: RowContent & { linked: boolean }) {
  return (
    <>
      {leading ? <span className="flex shrink-0">{leading}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-medium break-words text-ink">{title}</span>
        {meta ? <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">{meta}</span> : null}
      </span>
      {trailing ? <span className="flex shrink-0 items-center">{trailing}</span> : null}
      {linked ? (
        <ChevronRight
          size={20}
          aria-hidden="true"
          className="shrink-0 text-ink-muted transition-transform duration-(--dur-fast) ease-(--ease-out) group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
        />
      ) : null}
    </>
  );
}

/** The row as a link, for callers that render their own <li>. */
export function RowLink({ href, current, prefetch, ariaLabel, data, ...content }: RowLinkProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      aria-label={ariaLabel}
      aria-current={current ? 'page' : undefined}
      className={`${ROW} no-underline transition-colors duration-(--dur-instant) hover:bg-powder-blue active:bg-powder-blue aria-[current=page]:bg-surface-subtle`}
      {...data}
    >
      <Body {...content} linked />
    </Link>
  );
}

export function ListRow({ href, current, prefetch, ariaLabel, data, ...content }: ListRowProps) {
  return (
    <li>
      {href ? (
        <RowLink href={href} current={current} prefetch={prefetch} ariaLabel={ariaLabel} data={data} {...content} />
      ) : (
        <div className={ROW} {...data}>
          <Body {...content} linked={false} />
        </div>
      )}
    </li>
  );
}
