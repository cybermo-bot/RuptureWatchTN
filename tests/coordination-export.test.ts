import { describe, expect, it } from 'vitest';
import { CSV_COLUMNS, toCsv, toJson } from '@/lib/coordination/export';
import type { SignalRow } from '@/lib/signals/views';

const signal = (over: Partial<SignalRow> = {}): SignalRow => ({
  molecule_id: '00000000-0000-4000-8000-000000000100',
  molecule_name: 'LEVETIRACETAM',
  level: 'likely',
  since: '2026-11-20T08:00:00.000Z',
  rule: 'two_pharmacies_7d',
  updated_at: '2026-11-20T08:00:00.000Z',
  evidence: {
    pharmacies14d: '<3',
    governorates14d: null,
    pharmacies7d: '<3',
    deliveredAgainPharmacies: 0,
    ignoredTooEarly: 0,
    lastNotDeliveredAt: null,
    notices: [],
    origins: ['simulated'],
  },
  ...over,
});

describe('coordination export', () => {
  it('writes one CSV row per molecule and governorate, with the documented columns', () => {
    const csv = toCsv([
      {
        signal: signal(),
        counts: [
          { governorate_code: 'TN-11', governorate_name: 'Tunis', pharmacies: '<3' },
          { governorate_code: 'TN-61', governorate_name: 'Sfax', pharmacies: '<3' },
        ],
      },
    ]);
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe(CSV_COLUMNS.join(','));
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain(',<3,,<3,simulated,TN-11,Tunis,<3');
  });

  it('keeps a molecule without governorate counts, and never lets a cell run as a spreadsheet formula', () => {
    const csv = toCsv([{ signal: signal({ molecule_name: '=HYPERLINK("x")' }), counts: [] }]);
    const row = csv.trim().split('\r\n')[1];
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
    expect(row.endsWith(',,,')).toBe(true);
  });

  it('contains only aggregates: no organisation id or name', () => {
    const json = JSON.stringify(
      toJson([{ signal: signal(), counts: [{ governorate_code: 'TN-11', governorate_name: 'Tunis', pharmacies: '<3' }] }], new Date()),
    );
    expect(json).not.toMatch(/organisation|pharmacy_id|display_name|Pharmacie démo/i);
    expect(json).toContain('"pharmacies_14d":"<3"');
    expect(json).toContain("Ceci n'est pas une déclaration officielle de rupture.");
  });
});
