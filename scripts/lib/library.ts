// Pure parts of the Library import, unit tested in tests/library.test.ts.
//
// BDPM files are tab-separated text, one record per line (format described in "Contenu et
// format des fichiers téléchargeables dans la BDM", linked from the download page). Columns read:
//   CIS_bdpm.txt       1 CIS, 2 denomination, 5 AMM status, 7 marketing state
//   CIS_COMPO_bdpm.txt 1 CIS, 4 substance name, 7 nature (SA active substance, FT therapeutic fraction), 8 link number
//   CIS_CPD_bdpm.txt   1 CIS, 2 condition of prescription or dispensing

import type { FrenchStatus, LibraryCheck, LibraryProduct, PrescriptionKind } from '../../lib/library/types';

/** UTF-8 when the bytes are valid UTF-8, Windows-1252 otherwise (older BDPM files). */
export function decodeBdpm(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export function rows(text: string, minColumns: number, file: string): string[][] {
  const out: string[][] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const cols = line.split('\t').map((c) => c.trim());
    if (cols.length < minColumns) {
      throw new Error(`${file}, line ${i + 1}: ${cols.length} columns, expected at least ${minColumns}. The format may have changed.`);
    }
    out.push(cols);
  });
  return out;
}

/** Upper case, no accents, single spaces. Salts and every word kept. */
export function normaliseName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** "VALPROATE DE SODIUM + ACIDE VALPROIQUE" → its components, normalised and sorted. */
export function componentsKey(names: Iterable<string>): string {
  return [...new Set([...names].map(normaliseName).filter(Boolean))].sort().join(' + ');
}

export function cnamKey(molecule: string): string {
  return componentsKey(molecule.split(' + '));
}

export interface Product {
  cis: string;
  name: string;
  active: boolean;
  commercialised: boolean;
}

export function parseProducts(text: string): Map<string, Product> {
  const map = new Map<string, Product>();
  for (const c of rows(text, 7, 'CIS_bdpm.txt')) {
    map.set(c[0], {
      cis: c[0],
      name: c[1],
      active: /autorisation active/i.test(c[4]),
      commercialised: /^commercialis/i.test(c[6]),
    });
  }
  return map;
}

/**
 * Two keys per product: its active substances (SA), and the same with each substance replaced by
 * its therapeutic fraction (FT) when the BDPM gives one ("VALPROATE DE SODIUM" → "ACIDE VALPROÏQUE").
 * A CNAM molecule matches when its name equals either, after normalisation. No fuzzy matching.
 */
export function parseCompositions(text: string): Map<string, { sa: string; ft: string }> {
  const byCis = new Map<string, Map<string, { sa?: string; ft?: string }>>();
  for (const c of rows(text, 8, 'CIS_COMPO_bdpm.txt')) {
    const [cis, , , name, , , nature, link] = c;
    const links = byCis.get(cis) ?? new Map();
    const entry = links.get(link) ?? {};
    if (nature === 'SA') entry.sa = name;
    else if (nature === 'FT') entry.ft = name;
    links.set(link, entry);
    byCis.set(cis, links);
  }
  const out = new Map<string, { sa: string; ft: string }>();
  for (const [cis, links] of byCis) {
    const entries = [...links.values()].filter((e) => e.sa || e.ft);
    out.set(cis, {
      sa: componentsKey(entries.map((e) => e.sa ?? e.ft!)),
      ft: componentsKey(entries.map((e) => e.ft ?? e.sa!)),
    });
  }
  return out;
}

export function parseConditions(text: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const c of rows(text, 2, 'CIS_CPD_bdpm.txt')) {
    if (!c[1]) continue;
    out.set(c[0], [...(out.get(c[0]) ?? []), c[1]]);
  }
  return out;
}

const NO_PRESCRIPTION = /non soumis|sans ordonnance|prescription m[ée]dicale facultative/i;
const LIST_I = /\bliste\s+i\b/i;
const LIST_II = /\bliste\s+ii\b/i;
const NARCOTIC = /stup[ée]fiant/i;
const OTHER = /prescri|ordonnance|r[ée]serv[ée]|hospitali|sp[ée]cialiste|m[ée]dicament d.exception|surveillance particuli/i;

/** Reads a product's conditions. Never infers "no prescription" from anything but the words. */
export function classify(conditions: readonly string[]): { status: FrenchStatus; kinds: PrescriptionKind[] } {
  if (conditions.length === 0) return { status: 'no_condition', kinds: [] };
  const kinds = new Set<PrescriptionKind>();
  let statedNo = false;
  for (const c of conditions) {
    if (NO_PRESCRIPTION.test(c)) {
      statedNo = true;
      continue;
    }
    if (LIST_II.test(c)) kinds.add('liste_ii');
    else if (LIST_I.test(c)) kinds.add('liste_i');
    if (NARCOTIC.test(c)) kinds.add('stupefiant');
    if (!LIST_I.test(c) && !LIST_II.test(c) && !NARCOTIC.test(c) && OTHER.test(c)) kinds.add('other');
  }
  if (kinds.size > 0) return { status: 'prescription', kinds: [...kinds].sort() };
  if (statedNo) return { status: 'no_prescription_stated', kinds: [] };
  return { status: 'undetermined', kinds: [] };
}

/**
 * Ten well-known French products whose status is not in doubt, to check the reading of the
 * conditions before showing "no condition" as "sans ordonnance". The expected values are the
 * team's to confirm (docs/reports/track-c.md); a single mismatch keeps the cautious display.
 */
export const KNOWN_PRODUCTS: { query: string; expected: 'prescription' | 'no_condition' }[] = [
  { query: 'KEPPRA 500 MG', expected: 'prescription' },
  { query: 'DEPAKINE 500 MG', expected: 'prescription' },
  { query: 'AUGMENTIN', expected: 'prescription' },
  { query: 'XANAX 0,25 MG', expected: 'prescription' },
  { query: 'SKENAN', expected: 'prescription' },
  { query: 'DOLIPRANE 500 MG', expected: 'no_condition' },
  { query: 'SPASFON, COMPRIME', expected: 'no_condition' },
  { query: 'SMECTA', expected: 'no_condition' },
  { query: 'GAVISCON', expected: 'no_condition' },
  { query: 'KARDEGIC 75 MG', expected: 'no_condition' },
];

export function runChecks(products: Map<string, Product>, conditions: Map<string, string[]>): LibraryCheck[] {
  const list = [...products.values()].filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name));
  return KNOWN_PRODUCTS.map(({ query, expected }) => {
    const q = normaliseName(query);
    const candidates = list.filter((p) => normaliseName(p.name).startsWith(q));
    const found = candidates.find((p) => p.commercialised) ?? candidates[0];
    if (!found) return { query, expected, found: null, status: null, ok: false };
    const { status } = classify(conditions.get(found.cis) ?? []);
    return { query, expected, found: found.name, status, ok: status === expected };
  });
}

/** For each CNAM molecule, the active French products with exactly the same substances. */
export function matchMolecules(
  cnamMolecules: readonly string[],
  products: Map<string, Product>,
  compositions: Map<string, { sa: string; ft: string }>,
  conditions: Map<string, string[]>,
): { molecules: Record<string, { products: LibraryProduct[] }>; unmatched: string[] } {
  const byKey = new Map<string, Set<string>>();
  for (const [cis, keys] of compositions) {
    if (!products.get(cis)?.active) continue;
    for (const k of new Set([keys.sa, keys.ft])) {
      if (!k) continue;
      byKey.set(k, (byKey.get(k) ?? new Set()).add(cis));
    }
  }
  const molecules: Record<string, { products: LibraryProduct[] }> = {};
  const unmatched: string[] = [];
  for (const m of [...cnamMolecules].sort()) {
    const cisList = byKey.get(cnamKey(m));
    if (!cisList?.size) {
      unmatched.push(m);
      continue;
    }
    molecules[m] = {
      products: [...cisList]
        .map((cis) => {
          const p = products.get(cis)!;
          const conds = conditions.get(cis) ?? [];
          return { cis, name: p.name, commercialised: p.commercialised, ...classify(conds), conditions: conds };
        })
        .sort((a, b) => Number(b.commercialised) - Number(a.commercialised) || a.name.localeCompare(b.name, 'fr')),
    };
  }
  return { molecules, unmatched };
}
