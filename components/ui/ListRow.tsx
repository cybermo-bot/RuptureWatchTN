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

export interface ListRowProps {
  href?: string;
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  /** A level badge, a count or a tag, before the chevron. */
  trailing?: ReactNode;
  current?: boolean;
  prefetch?: boolean;
  /** data-* attributes for tests and anchors, set on the link or the row. */
  data?: Record<`data-${string}`, string>;
}

export function ListRow({ href, leading, title, meta, trailing, current, prefetch, data }: ListRowProps) {
  const body = (
    <>
      {leading ? <span className="flex shrink-0">{leading}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium break-words text-ink">{title}</span>
        {meta ? <span className="text-sm text-ink-muted">{meta}</span> : null}
      </span>
      {trailing ? <span className="flex shrink-0 items-center">{trailing}</span> : null}
      {href ? (
        <ChevronRight
          size={20}
          aria-hidden="true"
          className="shrink-0 text-ink-muted transition-transform duration-(--dur-fast) ease-(--ease-out) group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
        />
      ) : null}
    </>
  );
  const row = 'group flex min-h-14 items-center gap-3 px-4 py-3';
  return (
    <li>
      {href ? (
        <Link
          href={href}
          prefetch={prefetch}
          aria-current={current ? 'page' : undefined}
          className={`${row} no-underline transition-colors duration-(--dur-instant) hover:bg-powder-blue aria-[current=page]:bg-surface-subtle`}
          {...data}
        >
          {body}
        </Link>
      ) : (
        <div className={row} {...data}>
          {body}
        </div>
      )}
    </li>
  );
}
