import type { ReactNode } from 'react';

// Lists and tables separated by hairlines, not stacks of cards.

export function HairlineList({
  children,
  framed = true,
  ordered = false,
  className = '',
  label,
}: {
  children: ReactNode;
  framed?: boolean;
  ordered?: boolean;
  className?: string;
  label?: string;
}) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag
      aria-label={label}
      className={`hairline-list ${framed ? 'hairline-list-framed' : ''} ${className}`}
    >
      {children}
    </Tag>
  );
}

export function HairlineTable({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="hairline-table">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
