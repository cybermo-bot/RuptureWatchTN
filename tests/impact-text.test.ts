import { describe, expect, it } from 'vitest';
import { impactText } from '@/lib/pharmacy/impact-text';

// Session 4, fix 3: report_impact counts the reporting pharmacy, and the sentence says so.
describe('impact sentence on the result screen', () => {
  it('says "Avec la vôtre" and gives the count, the reporting pharmacy included', () => {
    expect(impactText({ pharmacies: '5', governorates: 3, windowDays: 14 })).toBe(
      'Avec la vôtre, 5 pharmacies signalent ce médicament dans 3 gouvernorats sur les 14 derniers jours.',
    );
  });

  it('reads "moins de 3" below 3 pharmacies, without the number of governorates', () => {
    const text = impactText({ pharmacies: '<3', governorates: null, windowDays: 14 });
    expect(text).toBe('Avec la vôtre, moins de 3 pharmacies signalent ce médicament sur les 14 derniers jours.');
    expect(text).not.toMatch(/gouvernorat/);
  });

  it('handles a single governorate', () => {
    expect(impactText({ pharmacies: '3', governorates: 1, windowDays: 14 })).toBe(
      'Avec la vôtre, 3 pharmacies signalent ce médicament, toutes dans le même gouvernorat, sur les 14 derniers jours.',
    );
  });

  it('says the count is unavailable when report_impact failed', () => {
    expect(impactText(null)).toBe('Le décompte national n’est pas disponible pour l’instant.');
  });
});

// Pilot-1 item 7: below « Probable », one plain line, its threshold read from params.ts.
describe('below-threshold line on the result screen', () => {
  it('says a second pharmacy is needed with the default threshold of two', async () => {
    const { belowThresholdText } = await import('@/lib/pharmacy/impact-text');
    const { DEFAULT_PARAMS } = await import('@/lib/signal');
    expect(DEFAULT_PARAMS.likelyMinPharmacies).toBe(2);
    expect(belowThresholdText()).toBe(
      'Votre signalement est enregistré. Il faut le signalement d’une deuxième pharmacie pour passer à « Probable ».',
    );
  });

  it('gives the count and the window when the threshold is higher', async () => {
    const { belowThresholdText } = await import('@/lib/pharmacy/impact-text');
    expect(belowThresholdText(3, 7)).toBe(
      'Votre signalement est enregistré. Il faut les signalements de 3 pharmacies sur 7 jours pour passer à « Probable ».',
    );
  });
});
