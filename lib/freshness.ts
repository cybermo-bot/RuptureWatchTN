// "Mis à jour il y a 4 min": how long ago a signal was last evaluated (signals.updated_at, set by
// apply_signal_evaluation on every evaluation, including the daily recompute at 04:30 UTC).
// Pure: the page passes the time it renders at. Whole units, rounded down.

export type Freshness = { unit: 'now' } | { unit: 'minutes' | 'hours' | 'days'; n: number };

export function freshness(at: Date | string, now: Date): Freshness | null {
  const ms = now.getTime() - new Date(at).getTime();
  if (!Number.isFinite(ms)) return null;
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return { unit: 'now' };
  if (minutes < 60) return { unit: 'minutes', n: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { unit: 'hours', n: hours };
  return { unit: 'days', n: Math.floor(hours / 24) };
}
