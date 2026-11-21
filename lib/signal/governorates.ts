// Counts by governorate for the coordinator map. Never returns pharmacy identifiers.
// Small counts are suppressed so a single pharmacy cannot be singled out.

import { DEFAULT_PARAMS, type SignalParams } from './params';
import type { PharmacyReport } from './types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const SMALL_CELL_LIMIT = 3;

export interface GovernorateCount {
  governorateCode: string;
  /** Exact count. Server side only: never send it to a screen without `display`. */
  pharmacies: number;
  /** What a screen may show: "<3" below the small-cell limit, the number otherwise. */
  display: string;
  suppressed: boolean;
}

export function displayCount(n: number): { display: string; suppressed: boolean } {
  if (n === 0) return { display: '0', suppressed: false };
  if (n < SMALL_CELL_LIMIT) return { display: `<${SMALL_CELL_LIMIT}`, suppressed: true };
  return { display: String(n), suppressed: false };
}

/**
 * Distinct pharmacies with a valid not_delivered report in the confirm window, per governorate.
 * Pass a moleculeId to restrict to one molecule, or null for all molecules.
 */
export function countByGovernorate(
  reports: PharmacyReport[],
  moleculeId: string | null,
  now: Date,
  params: Partial<SignalParams> = {},
): GovernorateCount[] {
  const p = { ...DEFAULT_PARAMS, ...params };
  const t = now.getTime();
  const byGov = new Map<string, Set<string>>();

  for (const r of reports) {
    if (moleculeId !== null && r.moleculeId !== moleculeId) continue;
    if (r.kind !== 'not_delivered' || r.orderedAt === null) continue;
    const reported = r.reportedAt.getTime();
    if (reported > t || t - reported >= p.confirmWindowDays * DAY) continue;
    if (reported - r.orderedAt.getTime() < p.minUndeliveredHours * HOUR) continue;
    if (!byGov.has(r.governorateCode)) byGov.set(r.governorateCode, new Set());
    byGov.get(r.governorateCode)!.add(r.pharmacyId);
  }

  return [...byGov.entries()]
    .map(([governorateCode, set]) => ({
      governorateCode,
      pharmacies: set.size,
      ...displayCount(set.size),
    }))
    .sort((a, b) => b.pharmacies - a.pharmacies || a.governorateCode.localeCompare(b.governorateCode));
}
