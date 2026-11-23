// Opening hours for the pharmacy directory, computed on the phone. Pure functions, no I/O.
//
// One shape for both sources: Google Places periods (converted here) and OpenStreetMap
// opening_hours (converted at export time by scripts/export-osm-pharmacies.ts).
// A week is 10,080 minutes from Sunday 00:00, Tunis time. An interval [start, end) may end
// after 10,080 when it runs over Saturday night into Sunday.
//
// Filters (docs/DECISIONS.md, track C):
// - "Ouvert maintenant": the current minute, Tunis time, is inside an interval.
// - "Ouvert ce soir après 22 h": open at some moment between 22:00 tonight and 06:00 tomorrow.
// - "Ouvert le week-end": open at some moment on Saturday from 14:00, or on Sunday.

export const WEEK = 7 * 24 * 60;
const DAY = 24 * 60;

/** [start, end) in minutes from Sunday 00:00, Tunis time. 0 <= start < WEEK, start < end <= start + WEEK. */
export type WeekInterval = [number, number];

/** null when the source gives no hours. */
export type WeeklyHours = WeekInterval[] | null;

export interface GooglePoint {
  day: number;
  hour: number;
  minute: number;
}

export interface GooglePeriod {
  open: GooglePoint;
  close: GooglePoint | null;
}

const minuteOf = (p: GooglePoint) => p.day * DAY + p.hour * 60 + p.minute;

/** Google Places periods (day 0 = Sunday) to week intervals. A period with no close is open 24/7. */
export function fromGooglePeriods(periods: readonly GooglePeriod[] | null | undefined): WeeklyHours {
  if (!periods || periods.length === 0) return null;
  const out: WeekInterval[] = [];
  for (const p of periods) {
    const start = minuteOf(p.open) % WEEK;
    if (!p.close) return [[0, WEEK]];
    let end = minuteOf(p.close);
    while (end <= start) end += WEEK;
    out.push([start, end]);
  }
  return normalise(out);
}

/** Sorts, keeps valid intervals and merges those that touch or overlap. */
export function normalise(intervals: readonly WeekInterval[]): WeekInterval[] {
  const valid = intervals
    .filter(([s, e]) => Number.isFinite(s) && Number.isFinite(e) && s >= 0 && s < WEEK && e > s)
    .map(([s, e]): WeekInterval => [s, Math.min(e, s + WEEK)])
    .sort((a, b) => a[0] - b[0]);
  const merged: WeekInterval[] = [];
  for (const iv of valid) {
    const last = merged[merged.length - 1];
    if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
    else merged.push([iv[0], iv[1]]);
  }
  // An interval that ends at the end of the week and one that starts at Sunday 00:00 are one.
  if (merged.length > 1 && merged[0][0] === 0 && merged[merged.length - 1][1] >= WEEK) {
    const first = merged.shift()!;
    merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], WEEK + first[1]);
  }
  if (merged.length === 1 && merged[0][1] - merged[0][0] >= WEEK) return [[0, WEEK]];
  return merged;
}

const parts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Tunis',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Minutes from Sunday 00:00, Tunis time, for an instant. */
export function tunisWeekMinute(date: Date): number {
  let day = 0;
  let hour = 0;
  let minute = 0;
  for (const part of parts.formatToParts(date)) {
    if (part.type === 'weekday') day = DAYS.indexOf(part.value);
    else if (part.type === 'hour') hour = Number(part.value);
    else if (part.type === 'minute') minute = Number(part.value);
  }
  return day * DAY + hour * 60 + minute;
}

/** True when [from, to) meets an interval, taking the week's wrap into account. */
function overlaps(hours: readonly WeekInterval[], from: number, to: number): boolean {
  for (const [s, e] of hours) {
    for (const shift of [-WEEK, 0, WEEK]) {
      if (s + shift < to && from < e + shift) return true;
    }
  }
  return false;
}

export function isOpenAt(hours: WeeklyHours, weekMinute: number): boolean {
  return hours !== null && overlaps(hours, weekMinute, weekMinute + 1);
}

/** Open at some moment between 22:00 tonight and 06:00 tomorrow. */
export function isOpenTonight(hours: WeeklyHours, weekMinute: number): boolean {
  if (hours === null) return false;
  const today = Math.floor(weekMinute / DAY) * DAY;
  return overlaps(hours, today + 22 * 60, today + DAY + 6 * 60);
}

/** Open at some moment on Saturday from 14:00, or on Sunday. */
export function isOpenWeekend(hours: WeeklyHours): boolean {
  if (hours === null) return false;
  return overlaps(hours, 6 * DAY + 14 * 60, WEEK) || overlaps(hours, 0, DAY);
}

export function isAlwaysOpen(hours: WeeklyHours): boolean {
  return hours !== null && hours.length === 1 && hours[0][0] === 0 && hours[0][1] >= WEEK;
}

const hhmm = (m: number) => {
  const inDay = ((m % DAY) + DAY) % DAY;
  return `${String(Math.floor(inDay / 60)).padStart(2, '0')}:${String(inDay % 60).padStart(2, '0')}`;
};

/**
 * Today's opening times as "08:00–13:00" strings, in order. An interval that started yesterday
 * and runs into today shows its real start ("20:00–08:00"). Empty when closed all day.
 */
export function todayRanges(hours: WeeklyHours, weekMinute: number): string[] {
  if (hours === null || isAlwaysOpen(hours)) return [];
  const dayStart = Math.floor(weekMinute / DAY) * DAY;
  const found: { s: number; e: number }[] = [];
  for (const [s, e] of hours) {
    for (const shift of [-WEEK, 0, WEEK]) {
      const ss = s + shift;
      const ee = e + shift;
      if (ss < dayStart + DAY && dayStart < ee) found.push({ s: ss, e: ee });
    }
  }
  // A night that ends this morning and the one that starts tonight read the same: say it once.
  return [...new Set(found.sort((a, b) => a.s - b.s).map(({ s, e }) => `${hhmm(s)}–${hhmm(e)}`))];
}

export type HoursFilter = 'now' | 'tonight' | 'weekend';

/**
 * Whether a place passes the active filters. Places without hours pass only when no filter is on.
 * `nowHours` (Google's current hours, which include special days) decides "open now" when given.
 */
export function passesFilters(
  hours: WeeklyHours,
  filters: ReadonlySet<HoursFilter>,
  weekMinute: number,
  nowHours: WeeklyHours = hours,
): boolean {
  if (filters.size === 0) return true;
  if (hours === null) return false;
  if (filters.has('now') && !isOpenAt(nowHours, weekMinute)) return false;
  if (filters.has('tonight') && !isOpenTonight(hours, weekMinute)) return false;
  if (filters.has('weekend') && !isOpenWeekend(hours)) return false;
  return true;
}
