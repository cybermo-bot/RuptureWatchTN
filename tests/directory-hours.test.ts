import { describe, expect, it } from 'vitest';
import {
  fromGooglePeriods,
  isAlwaysOpen,
  isOpenAt,
  isOpenTonight,
  isOpenWeekend,
  normalise,
  passesFilters,
  todayRanges,
  tunisWeekMinute,
  WEEK,
  type GooglePeriod,
  type HoursFilter,
} from '@/lib/directory/hours';

const D = 1440;
const at = (day: number, h: number, m = 0) => day * D + h * 60 + m;
const p = (day: number, oh: number, ch: number, closeDay = day): GooglePeriod => ({
  open: { day, hour: oh, minute: 0 },
  close: { day: closeDay, hour: ch, minute: 0 },
});

// A usual Tunisian pharmacy: Monday to Friday 08:00-13:00 and 15:00-20:00, Saturday morning.
const usual = fromGooglePeriods([
  ...[1, 2, 3, 4, 5].flatMap((d) => [p(d, 8, 13), p(d, 15, 20)]),
  p(6, 8, 13),
]);
// A night pharmacy: every day 20:00 to 08:00 the next morning, Saturday into Sunday included.
const night = fromGooglePeriods([0, 1, 2, 3, 4, 5, 6].map((d) => p(d, 20, 8, (d + 1) % 7)));
const allDay = fromGooglePeriods([{ open: { day: 0, hour: 0, minute: 0 }, close: null }]);
const none = (f: HoursFilter[]) => new Set(f);

describe('Google periods to a week', () => {
  it('converts periods and keeps them in order', () => {
    expect(usual).toHaveLength(11);
    expect(usual![0]).toEqual([at(1, 8), at(1, 13)]);
  });

  it('keeps a Saturday night period running into Sunday as one interval', () => {
    expect(night!.some(([s, e]) => s === at(6, 20) && e === WEEK + at(0, 8))).toBe(true);
  });

  it('reads a period without a close as open around the clock', () => {
    expect(allDay).toEqual([[0, WEEK]]);
    expect(isAlwaysOpen(allDay)).toBe(true);
  });

  it('gives null when Google has no hours', () => {
    expect(fromGooglePeriods(undefined)).toBeNull();
    expect(fromGooglePeriods([])).toBeNull();
  });

  it('merges touching intervals, also across the end of the week', () => {
    expect(normalise([[at(6, 20), WEEK], [0, at(0, 8)]])).toEqual([[at(6, 20), WEEK + at(0, 8)]]);
    expect(normalise([[60, 120], [120, 180]])).toEqual([[60, 180]]);
  });
});

describe('open now, tonight, at the week-end', () => {
  it('open now follows the minute', () => {
    expect(isOpenAt(usual, at(2, 9))).toBe(true);
    expect(isOpenAt(usual, at(2, 14))).toBe(false);
    expect(isOpenAt(usual, at(2, 13))).toBe(false); // closing minute is closed
    expect(isOpenAt(night, at(0, 3))).toBe(true); // Sunday 03:00, from Saturday night
    expect(isOpenAt(null, at(2, 9))).toBe(false);
  });

  it('tonight means some time between 22:00 and 06:00', () => {
    expect(isOpenTonight(night, at(3, 10))).toBe(true);
    expect(isOpenTonight(usual, at(3, 10))).toBe(false);
    expect(isOpenTonight(fromGooglePeriods([p(3, 8, 23)]), at(3, 10))).toBe(true);
    expect(isOpenTonight(night, at(6, 23))).toBe(true); // Saturday night wraps into Sunday
  });

  it('the week-end is Saturday from 14:00, or Sunday', () => {
    expect(isOpenWeekend(usual)).toBe(false); // Saturday morning only
    expect(isOpenWeekend(night)).toBe(true);
    expect(isOpenWeekend(fromGooglePeriods([p(0, 9, 12)]))).toBe(true);
    expect(isOpenWeekend(fromGooglePeriods([p(6, 9, 15)]))).toBe(true);
  });

  it('places without hours pass only when no filter is on', () => {
    expect(passesFilters(null, none([]), at(2, 9))).toBe(true);
    expect(passesFilters(null, none(['now']), at(2, 9))).toBe(false);
    expect(passesFilters(usual, none(['now']), at(2, 9))).toBe(true);
    expect(passesFilters(usual, none(['now', 'weekend']), at(2, 9))).toBe(false);
  });

  it('uses the current hours for "open now" when they are given', () => {
    const holidayClosed = fromGooglePeriods([p(1, 8, 9)]);
    expect(passesFilters(usual, none(['now']), at(1, 10), holidayClosed)).toBe(false);
  });
});

describe("today's hours", () => {
  it('lists the ranges of the day', () => {
    expect(todayRanges(usual, at(2, 11))).toEqual(['08:00–13:00', '15:00–20:00']);
    expect(todayRanges(usual, at(0, 11))).toEqual([]);
  });

  it('shows a night that started yesterday with its real times', () => {
    expect(todayRanges(night, at(0, 11))).toEqual(['20:00–08:00']);
  });
});

describe('Tunis time', () => {
  it('reads the week minute in Africa/Tunis (UTC+1), whatever the device zone', () => {
    // Sunday 22 November 2026, 23:30 UTC = Monday 00:30 in Tunis.
    expect(tunisWeekMinute(new Date('2026-11-22T23:30:00Z'))).toBe(at(1, 0, 30));
    // Wednesday 25 November 2026, 08:15 UTC = 09:15 in Tunis.
    expect(tunisWeekMinute(new Date('2026-11-25T08:15:00Z'))).toBe(at(3, 9, 15));
  });
});
