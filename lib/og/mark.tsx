// The RuptureWatch mark: an open ring broken at one point, and the dot that escapes through the
// break. It reads as the moment a shortage is caught before it reaches the counter. Our own
// drawing: no cross, no pill, no institution's symbol. One source for every use:
// components/brand/Logo.tsx (sidebar, headers), app/icon.svg, the PNG icons and the share cards.

export const BRAND = '#4D36C8';

/** The ring, centred at (14.5, 17.5), radius 7.5, open between -75 and -15 degrees. */
export const MARK_RING = 'M21.744 15.559A7.5 7.5 0 1 1 16.441 10.256';
/** The dot outside the break. */
export const MARK_DOT = { cx: 23.7, cy: 8.3, r: 2.6 } as const;
export const MARK_STROKE = 3;

export function Mark({ size, rounded = true }: { size: number; rounded?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx={rounded ? 7 : 0} fill={BRAND} />
      <path d={MARK_RING} fill="none" stroke="#fff" strokeWidth={MARK_STROKE} strokeLinecap="round" />
      <circle cx={MARK_DOT.cx} cy={MARK_DOT.cy} r={MARK_DOT.r} fill="#fff" />
    </svg>
  );
}
