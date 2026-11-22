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
