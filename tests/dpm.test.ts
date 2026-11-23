// The DPM list: the in_cnam_vei flag (scripts/build-dpm-list.ts) and the "registered in Tunisia"
// match used when the catalogue search finds nothing.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import list from '@/data/reference/dpm-dci.json';
import { substanceKey } from '@/lib/dpm/key';
import { matchesDpm } from '@/lib/dpm/match';

const flag = new Map((list as [string, number][]).map(([n, f]) => [n, f]));

describe('substanceKey', () => {
  it('ignores salts, hydrates, articles, accents, word order and the French final E', () => {
    expect(substanceKey('AMLODIPINE BESYLATE')).toBe(substanceKey('AMLODIPINE'));
    expect(substanceKey('METFORMIN HYDROCHLORIDE')).toBe(substanceKey('METFORMINE'));
    expect(substanceKey('POTASSIUM CHLORURE')).toBe(substanceKey('CHLORURE DE POTASSIUM'));
    expect(substanceKey('AMOXICILLINE TRIHYDRATEE')).toBe(substanceKey('AMOXICILLINE'));
    expect(substanceKey('Lévothyroxine sodique')).toBe(substanceKey('LEVOTHYROXINE'));
    expect(substanceKey('CALCIUM')).toBe('CALCIUM');
  });
});

describe('the DPM list', () => {
  it('has every name once, as built from the raw list', () => {
    const csv = readFileSync(join(__dirname, '..', 'data', 'reference', 'dpm-dci.csv'), 'utf8').trim().split('\n');
    expect(csv.length - 1).toBe(list.length);
    expect(new Set((list as [string, number][]).map(([n]) => n)).size).toBe(list.length);
  });

  it('flags CNAM molecules and their salts, and leaves the others out', () => {
    for (const n of ['AMLODIPINE', 'AMLODIPINE BESYLATE', 'METFORMIN HYDROCHLORIDE', 'ROSUVASTATINE CALCIUM']) expect(flag.get(n)).toBe(1);
    for (const n of ['RUXOLITINIB', 'ABACAVIR', 'ABIRATERONE ACETATE']) expect(flag.get(n)).toBe(0);
  });
});

describe('matchesDpm', () => {
  it('finds a registered name outside the CNAM list, from a start or with a typo', () => {
    for (const q of ['ruxolitinib', 'Ruxolitinib', 'ruxoli', 'ruxolitinb', 'abiraterone']) expect(matchesDpm(q)).toBe(true);
  });

  it('says nothing for CNAM molecules, short or unknown words', () => {
    for (const q of ['amlodipine', 'metformine', 'rux', 'zzzzzz', '']) expect(matchesDpm(q)).toBe(false);
  });
});
