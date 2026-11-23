// The Library's data file, data/reference/library-fr.json, built by scripts/import-library.ts
// from the French public medicines database (BDPM, Licence Ouverte). French status only:
// never a Tunisian status, never a suggestion (CLAUDE.md rule 12).

/**
 * - prescription: the BDPM lists a prescription condition (liste I, liste II, stupéfiant, or
 *   another condition such as hospital prescription).
 * - no_prescription_stated: a condition says in words that no prescription is needed.
 * - no_condition: the BDPM lists no condition at all for the product.
 * - undetermined: conditions exist but none of the rules above reads them.
 */
export type FrenchStatus = 'prescription' | 'no_prescription_stated' | 'no_condition' | 'undetermined';

export type PrescriptionKind = 'liste_i' | 'liste_ii' | 'stupefiant' | 'other';

export interface LibraryProduct {
  /** BDPM code (CIS). */
  cis: string;
  /** Denomination, word for word from the BDPM. */
  name: string;
  commercialised: boolean;
  status: FrenchStatus;
  kinds: PrescriptionKind[];
  /** The BDPM conditions of prescription and dispensing, word for word. */
  conditions: string[];
}

export interface LibraryCheck {
  query: string;
  expected: 'prescription' | 'no_condition';
  found: string | null;
  status: FrenchStatus | null;
  ok: boolean;
}

export interface LibraryFile {
  source: {
    name: string;
    page: string;
    licence: string;
    files: { file: string; url: string; bytes: number; sha256: string }[];
    downloadedAt: string;
  };
  generatedAt: string;
  /** The ten known products used to check the reading of the conditions (docs/reports/track-c.md). */
  check: { passed: boolean; results: LibraryCheck[] };
  counts: { cnamMolecules: number; matched: number; unmatched: number; products: number };
  /** Keyed by the CNAM molecule name, exactly as in the molecules table. */
  molecules: Record<string, { products: LibraryProduct[] }>;
  unmatched: string[];
}
