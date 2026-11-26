import Link from 'next/link';

// Sub-views (coordination), in the URL so a tab can be shared and works without JavaScript. The
// current tab carries a 2 px brand bar under it, like PublicNav, and aria-current.
export function Tabs({ label, items, current }: { label: string; items: { key: string; label: string; href: string }[]; current: string }) {
  return (
    <nav aria-label={label} className="border-b border-line">
      <ul className="flex flex-wrap gap-x-1">
        {items.map((item) => {
          const active = item.key === current;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                scroll={false}
                aria-current={active ? 'page' : undefined}
                className={`relative inline-flex min-h-12 items-center px-3 text-sm no-underline transition-colors duration-(--dur-fast) ${
                  active ? 'font-medium text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-brand' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
