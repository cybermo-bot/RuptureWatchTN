import { describe, expect, it } from 'vitest';
import { fold, localHits, mergeHits, type SpaceLevel } from '@/lib/console/quick-search';

// Part 8, item 10: Ctrl+K in the consoles.
const levels: SpaceLevel[] = [
  { id: 'lev', name: 'LEVETIRACETAM', level: 'confirmed' },
  { id: 'tam', name: 'TAMOXIFENE', level: 'likely' },
];

describe('quick search', () => {
  it('folds accents and case', () => {
    expect(fold(' Lévétiracétam ')).toBe('levetiracetam');
  });

  it('finds the medicines with a level here at once, from two letters', () => {
    expect(localHits(levels, 'l')).toEqual([]);
    expect(localHits(levels, 'lévé')).toEqual([{ id: 'lev', name: 'LEVETIRACETAM', brand: null, level: 'confirmed' }]);
  });

  it('adds the catalogue molecules once each, with their level here or none', () => {
    const hits = mergeHits(
      localHits(levels, 'tamox'),
      [{ id: 'tam', name: 'TAMOXIFENE' }, { id: 'ral', name: 'RALOXIFENE' }],
      [
        { molecule_id: 'tam', molecule_name: 'TAMOXIFENE', brand: 'EBEFEN' },
        { molecule_id: 'lev', molecule_name: 'LEVETIRACETAM', brand: 'KEPPRA' },
      ],
      levels,
    );
    expect(hits).toEqual([
      { id: 'tam', name: 'TAMOXIFENE', brand: null, level: 'likely' },
      { id: 'ral', name: 'RALOXIFENE', brand: null, level: null },
      { id: 'lev', name: 'LEVETIRACETAM', brand: 'KEPPRA', level: 'confirmed' },
    ]);
  });

  it('keeps at most eight rows', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, name: `M${i}` }));
    expect(mergeHits([], many, [], levels)).toHaveLength(8);
  });
});
