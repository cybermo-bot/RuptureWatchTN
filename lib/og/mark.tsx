// The RuptureWatch mark: the "probable" shape (a half-filled circle) in white on the brand
// colour. Same drawing as app/icon.svg; used by the PNG icons and the Open Graph cards.

export const BRAND = '#0E6B57';

export function Mark({ size, rounded = true }: { size: number; rounded?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx={rounded ? 6 : 0} fill={BRAND} />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="#fff" strokeWidth="3" />
      <path d="M16 7.5a8.5 8.5 0 0 1 0 17z" fill="#fff" />
    </svg>
  );
}
