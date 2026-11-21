// Parsing rules for the CNAM list of medicines covered by the basic scheme (VEI list).
// Pure functions, unit tested in tests/catalogue.test.ts.
//
// The source has one free-text commercial name per row (brand, strength, form and pack together).
// We keep it word for word as `label`, extract a short `brand` for search and display,
// and leave strength, form and presentation empty: splitting free text would invent values.

export interface SourceRow {
  /** 1-based row number in the worksheet, for traceability. */
  line: number;
  CODE_PCT: unknown;
  NOM_COMMERCIAL: unknown;
  PRIX_PUBLIC: unknown;
  TARIF_REFERENCE: unknown;
  CATEGORIE: unknown;
  DCI: unknown;
  AP: unknown;
}

export interface CatalogueMedicine {
  code_pct: string;
  label: string;
  brand: string;
  dci: string;
  molecule: string;
  vei_category: 'V' | 'E' | 'I';
  price_tnd: number;
}

export type ParseResult = { ok: true; value: CatalogueMedicine } | { ok: false; reason: string };

export const EXPECTED_HEADER = [
  'CODE_PCT',
  'NOM_COMMERCIAL',
  'PRIX_PUBLIC',
  'TARIF_REFERENCE',
  'CATEGORIE',
  'DCI',
  'AP',
] as const;

/** Collapses spacing, keeps the source's letters. */
export function cleanText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).normalize('NFC').replace(/\s+/g, ' ').trim();
}

/**
 * Normalised DCI used as the molecule name: upper case, single spaces,
 * combination separators written " + ". The order of components is kept as in the source.
 */
export function normaliseDci(value: unknown): string {
  return cleanText(value)
    .toUpperCase()
    .replace(/\s*\+\s*/g, ' + ')
    .replace(/\s+\/\s+/g, ' + ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
}

// Words that start the form or the pack in a commercial name. Compared in upper case,
// without trailing punctuation. Mixed-case words ("Comp", "Gel") stop the brand anyway.
const FORM_WORDS = new Set([
  'AMP', 'AMPOULE', 'AMPOULES', 'BAIN', 'BT', 'BTE', 'BOITE', 'CAP', 'CAPS', 'CAPSULE', 'COFFRET',
  'COLLYRE', 'COMP', 'COMPRIME', 'COMPRIMÉ', 'COMPRIMES', 'COMPRIMÉS', 'CP', 'CPR', 'CR', 'CREME',
  'CRÈME', 'DRAGEE', 'DRAGÉE', 'EFFERV', 'EMULSION', 'ÉMULSION', 'FL', 'FLACON', 'GEL', 'GÉL',
  'GELULE', 'GÉLULE', 'GELULES', 'GÉLULES', 'GOUTTES', 'GRANULES', 'GRANULÉS', 'GTTES', 'INHAL',
  'INJ', 'INJECTABLE', 'LOTION', 'LYOPH', 'LYOPHILISAT', 'MOUSSE', 'OVULE', 'OVULES', 'PASTILLE',
  'PATCH', 'PDE', 'PDRE', 'PERF', 'POMMADE', 'POUDRE', 'SACH', 'SACHET', 'SACHETS', 'SER',
  'SERINGUE', 'SHAMPOOING', 'SIROP', 'SOL', 'SOLUTE', 'SOLUTÉ', 'SOLUTION', 'SPRAY', 'STYLO',
  'SUPP', 'SUPPO', 'SUPPOSITOIRE', 'SUSP', 'SUSPENSION', 'TB', 'TUBE',
]);

/**
 * The brand is the first word of the commercial name, plus following words written in
 * capitals that are neither a form word nor contain a digit ("NEBILET PLUS", "FELDENE DISPERSIBLE").
 * At most four words.
 */
export function extractBrand(label: string): string {
  const tokens = cleanText(label).split(' ').filter(Boolean);
  if (tokens.length === 0) return '';
  const brand = [tokens[0].split('(')[0].replace(/[.,;:]+$/, '')];
  for (const token of tokens.slice(1)) {
    if (brand.length >= 4 || tokens[0].includes('(')) break;
    // A parenthesis ends the brand: "SANOFI(EX ..." keeps "SANOFI".
    const opensComment = token.includes('(');
    const bare = token.split('(')[0].replace(/[.,;:]+$/, '');
    if (!bare) break;
    if (/\d/.test(bare)) break;
    if (/[a-zà-ÿ]/.test(bare)) break; // mixed or lower case: form, pack or comment
    if (/^[(/\-+&]/.test(bare)) break;
    if (FORM_WORDS.has(bare.toUpperCase())) break;
    if (bare.includes('.') || bare.includes('/')) break; // "COMP.PELL", "FL/30"
    brand.push(bare);
    if (opensComment) break;
  }
  return brand.join(' ');
}

export function parseRow(row: SourceRow): ParseResult {
  const codeRaw = row.CODE_PCT;
  if (codeRaw === null || codeRaw === undefined || cleanText(codeRaw) === '') {
    return { ok: false, reason: 'CODE_PCT vide' };
  }
  const code = typeof codeRaw === 'number' ? String(Math.trunc(codeRaw)) : cleanText(codeRaw);
  if (!/^\d+$/.test(code)) return { ok: false, reason: `CODE_PCT non numérique (${code})` };

  const label = cleanText(row.NOM_COMMERCIAL);
  if (!label) return { ok: false, reason: 'NOM_COMMERCIAL vide' };

  const dci = cleanText(row.DCI);
  if (!dci) return { ok: false, reason: 'DCI vide' };

  const category = cleanText(row.CATEGORIE).toUpperCase();
  if (category !== 'V' && category !== 'E' && category !== 'I') {
    return { ok: false, reason: `CATEGORIE inconnue (${category || 'vide'})` };
  }

  const price = typeof row.PRIX_PUBLIC === 'number' ? row.PRIX_PUBLIC : Number(cleanText(row.PRIX_PUBLIC).replace(',', '.'));
  if (!Number.isFinite(price) || price < 0) return { ok: false, reason: 'PRIX_PUBLIC invalide' };

  const brand = extractBrand(label);
  if (!brand) return { ok: false, reason: 'marque introuvable dans NOM_COMMERCIAL' };

  return {
    ok: true,
    value: {
      code_pct: code,
      label,
      brand,
      dci,
      molecule: normaliseDci(dci),
      vei_category: category,
      price_tnd: Math.round(price * 1000) / 1000,
    },
  };
}

/** Small deterministic generator, so the published sample can be reproduced. */
export function seededSample<T>(items: T[], size: number, seed: number): T[] {
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const pool = [...items];
  const out: T[] = [];
  while (out.length < size && pool.length > 0) {
    out.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
  }
  return out;
}
