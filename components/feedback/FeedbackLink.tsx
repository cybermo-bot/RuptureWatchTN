'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// « Un problème ? Une idée ? » in the footers (pilot-2 item 3), carrying the page it was opened
// from: the form goes back there after sending, and stores only its route pattern.
export function FeedbackLink({ label, className }: { label: string; className: string }) {
  const pathname = usePathname();
  return (
    <Link href={`/avis?depuis=${encodeURIComponent(pathname)}`} className={className}>
      {label}
    </Link>
  );
}
