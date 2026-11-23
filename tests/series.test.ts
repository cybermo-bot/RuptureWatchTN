import { describe, expect, it } from 'vitest';
import { lastDays, levelAt, levelSegments, moleculesAtLevelPerDay, tunisDayStart, type LevelChange } from '@/lib/charts/series';

const NOW = new Date('2026-11-23T12:00:00Z');
const ev = (molecule_id: string, from_level: LevelChange['from_level'], to_level: LevelChange['to_level'], at: string): LevelChange => ({
  molecule_id,
  from_level,
  to_level,
  at,
});

describe('chart series', () => {
  it('cuts days at Tunisian midnight (UTC+1)', () => {
    expect(tunisDayStart(new Date('2026-11-23T00:30:00Z')).toISOString()).toBe('2026-11-22T23:00:00.000Z');
    expect(tunisDayStart(new Date('2026-11-22T22:59:00Z')).toISOString()).toBe('2026-11-21T23:00:00.000Z');
    const days = lastDays(14, NOW);
    expect(days).toHaveLength(14);
    expect(days[13].start.toISOString()).toBe('2026-11-22T23:00:00.000Z');
    expect(days[0].start.toISOString()).toBe('2026-11-09T23:00:00.000Z');
  });

  it('reads the level at an instant from the changes, in any order', () => {
    const events = [ev('a', 'watch', 'likely', '2026-11-20T10:00:00Z'), ev('a', 'none', 'watch', '2026-11-18T10:00:00Z')];
    expect(levelAt(events, new Date('2026-11-17T00:00:00Z'))).toBe('none');
    expect(levelAt(events, new Date('2026-11-19T00:00:00Z'))).toBe('watch');
    expect(levelAt(events, new Date('2026-11-21T00:00:00Z'))).toBe('likely');
  });

  it('turns changes into contiguous segments over the window', () => {
    const events = [
      ev('a', 'none', 'watch', '2026-11-10T10:00:00Z'),
      ev('a', 'watch', 'likely', '2026-11-15T10:00:00Z'),
      ev('a', 'likely', 'confirmed', '2026-11-18T10:00:00Z'),
    ];
    const from = new Date('2026-11-12T00:00:00Z');
    const segments = levelSegments(events, from, NOW);
    expect(segments.map((s) => s.level)).toEqual(['watch', 'likely', 'confirmed']);
    expect(segments[0].start).toEqual(from);
    expect(segments[2].end).toEqual(NOW);
  });

  it('counts molecules at a level at the end of each day', () => {
    const events = [
      ev('a', 'none', 'confirmed', '2026-11-20T10:00:00Z'),
      ev('b', 'none', 'confirmed', '2026-11-22T10:00:00Z'),
      ev('b', 'confirmed', 'cleared', '2026-11-23T09:00:00Z'),
    ];
    const series = moleculesAtLevelPerDay(events, 'confirmed', 5, NOW);
    // 19, 20, 21, 22, 23 November.
    expect(series).toEqual([0, 1, 1, 2, 1]);
  });
});
