// What the visitor's phone keeps for RuptureWatch, in localStorage only (CLAUDE.md rule 3):
// - a random device id, sent only to our server, which hashes it for the 24-hour limit;
// - the requests made from this phone, so it can link back to an open one;
// - "Préviens-moi": the medicines followed, with the status last seen for each.
// Nothing here is ever stored on our side.

export type PublicLevel = 'confirmed' | 'cleared' | 'none';

export interface Followed {
  name: string;
  level: PublicLevel;
  since: string | null;
}

const DEVICE_KEY = 'rw-device-id';
const REQUESTS_KEY = 'rw-requests';
const FOLLOW_KEY = 'rw-follow';
export const FOLLOW_EVENT = 'rw-follow-change';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or full storage: the feature quietly does nothing.
  }
}

export function deviceId(): string {
  let id = read<string | null>(DEVICE_KEY, null);
  if (!id) {
    id = crypto.randomUUID();
    write(DEVICE_KEY, id);
  }
  return id;
}

/** The request made from this phone for a molecule, if any, with its expiry. */
export function myRequest(moleculeId: string): { id: string; expiresAt: string } | null {
  return read<Record<string, { id: string; expiresAt: string }>>(REQUESTS_KEY, {})[moleculeId] ?? null;
}

export function rememberRequest(moleculeId: string, id: string, expiresAt: string): void {
  const all = read<Record<string, { id: string; expiresAt: string }>>(REQUESTS_KEY, {});
  // Drop requests older than a day: the limit is 24 hours, nothing older is useful.
  const now = Date.now();
  for (const [k, v] of Object.entries(all)) if (Date.parse(v.expiresAt) < now - 86_400_000) delete all[k];
  all[moleculeId] = { id, expiresAt };
  write(REQUESTS_KEY, all);
}

export function followedList(): Record<string, Followed> {
  return read<Record<string, Followed>>(FOLLOW_KEY, {});
}

export function setFollowed(moleculeId: string, value: Followed | null): void {
  const all = followedList();
  if (value) all[moleculeId] = value;
  else delete all[moleculeId];
  write(FOLLOW_KEY, all);
  window.dispatchEvent(new Event(FOLLOW_EVENT));
}
