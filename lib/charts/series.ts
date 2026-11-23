// Series for the dashboards' charts, computed from the event log (every level change with its
// time). Pure functions, tested in tests/series.test.ts. No figure is ever typed by hand.
//
// Days are Tunisian calendar days (UTC+1 all year: Tunisia has no daylight saving time).

import type { Level } from '@/lib/signal';

export const TUNIS_OFFSET_MS = 60 * 60_000;
const DAY_MS = 86_400_000;

export interface LevelChange {
  molecule_id: string;
  from_level: Level;
  to_level: Level;
  at: string;
}

/** Start of the Tunisian day holding `at`, as a UTC instant. */
export function tunisDayStart(at: Date): Date {
  const local = at.getTime() + TUNIS_OFFSET_MS;
  return new Date(Math.floor(local / DAY_MS) * DAY_MS - TUNIS_OFFSET_MS);
}

/** The last `days` Tunisian days, oldest first, today last: [start, end) of each. */
export function lastDays(days: number, now: Date = new Date()): { start: Date; end: Date }[] {
  const today = tunisDayStart(now).getTime();
  return Array.from({ length: days }, (_, i) => {
    const start = today - (days - 1 - i) * DAY_MS;
    return { start: new Date(start), end: new Date(start + DAY_MS) };
  });
}

function ascending<T extends { at: string }>(events: T[]): T[] {
  return [...events].sort((a, b) => a.at.localeCompare(b.at));
}

/** Level of one molecule at instant `t`: the last change at or before t, else none. */
export function levelAt(events: LevelChange[], t: Date): Level {
  let level: Level = 'none';
  for (const e of ascending(events)) {
    if (new Date(e.at) > t) break;
    level = e.to_level;
  }
  return level;
}

export interface LevelSegment {
  level: Level;
  start: Date;
  end: Date;
}

/** The levels of one molecule between `from` and `to`, as contiguous segments. */
export function levelSegments(events: LevelChange[], from: Date, to: Date): LevelSegment[] {
  const sorted = ascending(events);
  const segments: LevelSegment[] = [];
  let level = levelAt(sorted, from);
  let start = from;
  for (const e of sorted) {
    const at = new Date(e.at);
    if (at <= from) continue;
    if (at >= to) break;
    if (e.to_level === level) continue;
    segments.push({ level, start, end: at });
    level = e.to_level;
    start = at;
  }
  segments.push({ level, start, end: to });
  return segments.filter((s) => s.end > s.start);
}

/**
 * For each of the last `days` days, how many molecules stood at `level` at the end of the day
 * (or now, for today). Molecules are those appearing in the events.
 */
export function moleculesAtLevelPerDay(events: LevelChange[], level: Level, days: number, now: Date = new Date()): number[] {
  const byMolecule = new Map<string, LevelChange[]>();
  for (const e of events) {
    const list = byMolecule.get(e.molecule_id) ?? [];
    list.push(e);
    byMolecule.set(e.molecule_id, list);
  }
  return lastDays(days, now).map(({ end }) => {
    const t = end > now ? now : new Date(end.getTime() - 1);
    let n = 0;
    for (const list of byMolecule.values()) if (levelAt(list, t) === level) n += 1;
    return n;
  });
}
