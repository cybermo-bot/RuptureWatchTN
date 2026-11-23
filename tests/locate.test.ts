import { describe, expect, it } from 'vitest';
import map from '@/data/reference/governorates-map.json';
import { governorateAt, ringsOf } from '@/lib/geo/locate';

// "Près de moi" finds the governorate on the phone, from the map's own outlines.
describe('governorateAt', () => {
  it('finds the governorate of a position near each demo city', () => {
    expect(governorateAt(36.8, 10.18, map)).toBe('TN-11'); // Tunis
    expect(governorateAt(34.74, 10.76, map)).toBe('TN-61'); // Sfax
    expect(governorateAt(35.83, 10.63, map)).toBe('TN-51'); // Sousse
    expect(governorateAt(33.88, 10.1, map)).toBe('TN-81'); // Gabès
    expect(governorateAt(32.93, 10.45, map)).toBe('TN-83'); // Tataouine
  });

  it('answers null outside Tunisia', () => {
    expect(governorateAt(48.86, 2.35, map)).toBeNull(); // Paris
    expect(governorateAt(36.0, 12.5, map)).toBeNull(); // at sea
  });

  it('reads the outlines the map script writes', () => {
    expect(ringsOf('M1 2L3 4L5 6ZM7 8L9 10L11 12Z')).toEqual([
      [
        [1, 2],
        [3, 4],
        [5, 6],
      ],
      [
        [7, 8],
        [9, 10],
        [11, 12],
      ],
    ]);
  });
});
