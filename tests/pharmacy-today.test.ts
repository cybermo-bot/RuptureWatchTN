// Pilot-4 step 4: « Aujourd'hui » puts what changed first and folds the medicines without any
// signal; a foreign notice tags a medicine without moving it up a level.

import { describe, expect, it } from 'vitest';
import type { FollowedMolecule } from '@/lib/pharmacy/data';
import type { Level } from '@/lib/signal';
import { todayOrder } from '@/lib/pharmacy/today';

const evidence = (notices = 0) => ({
  pharmacies14d: 0,
  governorates14d: 0,
  pharmacies7d: 0,
  deliveredAgainPharmacies: 0,
  ignoredTooEarly: 0,
  lastNotDeliveredAt: null,
  notices: Array.from({ length: notices }, () => ({ source: 'FR' }) as never),
  origins: ['simulated' as const],
});

const m = (id: string, level: Level | null, notices = 0): FollowedMolecule => ({
  moleculeId: id,
  name: id.toUpperCase(),
  signal: level ? { level, since: '2026-11-20T00:00:00Z', rule: 'no_signal' as never, evidence: evidence(notices) } : null,
});

describe('todayOrder', () => {
  const followed = [m('a', 'confirmed'), m('b', 'watch'), m('c', null), m('d', 'none', 1), m('e', 'none')];

  it('puts unread (« nouveau ») first, keeps the level order after, folds the quiet ones', () => {
    const { active, quiet } = todayOrder(followed, new Set(['b']));
    expect(active.map((x) => x.moleculeId)).toEqual(['b', 'a', 'd']);
    expect(quiet.map((x) => x.moleculeId)).toEqual(['c', 'e']);
  });

  it('a medicine with only a foreign notice stays active, at its own place', () => {
    const { active } = todayOrder(followed, new Set());
    expect(active.map((x) => x.moleculeId)).toEqual(['a', 'b', 'd']);
  });

  it('an unread alert surfaces even a medicine back to no signal', () => {
    const { active, quiet } = todayOrder(followed, new Set(['e']));
    expect(active[0].moleculeId).toBe('e');
    expect(quiet.map((x) => x.moleculeId)).toEqual(['c']);
  });
});
