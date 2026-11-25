export const BRAND = '#235C76';

// The diagonal leg of the R also begins the W. Keep it legible as a single-colour app icon.
export const MARK_PATH = 'M6 23V9h6a4 4 0 0 1 0 8H6m6 0 4.5 6 3.5-6 3.5 6 3-9';
export const MARK_STROKE = 2.5;

export function Mark({ size, rounded = true }: { size: number; rounded?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx={rounded ? 7 : 0} fill={BRAND} />
      <path d={MARK_PATH} fill="none" stroke="#fff" strokeWidth={MARK_STROKE} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
