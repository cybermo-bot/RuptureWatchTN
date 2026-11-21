import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import map from '../data/reference/governorates-map.json';

describe('governorate map file', () => {
  it('draws exactly the 24 governorates of the database, ISO 3166-2:TN codes', () => {
    const migration = readFileSync(
      join(__dirname, '..', 'supabase', 'migrations', '20261121000200_reference_data.sql'),
      'utf8',
    );
    const dbCodes = [...migration.matchAll(/\('(TN-\d{2})', '([^']+)'/g)].map((m) => [m[1], m[2]]);
    expect(dbCodes).toHaveLength(24);
    const mapCodes = map.governorates.map((g) => [g.code, g.name]);
    expect(mapCodes).toEqual([...dbCodes].sort((a, b) => a[0].localeCompare(b[0])));
  });

  it('has a drawable outline and a label point for each', () => {
    for (const g of map.governorates) {
      expect(g.d).toMatch(/^M[\d.]+ [\d.]+L/);
      expect(g.label).toHaveLength(2);
    }
  });

  it('stays light enough for a phone on mobile data', () => {
    expect(JSON.stringify(map).length).toBeLessThan(40_000);
  });
});
