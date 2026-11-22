import type { ReactNode } from 'react';

// Latin text inside an Arabic page (medicine names, codes, numbers with units) keeps its own
// direction, so "LEVETIRACETAM 500 mg" never reads backwards. Use it around every such value.
export function Ltr({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <bdi dir="ltr" className={className}>
      {children}
    </bdi>
  );
}
