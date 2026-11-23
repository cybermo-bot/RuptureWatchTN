// The threshold explorer's replay: the real scenario with the defaults matches /scenario; the
// false alarms never confirm with the defaults, and do with low settings.

import { describe, expect, it } from 'vitest';
import { EXPLORER_DAYS, EXPLORER_START, explorerScenarios, replay } from '@/lib/scenario/explore';
import { scenarioFrames } from '@/lib/scenario/frames';

const { real, falseAlarm } = explorerScenarios('ANSM', 'https://example.org');
const run = (steps: typeof real, params = {}) => replay(steps, EXPLORER_START, EXPLORER_DAYS, params);

describe('replay', () => {
  it('with the defaults, the real scenario climbs as on /scenario and clears', () => {
    const r = run(real);
    const frames = scenarioFrames('ANSM', 'https://example.org');
    const firstFrame = (level: string) => frames.find((f) => f.level === level)?.day;
    expect(r.firstDay).toMatchObject({ watch: firstFrame('watch'), likely: firstFrame('likely'), confirmed: firstFrame('confirmed'), cleared: firstFrame('cleared') });
    expect(r.firstDay).toMatchObject({ watch: 0, likely: 2, confirmed: 5, cleared: 22 });
    expect(r.days).toHaveLength(EXPLORER_DAYS + 1);
    // The ANSM notice is still active (90 days): once cleared, the next evaluation reads
    // "sous surveillance" again, by the rules as written (cleared is held only without evidence).
    expect(r.days.at(-1)).toBe('watch');
  });

  it('a higher bar confirms later or never; a longer wait ignores the late orders', () => {
    expect(run(real, { confirmMinPharmacies: 8 }).firstDay.confirmed).toBeUndefined();
    expect(run(real, { confirmMinGovernorates: 3 }).firstDay.confirmed).toBeUndefined();
    const slow = run(real, { minUndeliveredHours: 96 });
    expect(slow.firstDay.confirmed).toBeUndefined();
    expect(slow.firstDay.watch).toBe(0); // the foreign notice still counts
  });

  it('the false alarms never confirm with the defaults', () => {
    const r = run(falseAlarm);
    expect(r.firstDay.confirmed).toBeUndefined();
    expect(r.firstDay.likely).toBeDefined();
  });

  it('with low settings they do: one governorate enough, or one pharmacy for "probable"', () => {
    expect(run(falseAlarm, { confirmMinGovernorates: 1 }).firstDay.confirmed).toBeDefined();
    expect(run(falseAlarm, { likelyMinPharmacies: 1 }).firstDay.likely).toBe(1);
    expect(run(falseAlarm).firstDay.likely).toBeGreaterThan(1);
  });
});
