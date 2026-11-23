'use client';

import { useEffect, useState } from 'react';

// The count on the report's confirmation moves from the count before the report to the count
// with it, once. With reduced motion it shows the final count at once. Screen readers get the
// final number only.
export function CountUp({ from, to, durationMs = 700 }: { from: number; to: number; durationMs?: number }) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) {
      const frame = requestAnimationFrame(() => setValue(to));
      return () => cancelAnimationFrame(frame);
    }
    let frame = 0;
    const start = performance.now() + 250;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / durationMs));
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to, durationMs]);

  return (
    <>
      <span aria-hidden="true" className="tabular-nums">
        {value}
      </span>
      <span className="sr-only">{to}</span>
    </>
  );
}
