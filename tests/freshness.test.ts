import { describe, expect, it } from 'vitest';
import { freshness } from '@/lib/freshness';

// Part 8, item 5: "Mis à jour il y a …", from the signal's last evaluation.
describe('freshness', () => {
  const now = new Date('2026-11-24T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  it('says "à l’instant" under a minute, and never a negative age', () => {
    expect(freshness(ago(30_000), now)).toEqual({ unit: 'now' });
    expect(freshness(ago(-120_000), now)).toEqual({ unit: 'now' });
  });
  it('counts whole minutes, then hours, then days, rounded down', () => {
    expect(freshness(ago(4 * 60_000 + 59_000), now)).toEqual({ unit: 'minutes', n: 4 });
    expect(freshness(ago(59 * 60_000), now)).toEqual({ unit: 'minutes', n: 59 });
    expect(freshness(ago(60 * 60_000), now)).toEqual({ unit: 'hours', n: 1 });
    expect(freshness(ago(23 * 3_600_000 + 59 * 60_000), now)).toEqual({ unit: 'hours', n: 23 });
    expect(freshness(ago(49 * 3_600_000), now)).toEqual({ unit: 'days', n: 2 });
  });
  it('gives nothing for an invalid time', () => {
    expect(freshness('not a date', now)).toBeNull();
  });
});
