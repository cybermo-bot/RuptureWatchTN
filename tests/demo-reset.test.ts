import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { demoResetSteps, validSince } from '../scripts/lib/demo-reset';

// Pilot-1 item 3: `npm run demo:reset -- --since <time>` chains the existing scripts, in order.

describe('demo:reset', () => {
  it('cleans since the given time with requests, then clears and rebuilds the shortage before the national picture', () => {
    expect(demoResetSteps('2026-11-27T07:30:00Z')).toEqual([
      { script: 'verify:clean', args: ['--since', '2026-11-27T07:30:00Z', '--requests', '--apply'] },
      { script: 'demo:clear', args: [] },
      { script: 'demo:shortage', args: [] },
      { script: 'demo:national', args: [] },
    ]);
  });

  it('takes an ISO date and time only', () => {
    expect(validSince('2026-11-27T07:30:00Z')).toBe(true);
    expect(validSince('2026-11-27T08:30:00.000+01:00')).toBe(true);
    for (const bad of [undefined, '', '2026-11-27', 'yesterday', '2026-11-27T07:30:00Z; rm x', '2026-13-45T99:99:00Z']) {
      expect(validSince(bad), String(bad)).toBe(false);
    }
    expect(() => demoResetSteps('now')).toThrow();
  });

  it('is an npm script, and every step it runs exists', () => {
    const scripts = (JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts;
    expect(scripts['demo:reset']).toBe('tsx scripts/demo-reset.ts');
    for (const step of demoResetSteps('2026-11-27T07:30:00Z')) expect(scripts[step.script], step.script).toBeDefined();
  });
});
