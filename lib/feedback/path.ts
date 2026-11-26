// « Un problème ? Une idée ? » (pilot-2 item 3): where a message was written from.
// Stored as a route pattern only: the query and fragment dropped, and any segment that is not a
// plain lowercase word (an id, an invitation code, a name) replaced by [id]. The database refuses
// any other shape (supabase/migrations/20261126000000_feedback.sql).

const WORD = /^[a-z_-]{1,40}$/;

export function routePattern(path: string): string {
  const pathname = path.split(/[?#]/)[0] ?? '';
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .slice(0, 8)
    .map((segment) => (WORD.test(segment) ? segment : '[id]'));
  return `/${segments.join('/')}`;
}

/** The page to go back to after sending: a path on this site, or the fallback. */
export function returnPath(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.length > 300) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f\s]/.test(value)) return fallback;
  return value;
}

export const FEEDBACK_RATINGS = ['easy', 'unclear', 'broken'] as const;
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];

export const FEEDBACK_MAX = 1000;
