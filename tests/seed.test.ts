// Seed files stay consistent with the catalogue and the demo roles.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEMO_ROLES } from '@/lib/demo/roles';

const ROOT = join(__dirname, '..');
const follows = JSON.parse(readFileSync(join(ROOT, 'supabase/seed/demo-follows.json'), 'utf8')) as {
  pharmacies: string[];
  molecules: string[];
};
const catalogue = readFileSync(join(ROOT, 'data/reference/cnam-vei-2026-11-06.csv'), 'utf8');
const moleculeNames = new Set(
  catalogue
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      // molecule is the 5th column; labels may be quoted and contain commas.
      const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((c) => c.replace(/,$/, '').replace(/^"|"$/g, ''));
      return cells[4];
    }),
);

describe('demo follows', () => {
  it.each(follows.molecules)('"%s" is a molecule of the imported catalogue', (name) => {
    expect(moleculeNames.has(name)).toBe(true);
  });

  it('covers levetiracetam, carbamazepine, valproate, lamotrigine, levothyroxine and every insulin', () => {
    const insulins = [...moleculeNames].filter((n) => n.includes('INSULINE'));
    expect(insulins.length).toBeGreaterThan(0);
    for (const name of ['LEVETIRACETAM', 'CARBAMAZEPINE', 'LAMOTRIGINE', 'LEVOTHYROXINE', ...insulins]) {
      expect(follows.molecules).toContain(name);
    }
    expect(follows.molecules.some((n) => n.includes('VALPROATE DE SODIUM'))).toBe(true);
  });

  it('is for the two demo pharmacies', () => {
    for (const key of follows.pharmacies) {
      expect(DEMO_ROLES.find((r) => r.key === key)?.home).toBe('/pharmacie');
    }
  });
});
