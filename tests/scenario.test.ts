import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scenarioFrames } from '@/lib/scenario/frames';

const frames = scenarioFrames('Autorité étrangère fictive', '/methode#garde-fous');

describe('the scenario, in memory', () => {
  it('walks from nothing to "levée", through every level, by the real rules', () => {
    expect(frames.map((f) => f.level)).toEqual([
      'none',
      'watch', // foreign notice alone: gate one
      'likely', // one report plus the foreign notice
      'likely',
      'likely', // three pharmacies, one governorate: gate two holds it
      'confirmed', // a second governorate
      'confirmed',
      'confirmed', // first "delivered again": not enough to clear
      'cleared',
    ]);
    expect(frames[1].rule).toBe('foreign_notice_only');
    expect(frames[4].rule).toBe('two_pharmacies_7d');
    expect(frames[5].rule).toBe('confirmed_threshold');
    expect(frames[7].rule).toBe('hold_until_delivered');
    expect(frames.at(-1)!.rule).toBe('delivered_again_cleared');
    expect(frames.at(-1)!.standDown).toBe(true);
  });

  it('alerts the four roles at each change, and nobody when the level holds', () => {
    for (const f of frames) {
      expect(f.alerted.length > 0).toBe(f.changed);
    }
    expect(frames.filter((f) => f.changed).map((f) => f.level)).toEqual(['watch', 'likely', 'confirmed', 'cleared']);
  });

  it('shows counts under 3 as "<3" on the map and in the explanation', () => {
    const third = frames[4];
    expect(third.counts).toEqual([{ governorateCode: 'TN-11', display: '3' }]);
    const second = frames[3];
    expect(second.counts).toEqual([{ governorateCode: 'TN-11', display: '<3' }]);
    expect(second.evidence.pharmacies14d).toBe('<3');
    for (const f of frames) expect([1, 2]).not.toContain(f.evidence.pharmacies14d);
  });

  it('marks everything as simulated and lasts 22 days', () => {
    for (const f of frames.slice(1)) expect(f.evidence.origins).toEqual(['simulated']);
    expect(frames.at(-1)!.day).toBe(22);
  });

  it('never touches the database: the scenario code imports no database module', () => {
    const files = ['lib/scenario/frames.ts', 'components/scenario/ScenarioPlayer.tsx'];
    for (const f of files) {
      const src = readFileSync(join(__dirname, '..', f), 'utf8');
      expect(src, f).not.toMatch(/@\/lib\/db|supabase|fetch\(/i);
    }
  });
});
