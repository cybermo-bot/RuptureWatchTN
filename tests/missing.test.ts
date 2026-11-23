import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS, evaluate, type PharmacyReport } from '@/lib/signal';
import { missingForNextLevel, missingText, type MissingEvidence } from '@/lib/signals/missing';
import { shownEvidence } from '@/lib/signals/shown';

// "Ce qui manque" (session 6, part 5): computed from the evaluator's level, rule and evidence.
// On real data it names the condition and never prints a count; in the scenario counts are exact.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = new Date('2026-11-20T12:00:00Z');
const MOL = 'm';
let seq = 0;
function nd(pharmacy: string, gov: string, daysAgo: number): PharmacyReport {
  const reportedAt = new Date(NOW.getTime() - daysAgo * DAY);
  return {
    id: `r${++seq}`,
    pharmacyId: pharmacy,
    governorateCode: gov,
    moleculeId: MOL,
    kind: 'not_delivered',
    orderedAt: new Date(reportedAt.getTime() - 80 * HOUR),
    reportedAt,
    origin: 'simulated',
  };
}
function back(pharmacy: string, gov: string, daysAgo: number): PharmacyReport {
  return { ...nd(pharmacy, gov, daysAgo), kind: 'delivered_again', orderedAt: null };
}
const run = (reports: PharmacyReport[], previous?: Parameters<typeof evaluate>[0]['previous']) =>
  evaluate({ moleculeId: MOL, reports, notices: [], now: NOW, previous });

/** The line on a real screen (shown evidence) and in the scenario (exact evidence). */
function lines(reports: PharmacyReport[], previous?: Parameters<typeof evaluate>[0]['previous']) {
  const e = run(reports, previous);
  const real = missingForNextLevel(e.level, e.rule, shownEvidence(e.evidence), { exact: false, now: NOW });
  const scenario = missingForNextLevel(e.level, e.rule, e.evidence, { exact: true, now: NOW });
  return { e, real, scenario, realText: real ? missingText(real) : null, scenarioText: scenario ? missingText(scenario) : null };
}

describe('ce qui manque', () => {
  it('nothing yet: a first report or a foreign notice', () => {
    const { realText } = lines([]);
    expect(realText).toBe('Pour « Sous surveillance », il manque un premier signalement de pharmacie ou un avis d’un régulateur étranger.');
  });

  it('one pharmacy: other pharmacies within the likely window, never a count on real data', () => {
    const { e, realText, scenarioText } = lines([nd('a', 'TN-11', 1)]);
    expect(e.level).toBe('watch');
    expect(realText).toBe(
      `Pour « Probable », il manque des signalements d’autres pharmacies dans les ${DEFAULT_PARAMS.likelyWindowDays} jours, ou un avis d’un régulateur étranger.`,
    );
    expect(scenarioText).toContain('1 pharmacie de plus dans les 7 jours');
  });

  it('four pharmacies in one governorate: the second governorate is missing, not more pharmacies', () => {
    const { e, real, realText, scenarioText } = lines([nd('a', 'TN-61', 1), nd('b', 'TN-61', 2), nd('c', 'TN-61', 3), nd('d', 'TN-61', 4)]);
    expect(e.rule).toBe('single_governorate_cap');
    expect(real?.items).toEqual([{ kind: 'governorates', more: 1 }]);
    expect(realText).toBe('Pour « Confirmée », il manque un deuxième gouvernorat.');
    expect(scenarioText).toBe('Pour « Confirmée », il manque un deuxième gouvernorat.');
    // Moving one report to a second governorate, same total: the evaluator confirms, nothing is missing.
    const moved = lines([nd('a', 'TN-61', 1), nd('b', 'TN-61', 2), nd('c', 'TN-61', 3), nd('d', 'TN-11', 4)]);
    expect(moved.e.level).toBe('confirmed');
  });

  it('two pharmacies in two governorates: real data names the condition, the count stays hidden', () => {
    const { e, real, realText, scenarioText } = lines([nd('a', 'TN-11', 1), nd('b', 'TN-61', 2)]);
    expect(e.level).toBe('likely');
    // Shown evidence: "<3" pharmacies, governorates withheld.
    expect(real?.items).toEqual([{ kind: 'confirmPharmacies', more: null, governoratesUnknown: true }]);
    expect(realText).toBe(
      'Pour « Confirmée », il manque des signalements d’autres pharmacies, jusqu’au seuil de « confirmée », dans au moins 2 gouvernorats.',
    );
    expect(realText).not.toMatch(/\b[12]\b(?! gouvernorats)/);
    // In the scenario: exact.
    expect(scenarioText).toBe('Pour « Confirmée », il manque 2 pharmacies de plus sur 14 jours.');
  });

  it('three pharmacies in one governorate: both conditions, joined', () => {
    const { scenarioText, realText } = lines([nd('a', 'TN-11', 1), nd('b', 'TN-11', 2), nd('c', 'TN-11', 3)]);
    expect(scenarioText).toBe('Pour « Confirmée », il manque 1 pharmacie de plus sur 14 jours et un deuxième gouvernorat.');
    expect(realText).toBe('Pour « Confirmée », il manque des signalements d’autres pharmacies, jusqu’au seuil de « confirmée » et un deuxième gouvernorat.');
  });

  it('confirmée: what levée needs, quiet days and "livré à nouveau"', () => {
    const reports = [nd('a', 'TN-11', 2), nd('b', 'TN-11', 3), nd('c', 'TN-61', 4), nd('d', 'TN-61', 5)];
    const { e, real, scenarioText } = lines(reports);
    expect(e.level).toBe('confirmed');
    expect(real?.next).toBe('cleared');
    expect(real?.items).toEqual([
      { kind: 'quietDays', days: 12 },
      { kind: 'deliveredAgain', more: null, uncertain: false },
    ]);
    expect(scenarioText).toBe(
      'Pour « Levée », il manque encore 12 jours sans nouvelle commande non livrée et 2 pharmacies de plus qui signalent le médicament livré à nouveau.',
    );
  });

  it('one "livré à nouveau" on real data reads "<3": it may already be enough, so the line says "if not yet"', () => {
    const previous = { level: 'confirmed' as const, since: new Date(NOW.getTime() - 20 * DAY) };
    const reports = [nd('a', 'TN-11', 10), nd('b', 'TN-11', 11), nd('c', 'TN-61', 12), nd('d', 'TN-61', 13), back('a', 'TN-11', 1)];
    const { e, real, realText } = lines(reports, previous);
    expect(e.level).toBe('confirmed');
    expect(real?.items).toContainEqual({ kind: 'deliveredAgain', more: null, uncertain: true });
    expect(realText).toContain('s’il n’y en a pas encore assez');
  });

  it('levée: nothing to say', () => {
    const previous = { level: 'confirmed' as const, since: new Date(NOW.getTime() - 30 * DAY) };
    const reports = [nd('a', 'TN-11', 20), nd('b', 'TN-11', 21), nd('c', 'TN-61', 22), nd('d', 'TN-61', 23), back('a', 'TN-11', 2), back('c', 'TN-61', 1)];
    const { e, real } = lines(reports, previous);
    expect(e.level).toBe('cleared');
    expect(real).toBeNull();
  });

  it('never prints a pharmacy count on real data, whatever the evidence', () => {
    const govs = ['TN-11', 'TN-61', 'TN-51'];
    for (let n = 0; n <= 6; n++) {
      for (let g = 1; g <= 3; g++) {
        const reports = Array.from({ length: n }, (_, i) => nd(`p${i}`, govs[i % g], 1 + i));
        const { realText } = lines(reports);
        if (realText === null) continue;
        // The only numbers allowed are days and design parameters (governorates required, the "livré" bar).
        for (const m of realText.replace(/\d+ jours?/g, '').matchAll(/\d+/g)) {
          expect([DEFAULT_PARAMS.likelyWindowDays, DEFAULT_PARAMS.confirmMinGovernorates, DEFAULT_PARAMS.clearMinDeliveredPharmacies].map(String)).toContain(
            m[0],
          );
        }
      }
    }
  });

  it('accepts evidence as screens receive it, dates as strings', () => {
    const e: MissingEvidence = { pharmacies14d: 5, governorates14d: 1, pharmacies7d: 3, deliveredAgainPharmacies: 0, lastNotDeliveredAt: NOW.toISOString() };
    expect(missingForNextLevel('likely', 'single_governorate_cap', e, { exact: false, now: NOW })?.items).toEqual([{ kind: 'governorates', more: 1 }]);
  });
});
