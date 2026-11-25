import { describe, expect, it } from 'vitest';
import { dosageForm } from '@/lib/public/dosage-form';
import { presentationText } from '@/lib/public/presentation';
import { translator } from '@/lib/i18n';

describe('CNAM dosage form labels', () => {
  it.each([
    ['ANTIOMAL 500 Comp Pell 500 MG BT 30', 'ANTIOMAL', 'tablet'],
    ['MÉDICAMENT Gél. 250mg', 'MÉDICAMENT', 'capsule'],
    ['MÉDICAMENT Sirop 5mg/ml', 'MÉDICAMENT', 'oralLiquid'],
    ['MÉDICAMENT Pdre pour susp. buv.', 'MÉDICAMENT', 'oralLiquid'],
    ['MÉDICAMENT Pdre et Sol. Inj.', 'MÉDICAMENT', 'injectable'],
    ['MÉDICAMENT Crème 15g', 'MÉDICAMENT', 'topical'],
    ['NEOFUNGINE Pde Tbe 10gr', 'NEOFUNGINE', 'topical'],
    ['MÉDICAMENT Gttes 20ml', 'MÉDICAMENT', 'drops'],
    ['MÉDICAMENT Suppo. Bt 10', 'MÉDICAMENT', 'suppository'],
    ['MÉDICAMENT Pdre Sachet Bt 20', 'MÉDICAMENT', 'sachet'],
    ['MÉDICAMENT Sol Inh. 200 doses', 'MÉDICAMENT', 'inhaler'],
    ['MÉDICAMENT Pdre 500 mg', 'MÉDICAMENT', 'unknown'],
    ['MÉDICAMENT Amp. 20 ml', 'MÉDICAMENT', 'unknown'],
    ['CRÈME PLUS FL 10 ml', 'CRÈME PLUS', 'unknown'],
    ['', '', 'unknown'],
  ] as const)('recognises %s', (label, brand, form) => {
    expect(dosageForm(label, brand)).toBe(form);
  });
});

describe('plain catalogue presentation labels', () => {
  it('preserves brand, strength, form and pack count in both CNAM orderings', () => {
    const t = translator('fr');
    expect(presentationText({ label: 'ANTIOMAL 500 500mg Comp Pell Bt 60', brand: 'ANTIOMAL' }, t))
      .toBe('ANTIOMAL 500 mg, comprimé pelliculé, boîte de 60');
    expect(presentationText({ label: 'ANTIOMAL 250 Comp Pell 250 MG BT 30', brand: 'ANTIOMAL' }, t))
      .toBe('ANTIOMAL 250 mg, comprimé pelliculé, boîte de 30');
  });

  it('keeps the original label if shortening would lose or confuse details', () => {
    const t = translator('fr');
    for (const label of ['MED 250 500mg Comp Pell Bt 60', 'MED Comp Pell LP 500 mg Bt 60', 'MED Comp Pell 10 MG/2.5MG Bt 30']) {
      expect(presentationText({ label, brand: 'MED' }, t)).toBe(label);
    }
  });
});
