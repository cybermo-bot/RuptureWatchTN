import { describe, expect, it } from 'vitest';
import seed from '../supabase/seed/allocation-demo.json';
import { proportionalSplit } from '@/lib/allocation/proportional';
import { fairSplit, minCoverAfter, minCoverBefore, type GovernorateNeed, type Split } from '@/lib/allocation/split';
import { stockForTarget } from '@/lib/allocation/target';

// The comparison on the wholesaler's split page: the proportional reference model against the
// fair split, with the same reserve, cap and unallocated-stock rules.

const P = { hospitalReserveShare: 0, periodDays: 30, daysPerMonth: 30 };
const FIXTURE: GovernorateNeed[] = seed.governorates.map(({ code, monthlyUse, coverDays }) => ({ code, monthlyUse, coverDays }));
const total = (s: Split) => s.reserve + s.allocated + s.unallocated;
const byCode = (s: Split) => Object.fromEntries(s.rows.map((r) => [r.code, r]));

describe('proportional reference model', () => {
  it('conserves every box, for any stock, with the reserve', () => {
    for (const stock of [0, 1, 2, 7, 99, 100, 1234, 2500, 5000, 20_000, 1_000_000]) {
      const s = proportionalSplit(stock, FIXTURE);
      expect(total(s)).toBe(stock);
      expect(s.allocated).toBe(s.rows.reduce((n, r) => n + r.boxes, 0));
      for (const r of s.rows) {
        expect(Number.isInteger(r.boxes)).toBe(true);
        expect(r.boxes).toBeGreaterThanOrEqual(0);
        expect(r.boxes).toBeLessThanOrEqual(r.need);
      }
    }
  });

  it('zero stock gives nothing, reserve included', () => {
    const s = proportionalSplit(0, FIXTURE);
    expect(s).toMatchObject({ stock: 0, reserve: 0, allocated: 0, unallocated: 0 });
    expect(s.rows.every((r) => r.boxes === 0)).toBe(true);
  });

  it('shares in proportion to monthly use', () => {
    const needs: GovernorateNeed[] = [
      { code: 'A', monthlyUse: 300, coverDays: 0 },
      { code: 'B', monthlyUse: 600, coverDays: 20 },
    ];
    // Cover does not matter to this model: B, better covered, still gets twice A.
    const s = byCode(proportionalSplit(150, needs, P));
    expect(s.A.boxes).toBe(50);
    expect(s.B.boxes).toBe(100);
  });

  it('caps a governorate at its need and gives the surplus to the others', () => {
    const needs: GovernorateNeed[] = [
      { code: 'A', monthlyUse: 300, coverDays: 28 }, // needs 20
      { code: 'B', monthlyUse: 300, coverDays: 0 }, // needs 300
    ];
    // In proportion each would get 100; A needs only 20, so B gets 180.
    const s = byCode(proportionalSplit(200, needs, P));
    expect(s.A.boxes).toBe(20);
    expect(s.B.boxes).toBe(180);
  });

  it('saturates: above the total need every governorate gets its need, the rest stays unallocated', () => {
    const s = proportionalSplit(1_000_000, FIXTURE);
    const f = fairSplit(1_000_000, FIXTURE);
    for (const r of s.rows) expect(r.boxes).toBe(r.need);
    expect(s.unallocated).toBe(f.unallocated);
    expect(s.unallocated).toBeGreaterThan(0);
  });

  it('all-zero demand: nothing allocated, everything after the reserve unallocated, no cover shown', () => {
    const needs: GovernorateNeed[] = ['A', 'B'].map((code) => ({ code, monthlyUse: 0, coverDays: 5 }));
    const s = proportionalSplit(100, needs, { ...P, hospitalReserveShare: 0.1 });
    expect(s).toMatchObject({ reserve: 10, allocated: 0, unallocated: 90 });
    expect(s.rows.every((r) => r.coverAfter === null)).toBe(true);
    expect(minCoverAfter(s)).toBeNull();
    expect(minCoverAfter(fairSplit(100, needs, P))).toBeNull();
  });

  it('small stock: rounded down, then the largest remainders, equal ones by governorate code', () => {
    const needs: GovernorateNeed[] = ['C', 'A', 'B'].map((code) => ({ code, monthlyUse: 300, coverDays: 0 }));
    const s = byCode(proportionalSplit(5, needs, P));
    expect([s.A.boxes, s.B.boxes, s.C.boxes]).toEqual([2, 2, 1]);
    // The order of the input never changes the result.
    const reversed = byCode(proportionalSplit(5, [...needs].reverse(), P));
    expect([reversed.A.boxes, reversed.B.boxes, reversed.C.boxes]).toEqual([2, 2, 1]);
    // One box goes to the larger remainder: A (300/400 of a box) before B (100/400).
    const uneven = byCode(proportionalSplit(1, [
      { code: 'B', monthlyUse: 100, coverDays: 0 },
      { code: 'A', monthlyUse: 300, coverDays: 0 },
    ], P));
    expect(uneven.A.boxes).toBe(1);
    expect(uneven.B.boxes).toBe(0);
  });
});

describe('the 2,500-box fixture (handoff figures, computed)', () => {
  const reference = proportionalSplit(2500, FIXTURE);
  const fair = fairSplit(2500, FIXTURE);

  it('keeps 250 for hospitals and allocates 2,250 under both models', () => {
    for (const s of [reference, fair]) {
      expect(s.reserve).toBe(250);
      expect(s.allocated).toBe(2250);
      expect(s.unallocated).toBe(0);
    }
  });

  it('lowest cover after: 11.0 days under the reference model, 17.3 under the fair split, from 2.0 before', () => {
    expect(minCoverBefore(fair)).toBe(2);
    expect(minCoverAfter(reference)!.toFixed(1)).toBe('11.0');
    expect(minCoverAfter(fair)!.toFixed(1)).toBe('17.3');
  });
});

describe('stock needed for a target', () => {
  it('14 days: 1,604 boxes in all, 1,444 distributable; 1,603 falls short', () => {
    expect(stockForTarget(14, FIXTURE)).toEqual({ status: 'ok', stock: 1604, reserve: 160, distributable: 1444 });
    expect(minCoverAfter(fairSplit(1603, FIXTURE))!).toBeLessThan(14);
    expect(minCoverAfter(fairSplit(1604, FIXTURE))!).toBeGreaterThanOrEqual(14);
  });

  it('a target above the period is outside the model', () => {
    expect(stockForTarget(31, FIXTURE)).toEqual({ status: 'beyond_horizon', periodDays: 30 });
  });

  it('a target already met needs no stock; nonsense is refused', () => {
    expect(stockForTarget(1, FIXTURE)).toEqual({ status: 'reached' });
    expect(stockForTarget(0, FIXTURE).status).toBe('invalid');
    expect(stockForTarget(Number.NaN, FIXTURE).status).toBe('invalid');
  });
});
