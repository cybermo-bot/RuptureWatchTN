import { describe, expect, it } from 'vitest';
import seed from '../supabase/seed/allocation-demo.json';
import { ALLOCATION_PARAMS } from '@/lib/allocation/params';
import { fairSplit, type GovernorateNeed } from '@/lib/allocation/split';

const P = { hospitalReserveShare: 0, periodDays: 30, daysPerMonth: 30 };
const total = (s: ReturnType<typeof fairSplit>) => s.reserve + s.allocated + s.unallocated;
const byCode = (s: ReturnType<typeof fairSplit>) => Object.fromEntries(s.rows.map((r) => [r.code, r]));

describe('fair split', () => {
  it('equal needs give equal shares', () => {
    const needs: GovernorateNeed[] = ['A', 'B', 'C'].map((code) => ({ code, monthlyUse: 300, coverDays: 0 }));
    const s = fairSplit(300, needs, P);
    expect(s.rows.map((r) => r.boxes)).toEqual([100, 100, 100]);
    expect(new Set(s.rows.map((r) => r.coverAfter)).size).toBe(1);
  });

  it('a governorate already well covered gets nothing until the others catch up', () => {
    const needs: GovernorateNeed[] = [
      { code: 'LOW', monthlyUse: 300, coverDays: 2 },
      { code: 'HIGH', monthlyUse: 300, coverDays: 20 },
    ];
    // 10 boxes a day each. 100 boxes take LOW from 2 to 12 days: HIGH (20 days) gets none.
    const small = byCode(fairSplit(100, needs, P));
    expect(small.HIGH.boxes).toBe(0);
    expect(small.LOW.boxes).toBe(100);
    // 200 boxes: LOW reaches 20 days with 180, then both share the last 20.
    const more = byCode(fairSplit(200, needs, P));
    expect(more.LOW.boxes).toBe(190);
    expect(more.HIGH.boxes).toBe(10);
    expect(more.LOW.coverAfter).toBeCloseTo(more.HIGH.coverAfter!, 5);
  });

  it('stock above total need is capped, the rest stays unallocated', () => {
    const needs: GovernorateNeed[] = [
      { code: 'A', monthlyUse: 30, coverDays: 10 }, // needs 20
      { code: 'B', monthlyUse: 60, coverDays: 25 }, // needs 10
    ];
    const s = fairSplit(1000, needs, P);
    expect(byCode(s).A.boxes).toBe(20);
    expect(byCode(s).B.boxes).toBe(10);
    expect(s.unallocated).toBe(970);
    for (const r of s.rows) expect(r.coverAfter).toBeLessThanOrEqual(30);
  });

  it('zero stock gives zero everywhere', () => {
    const s = fairSplit(0, [{ code: 'A', monthlyUse: 100, coverDays: 0 }]);
    expect(s.reserve).toBe(0);
    expect(s.rows[0].boxes).toBe(0);
    expect(s.unallocated).toBe(0);
  });

  it('totals always add up, for any stock, with the reserve', () => {
    const needs = seed.governorates as GovernorateNeed[];
    for (const stock of [0, 1, 7, 99, 100, 1234, 5000, 20_000, 1_000_000]) {
      const s = fairSplit(stock, needs);
      expect(total(s)).toBe(stock);
      expect(s.allocated).toBe(s.rows.reduce((n, r) => n + r.boxes, 0));
      for (const r of s.rows) {
        expect(Number.isInteger(r.boxes)).toBe(true);
        expect(r.boxes).toBeGreaterThanOrEqual(0);
        expect(r.boxes).toBeLessThanOrEqual(r.need);
      }
    }
  });

  it('keeps the hospital reserve first', () => {
    const s = fairSplit(1000, [{ code: 'A', monthlyUse: 3000, coverDays: 0 }], { ...P, hospitalReserveShare: 0.1 });
    expect(s.reserve).toBe(100);
    expect(s.rows[0].boxes).toBe(900);
  });

  it('gives nothing to a governorate with no use, and shows no cover for it', () => {
    const s = fairSplit(50, [
      { code: 'A', monthlyUse: 0, coverDays: 0 },
      { code: 'B', monthlyUse: 30, coverDays: 0 },
    ], P);
    expect(byCode(s).A).toMatchObject({ boxes: 0, coverBefore: null, coverAfter: null });
    expect(byCode(s).B.boxes).toBe(30);
  });

  it('ignores nonsense input instead of inventing boxes', () => {
    const s = fairSplit(-5, [{ code: 'A', monthlyUse: Number.NaN, coverDays: -3 }], P);
    expect(total(s)).toBe(0);
    expect(fairSplit(10.9, [{ code: 'A', monthlyUse: 300, coverDays: 0 }], P).stock).toBe(10);
  });

  it('never leaves a governorate with a lower cover after than one that received boxes (one box of rounding)', () => {
    const needs = seed.governorates as GovernorateNeed[];
    const s = fairSplit(3000, needs);
    const daily = Object.fromEntries(needs.map((g) => [g.code, g.monthlyUse / ALLOCATION_PARAMS.daysPerMonth]));
    const served = s.rows.filter((r) => r.boxes > 0);
    const minServedBefore = Math.min(...served.map((r) => r.coverAfter! - 1 / daily[r.code]));
    for (const r of s.rows) if (r.boxes === 0 && r.coverAfter !== null) expect(r.coverAfter).toBeGreaterThanOrEqual(minServedBefore - 1e-6);
  });
});

describe('the simulated figures', () => {
  it('cover the 24 governorates and are all marked simulated', () => {
    expect(seed.origin).toBe('simulated');
    expect(seed.governorates).toHaveLength(24);
    for (const g of seed.governorates) {
      expect(g.code).toMatch(/^TN-\d{2}$/);
      expect(g.monthlyUse).toBeGreaterThan(0);
      expect(g.coverDays).toBeGreaterThanOrEqual(0);
    }
  });
});
