// What the CNAM catalogue says about a medicine with a level: its most critical category
// (vital first) and how many brands exist. Computed from public.medicines, never typed.

import type { Level } from '@/lib/signal';
import { LEVEL_ORDER, type ActiveLevel } from '@/lib/signals/views';

export type VeiCategory = 'V' | 'E' | 'I';

export interface CatalogueFacts {
  /** The most critical CNAM category among the molecule's presentations, or null if none given. */
  category: VeiCategory | null;
  /** Distinct brands of the molecule in the CNAM list. */
  brands: number;
  /** Brands besides one: 0 means "aucune autre marque". */
  otherBrands: number;
}

const CATEGORY_RANK: Record<VeiCategory, number> = { V: 0, E: 1, I: 2 };

export function catalogueFacts(rows: { molecule_id: string; brand: string; vei_category: string | null }[]): Map<string, CatalogueFacts> {
  const brands = new Map<string, Set<string>>();
  const category = new Map<string, VeiCategory | null>();
  for (const r of rows) {
    if (!brands.has(r.molecule_id)) brands.set(r.molecule_id, new Set());
    brands.get(r.molecule_id)!.add(r.brand.trim().toUpperCase());
    const c = r.vei_category === 'V' || r.vei_category === 'E' || r.vei_category === 'I' ? r.vei_category : null;
    const prev = category.get(r.molecule_id) ?? null;
    category.set(r.molecule_id, c && (!prev || CATEGORY_RANK[c] < CATEGORY_RANK[prev]) ? c : prev);
  }
  const out = new Map<string, CatalogueFacts>();
  for (const [id, set] of brands) {
    out.set(id, { category: category.get(id) ?? null, brands: set.size, otherBrands: Math.max(0, set.size - 1) });
  }
  return out;
}

/**
 * The ministry's order: by level (confirmed first), then CNAM category (vital first, unknown
 * last), then fewer other brands first (a medicine with no other brand is the hardest to replace).
 */
export function byLevelCategoryBrands<T extends { molecule_id: string; level: Level }>(rows: T[], facts: Map<string, CatalogueFacts>): T[] {
  const rank = (r: T) => {
    const f = facts.get(r.molecule_id);
    return [LEVEL_ORDER.indexOf(r.level as ActiveLevel), f?.category ? CATEGORY_RANK[f.category] : 3, f ? f.otherBrands : Number.MAX_SAFE_INTEGER];
  };
  return [...rows].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2];
  });
}
