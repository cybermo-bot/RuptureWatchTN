// The ministry's and the centrale's order: level, then CNAM category (vital first), then fewer
// other brands first. Category and brands are computed from the CNAM rows, never typed.

import { describe, expect, it } from 'vitest';
import { byLevelCategoryBrands, catalogueFacts } from '@/lib/institutions/catalogue';

const rows = [
  { molecule_id: 'a', brand: 'Alpha', vei_category: 'E' },
  { molecule_id: 'a', brand: 'ALPHA ', vei_category: 'V' },
  { molecule_id: 'a', brand: 'Beta', vei_category: null },
  { molecule_id: 'b', brand: 'Gamma', vei_category: 'I' },
  { molecule_id: 'c', brand: 'Delta', vei_category: null },
  { molecule_id: 'c', brand: 'Epsilon', vei_category: 'X' },
];

describe('catalogueFacts', () => {
  it('takes the most critical category and counts distinct brands', () => {
    const f = catalogueFacts(rows);
    expect(f.get('a')).toEqual({ category: 'V', brands: 2, otherBrands: 1 });
    expect(f.get('b')).toEqual({ category: 'I', brands: 1, otherBrands: 0 });
    expect(f.get('c')).toEqual({ category: null, brands: 2, otherBrands: 1 });
    expect(f.has('d')).toBe(false);
  });
});

describe('byLevelCategoryBrands', () => {
  const facts = catalogueFacts([
    ...rows,
    { molecule_id: 'v0', brand: 'Only', vei_category: 'V' },
    { molecule_id: 'v3', brand: 'One', vei_category: 'V' },
    { molecule_id: 'v3', brand: 'Two', vei_category: 'V' },
    { molecule_id: 'v3', brand: 'Three', vei_category: 'V' },
    { molecule_id: 'v3', brand: 'Four', vei_category: 'V' },
  ]);
  const s = (molecule_id: string, level: 'confirmed' | 'likely' | 'watch' | 'cleared') => ({ molecule_id, level });

  it('orders by level, then vital first, then fewer other brands, unknown last', () => {
    const sorted = byLevelCategoryBrands(
      [s('b', 'confirmed'), s('v3', 'confirmed'), s('x', 'confirmed'), s('v0', 'confirmed'), s('a', 'likely'), s('c', 'watch'), s('v0', 'cleared')],
      facts,
    );
    expect(sorted.map((r) => `${r.molecule_id}:${r.level}`)).toEqual([
      'v0:confirmed', // vital, no other brand
      'v3:confirmed', // vital, three other brands
      'b:confirmed', // intermediate
      'x:confirmed', // not in the CNAM list
      'a:likely',
      'c:watch',
      'v0:cleared',
    ]);
  });
});
