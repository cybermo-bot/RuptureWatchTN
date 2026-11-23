import { describe, expect, it } from 'vitest';
import { countByDisplay, displayStatus } from '@/lib/library/data';
import {
  classify,
  cnamKey,
  decodeBdpm,
  KNOWN_PRODUCTS,
  matchMolecules,
  normaliseName,
  parseCompositions,
  parseConditions,
  parseProducts,
  runChecks,
} from '../scripts/lib/library';

// Small extracts written in the BDPM's format (tab-separated, columns as documented). The CIS
// codes and names are made up for the test; the shape is the point.
const tab = (...cols: string[]) => cols.join('\t');
const PRODUCTS = [
  tab('60000001', 'DOLIPRANE 500 mg, comprimé', 'comprimé', 'orale', 'Autorisation active', 'Procédure nationale', 'Commercialisée', '01/01/2000', '', '', ' SANOFI', 'Non'),
  tab('60000002', 'KEPPRA 500 mg, comprimé pelliculé', 'comprimé pelliculé', 'orale', 'Autorisation active', 'Procédure centralisée', 'Commercialisée', '01/01/2000', '', 'EU/1/00/000', ' UCB', 'Non'),
  tab('60000003', 'DEPAKINE 500 mg, comprimé gastro-résistant', 'comprimé', 'orale', 'Autorisation active', 'Procédure nationale', 'Commercialisée', '01/01/2000', '', '', ' SANOFI', 'Oui'),
  tab('60000004', 'ANCIEN PRODUIT 500 mg', 'comprimé', 'orale', 'Autorisation abrogée', 'Procédure nationale', 'Non commercialisée', '01/01/1990', '', '', ' X', 'Non'),
  tab('60000005', 'PARACETAMOL CODEINE TEST, comprimé', 'comprimé', 'orale', 'Autorisation active', 'Procédure nationale', 'Non commercialisée', '01/01/2000', '', '', ' Y', 'Non'),
].join('\r\n');
const COMPO = [
  tab('60000001', 'comprimé', '02202', 'PARACÉTAMOL', '500 mg', 'un comprimé', 'SA', '1'),
  tab('60000002', 'comprimé', '01234', 'LÉVÉTIRACÉTAM', '500 mg', 'un comprimé', 'SA', '1'),
  tab('60000003', 'comprimé', '03456', 'VALPROATE DE SODIUM', '500 mg', 'un comprimé', 'SA', '1'),
  tab('60000003', 'comprimé', '03457', 'ACIDE VALPROÏQUE', '433 mg', 'un comprimé', 'FT', '1'),
  tab('60000004', 'comprimé', '02202', 'PARACÉTAMOL', '500 mg', 'un comprimé', 'SA', '1'),
  tab('60000005', 'comprimé', '02202', 'PARACÉTAMOL', '400 mg', 'un comprimé', 'SA', '1'),
  tab('60000005', 'comprimé', '05555', 'PHOSPHATE DE CODÉINE HÉMIHYDRATÉ', '20 mg', 'un comprimé', 'SA', '2'),
  tab('60000005', 'comprimé', '05556', 'CODÉINE', '15 mg', 'un comprimé', 'FT', '2'),
].join('\n');
const CPD = [tab('60000002', 'liste I'), tab('60000003', 'liste I'), tab('60000003', 'prescription initiale hospitalière annuelle'), tab('60000005', 'liste I')].join('\n');

const products = parseProducts(PRODUCTS);
const compositions = parseCompositions(COMPO);
const conditions = parseConditions(CPD);

describe('reading the BDPM files', () => {
  it('decodes UTF-8, and Windows-1252 when the bytes are not UTF-8', () => {
    expect(decodeBdpm(new TextEncoder().encode('PARACÉTAMOL'))).toBe('PARACÉTAMOL');
    expect(decodeBdpm(Uint8Array.from([0x50, 0x41, 0x52, 0x41, 0x43, 0xc9, 0x54]))).toBe('PARACÉT');
  });

  it('keeps the active and marketed states of each product', () => {
    expect(products.get('60000001')).toMatchObject({ active: true, commercialised: true });
    expect(products.get('60000004')).toMatchObject({ active: false, commercialised: false });
  });

  it('refuses a file whose columns do not match the format', () => {
    expect(() => parseProducts('60000001\tONLY TWO')).toThrow(/columns/);
  });

  it('builds substance keys from active substances and from therapeutic fractions', () => {
    expect(compositions.get('60000003')).toEqual({ sa: 'VALPROATE DE SODIUM', ft: 'ACIDE VALPROIQUE' });
    expect(compositions.get('60000005')).toEqual({ sa: 'PARACETAMOL + PHOSPHATE DE CODEINE HEMIHYDRATE', ft: 'CODEINE + PARACETAMOL' });
  });

  it('normalises names without changing words: accents and case only', () => {
    expect(normaliseName('  Lévétiracétam ')).toBe('LEVETIRACETAM');
    expect(cnamKey('PARACETAMOL + CODEINE')).toBe(cnamKey('CODEINE + PARACETAMOL'));
    expect(cnamKey('VALPROATE DE SODIUM')).not.toBe(cnamKey('ACIDE VALPROIQUE'));
  });
});

describe('the French conditions of prescription', () => {
  it('reads the lists and narcotics', () => {
    expect(classify(['liste I'])).toEqual({ status: 'prescription', kinds: ['liste_i'] });
    expect(classify(['liste II'])).toEqual({ status: 'prescription', kinds: ['liste_ii'] });
    expect(classify(['stupéfiant'])).toEqual({ status: 'prescription', kinds: ['stupefiant'] });
    expect(classify(['réservé à l’usage HOSPITALIER'])).toEqual({ status: 'prescription', kinds: ['other'] });
  });

  it('says "no prescription" only when the words say it', () => {
    expect(classify(['non soumis à prescription médicale']).status).toBe('no_prescription_stated');
    expect(classify([]).status).toBe('no_condition');
    expect(classify(['conservation au froid']).status).toBe('undetermined');
  });

  it('shows "no condition" as "sans ordonnance" only when the ten checks passed', () => {
    expect(displayStatus('no_condition', false)).toBe('undetermined');
    expect(displayStatus('no_condition', true)).toBe('no_prescription');
    expect(displayStatus('undetermined', true)).toBe('undetermined');
    expect(displayStatus('prescription', false)).toBe('prescription');
  });
});

describe('matching CNAM molecules', () => {
  const { molecules, unmatched } = matchMolecules(
    ['PARACETAMOL', 'LEVETIRACETAM', 'ACIDE VALPROIQUE', 'CODEINE + PARACETAMOL', 'MOLECULE INCONNUE'],
    products,
    compositions,
    conditions,
  );

  it('matches exact names only, and lists the rest as unmatched', () => {
    expect(Object.keys(molecules).sort()).toEqual(['ACIDE VALPROIQUE', 'CODEINE + PARACETAMOL', 'LEVETIRACETAM', 'PARACETAMOL']);
    expect(unmatched).toEqual(['MOLECULE INCONNUE']);
  });

  it('keeps active products only, marketed ones first', () => {
    expect(molecules.PARACETAMOL.products.map((p) => p.cis)).toEqual(['60000001']);
  });

  it('matches a salt through its therapeutic fraction', () => {
    expect(molecules['ACIDE VALPROIQUE'].products[0]).toMatchObject({
      cis: '60000003',
      status: 'prescription',
      kinds: ['liste_i', 'other'],
      conditions: ['liste I', 'prescription initiale hospitalière annuelle'],
    });
  });

  it('counts products by what the page shows', () => {
    expect(countByDisplay(molecules.PARACETAMOL.products, false)).toEqual({ prescription: 0, no_prescription: 0, undetermined: 1 });
  });
});

describe('the check on known products', () => {
  it('lists ten products, both kinds', () => {
    expect(KNOWN_PRODUCTS).toHaveLength(10);
    expect(KNOWN_PRODUCTS.filter((k) => k.expected === 'prescription')).toHaveLength(5);
  });

  it('reports what it read for each, and fails when a product is missing', () => {
    const results = runChecks(products, conditions);
    expect(results.find((r) => r.query === 'KEPPRA 500 MG')).toMatchObject({ ok: true, status: 'prescription' });
    expect(results.find((r) => r.query === 'DOLIPRANE 500 MG')).toMatchObject({ ok: true, status: 'no_condition' });
    expect(results.find((r) => r.query === 'SMECTA')).toMatchObject({ ok: false, found: null });
  });
});
