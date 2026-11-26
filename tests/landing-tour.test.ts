// The scenario's key stops (lib/landing/tour.ts, ported from origin/olfa, where they drove the
// home page's globe; here they drive the /scenario stepper): computed from the scenario, never
// written by hand. Each stop must match the frame it comes from, keep small counts suppressed and
// have its own sentence in the message file.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { levelRank, tourStops } from '@/lib/landing/tour';
import { scenarioFrames } from '@/lib/scenario/frames';

const frames = scenarioFrames('Autorité étrangère fictive', '/methode#garde-fous');
const stops = tourStops(frames);
const core = JSON.parse(readFileSync(join(__dirname, '..', 'messages', 'fr', 'core.json'), 'utf8'));

describe('the scenario tour', () => {
  it('starts from the empty view, then stops at every level change', () => {
    expect(stops[0]).toMatchObject({ kind: 'start', day: null, level: 'none', focus: [], fills: {} });
    const changes = frames.filter((f) => f.changed).map((f) => f.index);
    for (const i of changes) expect(stops.map((s) => s.frameIndex)).toContain(i);
  });

  it('copies day, level and rule from the frame it comes from', () => {
    for (const s of stops) {
      const f = frames[s.frameIndex];
      expect(s.level).toBe(f.level);
      expect(s.rule).toBe(f.rule);
      if (s.kind !== 'start') expect(s.day).toBe(f.day);
      expect(s.alerted).toEqual(f.alerted);
    }
  });

  it('shows the step where one governorate is not enough (gate two)', () => {
    const confirmed = stops.findIndex((s) => s.level === 'confirmed' && s.previous !== null);
    const before = stops[confirmed - 1];
    expect(before.kind).toBe('report');
    expect(before.previous).toBeNull();
    expect(before.level).not.toBe('confirmed');
    expect(before.governorates).toBe(1);
    expect(before.alerted).toEqual([]);
  });

  it('keeps the foreign notice apart: no governorate, no pharmacy, the level stops at watch (gate one)', () => {
    const notice = stops.find((s) => s.kind === 'notice')!;
    expect(notice).toMatchObject({ level: 'watch', focus: [], pharmacies: 0, notices: 1 });
  });

  it('points at the reporting governorate and colours every governorate that counts', () => {
    const confirmed = stops.find((s) => s.level === 'confirmed')!;
    const f = frames[confirmed.frameIndex];
    expect(confirmed.focus).toEqual([f.governorateCode]);
    expect(Object.keys(confirmed.fills).sort()).toEqual(f.counts.map((c) => c.governorateCode).sort());
    expect(Object.values(confirmed.fills).every((l) => l === 'confirmed')).toBe(true);
    expect(confirmed.governorates).toBe(f.evidence.governorates14d);
  });

  it('suppresses counts under 3', () => {
    const first = stops.find((s) => s.kind === 'report')!;
    expect(first.pharmacies).toBe('<3');
    expect(first.governorates).toBeNull();
  });

  it('ends on the stand-down, with every governorate that reported shown as cleared', () => {
    const end = stops[stops.length - 1];
    expect(end.kind).toBe('cleared');
    const reported = new Set(frames.flatMap((f) => f.counts.map((c) => c.governorateCode)));
    expect(new Set(end.focus)).toEqual(reported);
    expect(Object.values(end.fills).every((l) => l === 'cleared')).toBe(true);
    expect(end.pharmacies).toBeNull();
  });

  it('has a sentence for every stop in the message file', () => {
    for (const s of stops.filter((x) => x.kind !== 'start')) {
      expect(core.rules[s.rule], s.rule).toEqual(expect.any(String));
    }
  });

  it('ranks levels for the chart, with "levée" back at the bottom', () => {
    expect(['none', 'watch', 'likely', 'confirmed', 'cleared'].map((l) => levelRank(l as never))).toEqual([0, 1, 2, 3, 0]);
  });
});
