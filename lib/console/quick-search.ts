// Ctrl+K in the consoles (part 8, item 10): jump to a medicine. The catalogue search
// (search_molecules, search_medicines, fuzzy) gives the molecules; each is matched with its level
// in this space. Only a medicine with a level here opens a panel; the others say so.

import type { Level } from '@/lib/signal';

export interface SpaceLevel {
  id: string;
  name: string;
  level: Level;
}

export interface QuickHit {
  id: string;
  name: string;
  /** The brand that matched, when the query found the molecule by a brand name. */
  brand: string | null;
  level: Level | null;
}

export const QUICK_LIMIT = 8;

/** Lower case, without accents: "lévétiracétam" finds "LEVETIRACETAM". */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Instant matches among the medicines with a level in this space, before the catalogue answers. */
export function localHits(levels: SpaceLevel[], q: string, limit = QUICK_LIMIT): QuickHit[] {
  const f = fold(q);
  if (f.length < 2) return [];
  return levels
    .filter((l) => fold(l.name).includes(f))
    .slice(0, limit)
    .map((l) => ({ id: l.id, name: l.name, brand: null, level: l.level }));
}

/**
 * The catalogue's answer, one row per molecule: molecules matched by name first, then those found
 * through a brand, with their level here (null when the space has none). Local matches stay first.
 */
export function mergeHits(
  local: QuickHit[],
  molecules: { id: string; name: string }[],
  medicines: { molecule_id: string; molecule_name: string; brand: string }[],
  levels: SpaceLevel[],
  limit = QUICK_LIMIT,
): QuickHit[] {
  const levelOf = new Map(levels.map((l) => [l.id, l.level]));
  const out: QuickHit[] = [...local];
  const seen = new Set(out.map((h) => h.id));
  const add = (id: string, name: string, brand: string | null) => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ id, name, brand, level: levelOf.get(id) ?? null });
  };
  for (const m of molecules) add(m.id, m.name, null);
  for (const r of medicines) add(r.molecule_id, r.molecule_name, r.brand);
  return out.slice(0, limit);
}
