import { describe, expect, it } from 'vitest';
import { compareFrames, comparePharmacies, COMPARE_CASES, pilotScaleMembers } from '@/lib/scenario/compare';
import { DEFAULT_PARAMS } from '@/lib/signal';

// Part 7 (handoff C): "Signal réparti" against "Signal concentré".
describe('Comparer les cas', () => {
  const spread = compareFrames('spread');
  const concentrated = compareFrames('concentrated');

  it('is deterministic', () => {
    expect(compareFrames('spread')).toEqual(spread);
    expect(compareFrames('concentrated')).toEqual(concentrated);
  });

  it('changes only the governorate of the fourth report: same pharmacies count, same days', () => {
    expect(spread.map((f) => [f.day, f.kind, f.ordinal])).toEqual(concentrated.map((f) => [f.day, f.kind, f.ordinal]));
    const differ = spread.filter((f, i) => f.governorateCode !== concentrated[i].governorateCode);
    expect(differ.map((f) => f.index)).toEqual([4]);
    expect(spread.filter((f) => f.differs).map((f) => f.index)).toEqual([4]);
    for (const c of COMPARE_CASES) expect(new Set(comparePharmacies(c).map((p) => p.id)).size).toBe(4);
  });

  it('four reports in one governorate stay "probable"; one moved to a second governorate confirms', () => {
    const at4 = (frames: typeof spread) => frames[4];
    expect(at4(concentrated)).toMatchObject({ level: 'likely', rule: 'single_governorate_cap' });
    expect(at4(concentrated).exact).toMatchObject({ pharmacies14d: 4, governorates14d: 1 });
    expect(at4(spread)).toMatchObject({ level: 'confirmed', rule: 'confirmed_threshold', changed: true });
    expect(at4(spread).exact).toMatchObject({ pharmacies14d: 4, governorates14d: 2 });
    // At pilot scale, 4 pharmacies are the bar.
    expect(DEFAULT_PARAMS.confirmMinPharmacies).toBe(4);
    expect(pilotScaleMembers()).toBe(200);
  });

  it('walks the same levels up to the third report in both cases', () => {
    const levels = (frames: typeof spread) => frames.slice(0, 4).map((f) => f.level);
    expect(levels(spread)).toEqual(['none', 'watch', 'likely', 'likely']);
    expect(levels(concentrated)).toEqual(levels(spread));
  });

  it('an announced arrival changes no level; "delivered again" lifts it', () => {
    for (const frames of [spread, concentrated]) {
      const arrival = frames.find((f) => f.kind === 'arrival')!;
      expect(arrival.changed).toBe(false);
      expect(arrival.level).toBe(frames[arrival.index - 1].level);
      const last = frames[frames.length - 1];
      expect(last).toMatchObject({ kind: 'delivered', level: 'cleared', rule: 'delivered_again_cleared', changed: true });
      expect(frames[frames.length - 2].level).toBe(frames[4].level);
    }
  });
});
