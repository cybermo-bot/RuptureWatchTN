import { describe, expect, it } from 'vitest';
import { explanationText } from '@/components/LevelExplanation';
import type { ShownEvidence } from '@/lib/signals/shown';

const evidence = (e: Partial<ShownEvidence>): ShownEvidence => ({
  pharmacies14d: 0,
  governorates14d: 0,
  pharmacies7d: 0,
  deliveredAgainPharmacies: 0,
  ignoredTooEarly: 0,
  lastNotDeliveredAt: null,
  notices: [],
  origins: [],
  ...e,
});

describe('explanation sentences', () => {
  it('shows pharmacy counts under 3 as "moins de 3" and capitalises the sentence', () => {
    expect(explanationText('local_reports_below_threshold', evidence({ pharmacies14d: '<3', governorates14d: null }))).toBe(
      'Moins de 3 pharmacie(s) signale(nt) une commande non livrée depuis plus de 72 heures sur les 14 derniers jours.',
    );
  });

  it('still reads "moins de 3" if exact counts of 1 or 2 are passed by mistake', () => {
    for (const n of [1, 2]) {
      expect(explanationText('two_pharmacies_7d', evidence({ pharmacies7d: n }))).toMatch(/^Moins de 3 pharmacies/);
      expect(explanationText('local_reports_below_threshold', evidence({ pharmacies14d: n, governorates14d: n }))).toMatch(/^Moins de 3/);
    }
  });

  it('fills pharmacies and governorates from the counts', () => {
    expect(explanationText('confirmed_threshold', evidence({ pharmacies14d: 4, governorates14d: 2 }))).toBe(
      '4 pharmacies dans 2 gouvernorats signalent une commande non livrée sur les 14 derniers jours.',
    );
  });

  it('names the foreign sources', () => {
    const notices = [
      { source: 'ANSM', status: 'shortage' as const, publishedAt: '2026-11-01T00:00:00Z', url: 'https://example.org/a' },
      { source: 'BfArM', status: 'tension' as const, publishedAt: '2026-11-02T00:00:00Z', url: 'https://example.org/b' },
    ];
    expect(explanationText('foreign_notice_only', evidence({ notices }))).toContain('(ANSM, BfArM)');
  });

  it('never leaves a placeholder unfilled', () => {
    for (const rule of [
      'no_evidence', 'foreign_notice_only', 'local_reports_below_threshold', 'two_pharmacies_7d',
      'local_report_plus_foreign_notice', 'single_governorate_cap', 'confirmed_threshold',
      'hold_until_delivered', 'quiet_period_downgrade', 'delivered_again_cleared', 'cleared_expired',
    ] as const) {
      expect(explanationText(rule, evidence({ pharmacies14d: 5, governorates14d: 1 }))).not.toMatch(/\{\w+\}/);
    }
  });
});
