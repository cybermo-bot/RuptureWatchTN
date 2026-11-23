// Reads the Library's data file on the server. Nothing from it reaches the browser except what a
// Library page shows for one molecule.

import 'server-only';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { FrenchStatus, LibraryFile, LibraryProduct } from './types';

const FILE = join(process.cwd(), 'data', 'reference', 'library-fr.json');

let cached: { mtime: number; file: LibraryFile | null } | null = null;

export function readLibrary(): LibraryFile | null {
  if (!existsSync(FILE)) return null;
  const { mtimeMs } = statSync(FILE);
  if (cached && cached.mtime === mtimeMs) return cached.file;
  const value = JSON.parse(readFileSync(FILE, 'utf8')) as LibraryFile;
  const file = value && typeof value === 'object' && value.molecules && value.source ? value : null;
  cached = { mtime: mtimeMs, file };
  return file;
}

/** What a product's French status reads as on screen. */
export type DisplayStatus = 'prescription' | 'no_prescription' | 'undetermined';

/**
 * "No condition listed" reads as "sans ordonnance" only when the ten known products all agreed
 * (check.passed). Otherwise it reads "statut non déterminé": never a guess (track C brief).
 */
export function displayStatus(status: FrenchStatus, checkPassed: boolean): DisplayStatus {
  if (status === 'prescription') return 'prescription';
  if (status === 'no_prescription_stated') return 'no_prescription';
  if (status === 'no_condition' && checkPassed) return 'no_prescription';
  return 'undetermined';
}

export function countByDisplay(products: readonly LibraryProduct[], checkPassed: boolean): Record<DisplayStatus, number> {
  const counts: Record<DisplayStatus, number> = { prescription: 0, no_prescription: 0, undetermined: 0 };
  for (const p of products) counts[displayStatus(p.status, checkPassed)] += 1;
  return counts;
}
