import { describe, expect, it } from 'vitest';
import { changeCounts, demonstrationChanges } from '@/lib/signals/recent';
import type { ShownEvidence } from '@/lib/signals/shown';
import type { EventRow } from '@/lib/signals/views';
import type { Origin } from '@/lib/signal';

// Part 8, item 7: the last five level changes, counts by governorate only, "<3" kept.

const evidence = (
  pharmacies14d: ShownEvidence['pharmacies14d'],
  governorates14d: number | null,
  origins: Origin[] = ['simulated'],
): ShownEvidence => ({
  pharmacies14d,
  governorates14d,
  pharmacies7d: 0,
  deliveredAgainPharmacies: 0,
  ignoredTooEarly: 0,
  lastNotDeliveredAt: null,
  notices: [],
  origins,
});

let nextId = 1;
const event = (molecule: string, at: string, origins: Origin[] = ['simulated']): EventRow => ({
  id: nextId++,
  molecule_id: molecule,
  molecule_name: molecule.toUpperCase(),
  from_level: 'none',
  to_level: 'watch',
  rule: 'local_reports_below_threshold',
  evidence: evidence('<3', null, origins),
  at,
});

describe('changeCounts', () => {
  it('keeps "<3" and never says how many governorates then', () => {
    expect(changeCounts(evidence('<3', null))).toEqual({ key: 'few' });
    expect(changeCounts(evidence('<3', 2))).toEqual({ key: 'few' });
  });
  it('says the pharmacies and governorates from 3 pharmacies', () => {
    expect(changeCounts(evidence(5, 2))).toEqual({
      key: 'governorates',
      pharmacies: 5,
      governorates: 2,
    });
    expect(changeCounts(evidence(4, 1))).toEqual({
      key: 'oneGovernorate',
      pharmacies: 4,
    });
    expect(changeCounts(evidence(0, 0))).toEqual({ key: 'none' });
  });
});

describe('demonstrationChanges', () => {
  const demo = new Set(['a', 'b']);
  it('keeps only simulated changes of demonstration medicines, newest first, at most five', () => {
    const events = [
      event('a', '2026-11-20T08:00:00Z'),
      event('b', '2026-11-21T08:00:00Z'),
      event('a', '2026-11-22T08:00:00Z', ['simulated', 'tester']),
      event('c', '2026-11-23T08:00:00Z'),
      event('b', '2026-11-19T08:00:00Z', []),
      ...['10', '11', '12', '13', '14'].map((d) => event('a', `2026-11-${d}T08:00:00Z`)),
    ];
    const kept = demonstrationChanges(events, demo);
    expect(kept.map((e) => e.at.slice(0, 10))).toEqual(['2026-11-21', '2026-11-20', '2026-11-14', '2026-11-13', '2026-11-12']);
    for (const e of kept) expect(e.evidence.origins).toEqual(['simulated']);
  });
  it('gives nothing when there is no demonstration medicine', () => {
    expect(demonstrationChanges([event('a', '2026-11-20T08:00:00Z')], new Set())).toEqual([]);
  });
});
