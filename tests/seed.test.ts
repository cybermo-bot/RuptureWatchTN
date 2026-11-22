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

describe('demo pharmacy positions', () => {
  const orgs = (
    JSON.parse(readFileSync(join(ROOT, 'supabase/seed/demo-organisations.json'), 'utf8')) as {
      organisations: { id: string; type: string; governorate_code: string; latitude?: number; longitude?: number; public_address?: string }[];
    }
  ).organisations;
  const pharmacies = orgs.filter((o) => o.type === 'pharmacy');
  const metres = (a: { latitude?: number; longitude?: number }, b: { latitude?: number; longitude?: number }) => {
    const r = Math.PI / 180;
    const x = (b.longitude! - a.longitude!) * r * Math.cos(((a.latitude! + b.latitude!) / 2) * r);
    const y = (b.latitude! - a.latitude!) * r;
    return Math.sqrt(x * x + y * y) * 6_371_000;
  };

  it('every demo pharmacy has a fictional position in Tunisia and a fictional address', () => {
    expect(pharmacies).toHaveLength(12);
    for (const p of pharmacies) {
      expect(p.latitude).toBeGreaterThan(30);
      expect(p.latitude).toBeLessThan(37.6);
      expect(p.longitude).toBeGreaterThan(7.5);
      expect(p.longitude).toBeLessThan(11.7);
      expect(p.public_address).toMatch(/^Adresse fictive de démonstration, /);
    }
  });

  it('only pharmacies get a position', () => {
    for (const o of orgs.filter((x) => x.type !== 'pharmacy')) expect(o.latitude).toBeUndefined();
  });

  it('pharmacies of one governorate are a few hundred metres apart, never on the same spot', () => {
    for (const a of pharmacies) {
      for (const b of pharmacies) {
        if (a.id >= b.id || a.governorate_code !== b.governorate_code) continue;
        const d = metres(a, b);
        expect(d, `${a.id} ${b.id}`).toBeGreaterThan(250);
        expect(d, `${a.id} ${b.id}`).toBeLessThan(2_000);
      }
    }
  });
});
