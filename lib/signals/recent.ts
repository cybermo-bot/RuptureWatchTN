// The last level changes, as a short feed (part 8, item 7): in the coordination space and in
// the home page's picture. Counts by governorate as the screens receive them (app.shown_evidence:
// "<3" below 3 pharmacies, governorates withheld then), never a pharmacy.

import type { ShownEvidence } from '@/lib/signals/shown';
import type { EventRow } from '@/lib/signals/views';

export const RECENT_CHANGES = 5;

export type ChangeCounts =
  | { key: 'none' }
  | { key: 'few' }
  | { key: 'oneGovernorate'; pharmacies: number }
  | { key: 'governorates'; pharmacies: number; governorates: number };

/** The pharmacies line of one change, from its evidence as shown ("<3" kept). */
export function changeCounts(e: Pick<ShownEvidence, 'pharmacies14d' | 'governorates14d'>): ChangeCounts {
  if (e.pharmacies14d === '<3') return { key: 'few' };
  if (e.pharmacies14d === 0) return { key: 'none' };
  if (e.governorates14d === 1) return { key: 'oneGovernorate', pharmacies: e.pharmacies14d };
  return {
    key: 'governorates',
    pharmacies: e.pharmacies14d,
    governorates: e.governorates14d ?? 0,
  };
}

/**
 * The home page's feed: only demonstration changes, as for its picture (part 8, item 1): the
 * change's own evidence entirely simulated, and the medicine one of the demonstration signals.
 * Newest first, at most `n`.
 */
export function demonstrationChanges(events: EventRow[], demonstrationIds: Set<string>, n = RECENT_CHANGES): EventRow[] {
  return events
    .filter((e) => demonstrationIds.has(e.molecule_id))
    .filter((e) => {
      const origins = e.evidence?.origins ?? [];
      return origins.length > 0 && origins.every((o) => o === 'simulated');
    })
    .sort((a, b) => b.at.localeCompare(a.at) || b.id - a.id)
    .slice(0, n);
}
