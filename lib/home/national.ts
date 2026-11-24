// The national picture on the home page: what the national unit sees in the demonstration, every
// medicine with an active level, and for each governorate the most serious level among the
// medicines its pharmacies report. Read through the demo coordination account, the same one a
// visitor opens in one click (as /vues does), so the database's access rules decide what comes
// back: counts by governorate only, no pharmacy.
//
// The home page is public, and the public never sees a level below "confirmée" (CLAUDE.md rule
// 10). So the picture keeps only demonstration signals, whose evidence is entirely simulated, and
// is framed as the national unit's view of the demonstration: a signal from tester or official
// data never appears here, at any level.

import 'server-only';
import { demonstrationChanges } from '@/lib/signals/recent';
import {
  LEVEL_ORDER,
  governorateCounts,
  listEvents,
  listSignals,
  sortSignals,
  type ActiveLevel,
  type EventRow,
  type SignalRow,
} from '@/lib/signals/views';
import { demoClient, VIEW_ROLES } from '@/lib/views/demo-clients';
import type { Origin } from '@/lib/signal';

export interface NationalPicture {
  signals: SignalRow[];
  /** Most serious active level per governorate code (governorates with reports in the window). */
  byGovernorate: Record<string, ActiveLevel>;
  /** Medicines at each level now. */
  counts: Record<ActiveLevel, number>;
  /** Origins of the data behind every level shown. */
  origins: Origin[];
  /** The last five level changes of the demonstration (part 8, item 7), newest first. */
  recent: EventRow[];
}

/** A demonstration signal: evidence known and entirely simulated. Only these reach the home page. */
export function isDemonstrationSignal(s: Pick<SignalRow, 'evidence'>): boolean {
  const origins = s.evidence?.origins ?? [];
  return origins.length > 0 && origins.every((o) => o === 'simulated');
}

/** Most serious first: the lower the index in LEVEL_ORDER, the more serious. */
export function moreSerious(a: ActiveLevel, b: ActiveLevel): ActiveLevel {
  return LEVEL_ORDER.indexOf(a) <= LEVEL_ORDER.indexOf(b) ? a : b;
}

export function combineByGovernorate(perMolecule: { level: ActiveLevel; governorates: string[] }[]): Record<string, ActiveLevel> {
  const out: Record<string, ActiveLevel> = {};
  for (const { level, governorates } of perMolecule) {
    for (const code of governorates) out[code] = out[code] ? moreSerious(out[code], level) : level;
  }
  return out;
}

export async function loadNationalPicture(): Promise<NationalPicture | null> {
  try {
    const client = await demoClient(VIEW_ROLES.coordination);
    const [all, events] = await Promise.all([listSignals(client), listEvents(client, null, 200)]);
    const signals = sortSignals(all).filter(isDemonstrationSignal);
    // The feed keeps the same frame: changes of demonstration medicines, on simulated data only.
    const recent = demonstrationChanges(events, new Set(all.filter(isDemonstrationSignal).map((s) => s.molecule_id)));
    const perMolecule = await Promise.all(
      signals.map(async (s) => ({
        level: s.level as ActiveLevel,
        governorates: (await governorateCounts(client, s.molecule_id)).map((c) => c.governorate_code),
      })),
    );
    const counts = Object.fromEntries(LEVEL_ORDER.map((l) => [l, signals.filter((s) => s.level === l).length])) as Record<ActiveLevel, number>;
    const origins = [...new Set(signals.flatMap((s) => s.evidence.origins ?? []))];
    return { signals, byGovernorate: combineByGovernorate(perMolecule), counts, origins, recent };
  } catch (error) {
    console.error('home: national picture unavailable', error instanceof Error ? error.message : error);
    return null;
  }
}
