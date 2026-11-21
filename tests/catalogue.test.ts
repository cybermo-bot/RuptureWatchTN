import { describe, expect, it } from 'vitest';
import { extractBrand, normaliseDci, parseRow, type SourceRow } from '../scripts/lib/catalogue';

const row = (over: Partial<SourceRow>): SourceRow => ({
  line: 2,
  CODE_PCT: 107611,
  NOM_COMMERCIAL: 'LUSOPRESS Comp Pellicule 20mg Bt 28',
  PRIX_PUBLIC: 12.508,
  TARIF_REFERENCE: 12.488,
  CATEGORIE: 'E',
  DCI: 'NITRENDIPINE',
  AP: 'N',
  ...over,
});

describe('extractBrand', () => {
  it.each([
    ['LUSOPRESS Comp Pellicule 20mg Bt 28', 'LUSOPRESS'],
    ['CO-OLMETEC Comp Pell 20mg/25mg  Bt 30', 'CO-OLMETEC'],
    ['NEBILET PLUS 5MG/12.5 MG Comp Pell BT 28', 'NEBILET PLUS'],
    ['PHLORO ( EX PHLOROGLUCINOL ZENTIVA)  Comp Orodispersible 80MG BT 10', 'PHLORO'],
    ['OXYTETRACYCLINE 3% Pde derm Tb 15gr', 'OXYTETRACYCLINE'],
    ['TETRAXIM FL/1 DOSE', 'TETRAXIM'],
    ['CYVALTEX 500 500 mg COMP. PELL. FL/90', 'CYVALTEX'],
    ['FELDENE DISPERSIBLE Comp 20mg Bt 10', 'FELDENE DISPERSIBLE'],
    ['VERMOZOL 100/5 ML SUSP. BUV. FL/30 ml', 'VERMOZOL'],
    ['AMLODIS 10 mg comp.Bt/30', 'AMLODIS'],
    ['CIDOMYCINE  Amp inj 20mg/2ml Bt 5', 'CIDOMYCINE'],
    ['CLARIUS 0.5 MG/ML SOL. BUV. FL 150 ML', 'CLARIUS'],
    ['DI-ANTACID s.sucre comp.à.croquer Bt/30', 'DI-ANTACID'],
    ['AMOXICILLINE SANOFI(EX AMOXICILLINE  ZENTIVA(ex WINTHROP )) 500 mg/5ml Pdre', 'AMOXICILLINE SANOFI'],
  ])('%s gives %s', (label, brand) => {
    expect(extractBrand(label)).toBe(brand);
  });
});

describe('normaliseDci', () => {
  it('writes combinations with " + " and keeps the source order', () => {
    expect(normaliseDci('TRIAMCINOLONE+ NEOMYCINE +NYSTATINE')).toBe('TRIAMCINOLONE + NEOMYCINE + NYSTATINE');
    expect(normaliseDci('VALSARTAN / HYDROCHLOROTHIAZIDE')).toBe('VALSARTAN + HYDROCHLOROTHIAZIDE');
    expect(normaliseDci('  amoxicilline  ')).toBe('AMOXICILLINE');
  });
});

describe('parseRow', () => {
  it('keeps the commercial name word for word and leaves strength, form and pack empty', () => {
    const result = parseRow(row({}));
    expect(result).toEqual({
      ok: true,
      value: {
        code_pct: '107611',
        label: 'LUSOPRESS Comp Pellicule 20mg Bt 28',
        brand: 'LUSOPRESS',
        dci: 'NITRENDIPINE',
        molecule: 'NITRENDIPINE',
        vei_category: 'E',
        price_tnd: 12.508,
      },
    });
  });

  it.each([
    [{ CODE_PCT: null }, 'CODE_PCT vide'],
    [{ NOM_COMMERCIAL: '  ' }, 'NOM_COMMERCIAL vide'],
    [{ DCI: '' }, 'DCI vide'],
    [{ CATEGORIE: 'X' }, 'CATEGORIE inconnue (X)'],
    [{ PRIX_PUBLIC: 'abc' }, 'PRIX_PUBLIC invalide'],
  ])('rejects %o', (over, reason) => {
    expect(parseRow(row(over))).toEqual({ ok: false, reason });
  });
});
