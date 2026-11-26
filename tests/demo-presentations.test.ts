// Pilot-3 item 2: the simulated reports name real CNAM presentations, spread over two or three
// products, and « livré à nouveau » names none.

import { describe, expect, it } from 'vitest';
import { buildDemoNational } from '@/lib/demo/national';
import { DEMO_PRESENTATION_CODES, demoMedicineFor } from '@/lib/demo/presentations';
import { DEMO_SHORTAGE_MOLECULE, NATIONAL_MOLECULES } from '@/lib/demo/showcase';

describe('demoMedicineFor', () => {
  it('names nothing without products, and mostly the first product otherwise', () => {
    expect(demoMedicineFor([], 0)).toBeNull();
    const named = Array.from({ length: 14 }, (_, n) => demoMedicineFor(['a', 'b', 'c'], n));
    expect(new Set(named)).toEqual(new Set(['a', 'b', 'c']));
    expect(named.filter((m) => m === 'a').length).toBeGreaterThan(named.filter((m) => m === 'b').length);
    expect(Array.from({ length: 6 }, (_, n) => demoMedicineFor(['a', 'b'], n)).every((m) => m === 'a' || m === 'b')).toBe(true);
  });

  it('has two or three real CNAM codes for each molecule with reports', () => {
    for (const name of [DEMO_SHORTAGE_MOLECULE, NATIONAL_MOLECULES.probable, NATIONAL_MOLECULES.watchLocal, NATIONAL_MOLECULES.cleared]) {
      const codes = DEMO_PRESENTATION_CODES[name] ?? [];
      expect(codes.length).toBeGreaterThanOrEqual(2);
      expect(codes.length).toBeLessThanOrEqual(3);
      for (const code of codes) expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe('buildDemoNational', () => {
  it('names the given presentations on « non livré » reports only', () => {
    const ids = { probable: 'P', watchLocal: 'W', watchForeign: 'F', cleared: 'C', confirmed: 'L' };
    const plan = buildDemoNational(ids, new Date('2026-11-26T08:00:00Z'), new Map(), { probable: ['p1', 'p2'], cleared: ['c1', 'c2'] });
    const probable = plan.reports.filter((r) => r.molecule_id === 'P');
    expect(new Set(probable.map((r) => r.medicine_id))).toEqual(new Set(['p1', 'p2']));
    for (const r of plan.reports.filter((r) => r.kind === 'delivered_again')) expect(r.medicine_id).toBeNull();
    // No product given for « sous surveillance »: its report names none.
    for (const r of plan.reports.filter((r) => r.molecule_id === 'W')) expect(r.medicine_id).toBeNull();
  });
});
