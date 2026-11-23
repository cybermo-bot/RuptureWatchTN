// The fair split of a scarce stock by governorate. Pure function, no I/O.
//
// Rule (Phase 2.1 design): first the hospital reserve, then the rest goes to the governorates so
// that they end with days of cover as equal as possible: the lowest is filled first, up to the
// next lowest, and so on ("water filling"). No governorate gets more than its need for the period
// (enough to reach `periodDays` of cover). What no governorate needs stays unallocated.
// Boxes are whole: the continuous split is rounded down, then the few boxes left go one at a time
// to the governorate with the lowest cover after, among those still below their need.

import { ALLOCATION_PARAMS, type AllocationParams } from './params';

export interface GovernorateNeed {
  code: string;
  /** Estimated use, in boxes per month (`daysPerMonth` days). */
  monthlyUse: number;
  /** Current days of cover: the stock already in the governorate, in days of use. */
  coverDays: number;
}

export interface GovernorateSplit {
  code: string;
  boxes: number;
  /** Boxes needed to reach `periodDays` of cover. */
  need: number;
  coverBefore: number | null;
  coverAfter: number | null;
}

export interface Split {
  stock: number;
  reserve: number;
  allocated: number;
  /** Stock left after every governorate has reached its need. */
  unallocated: number;
  rows: GovernorateSplit[];
  params: AllocationParams;
}

const finiteNonNegative = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** The rules every split shares: whole boxes, the hospital reserve first, the rest to share. */
export function stockAndReserve(stockInput: number, params: AllocationParams) {
  const stock = Math.floor(finiteNonNegative(stockInput));
  const share = Math.min(1, Math.max(0, params.hospitalReserveShare));
  const reserve = Math.floor(stock * share);
  return { stock, reserve, rest: stock - reserve };
}

/** Daily use, current cover and need (the cap: boxes to reach `periodDays` of cover) per governorate. */
export function governorateNeeds(needs: readonly GovernorateNeed[], params: AllocationParams) {
  return needs.map((g) => {
    const daily = finiteNonNegative(g.monthlyUse) / params.daysPerMonth;
    const cover = Math.max(0, Number.isFinite(g.coverDays) ? g.coverDays : 0);
    const need = daily > 0 ? Math.max(0, Math.ceil((params.periodDays - cover) * daily - 1e-9)) : 0;
    return { code: g.code, daily, cover, need };
  });
}

/** The rows of a split from the boxes given to each governorate. */
export function splitRows(govs: ReturnType<typeof governorateNeeds>, boxes: number[]): GovernorateSplit[] {
  return govs.map((g, i) => ({
    code: g.code,
    boxes: boxes[i],
    need: g.need,
    coverBefore: g.daily > 0 ? g.cover : null,
    coverAfter: g.daily > 0 ? g.cover + boxes[i] / g.daily : null,
  }));
}

/** The lowest days of cover after the split, among governorates with a use; null if none. */
export function minCoverAfter(split: Split): number | null {
  const values = split.rows.map((r) => r.coverAfter).filter((v): v is number => v !== null);
  return values.length ? Math.min(...values) : null;
}

/** The lowest days of cover before the split, among governorates with a use; null if none. */
export function minCoverBefore(split: Split): number | null {
  const values = split.rows.map((r) => r.coverBefore).filter((v): v is number => v !== null);
  return values.length ? Math.min(...values) : null;
}

export function fairSplit(stockInput: number, needs: readonly GovernorateNeed[], params: AllocationParams = ALLOCATION_PARAMS): Split {
  const { stock, reserve, rest } = stockAndReserve(stockInput, params);
  const govs = governorateNeeds(needs, params);

  const totalNeed = govs.reduce((n, g) => n + g.need, 0);
  const toGive = Math.min(rest, totalNeed);

  // Continuous water level L: each governorate gets min(need, max(0, (L - cover) * daily)).
  const give = (level: number) => govs.map((g) => (g.daily > 0 ? Math.min(g.need, Math.max(0, (level - g.cover) * g.daily)) : 0));
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  let boxes: number[];
  if (toGive >= totalNeed) {
    boxes = govs.map((g) => g.need);
  } else {
    let lo = 0;
    let hi = params.periodDays + 1;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      if (sum(give(mid)) > toGive) hi = mid;
      else lo = mid;
    }
    boxes = give(lo).map((b) => Math.floor(b + 1e-9));
    // Hand out the few whole boxes left, lowest cover after first; ties by governorate code.
    let left = toGive - sum(boxes);
    while (left > 0) {
      let best = -1;
      for (let i = 0; i < govs.length; i++) {
        if (govs[i].daily <= 0 || boxes[i] >= govs[i].need) continue;
        if (best < 0) {
          best = i;
          continue;
        }
        const a = govs[i].cover + boxes[i] / govs[i].daily;
        const b = govs[best].cover + boxes[best] / govs[best].daily;
        if (a < b - 1e-9 || (Math.abs(a - b) <= 1e-9 && govs[i].code < govs[best].code)) best = i;
      }
      if (best < 0) break;
      boxes[best] += 1;
      left -= 1;
    }
  }

  const rows = splitRows(govs, boxes);
  const allocated = sum(boxes);
  return { stock, reserve, allocated, unallocated: rest - allocated, rows, params };
}
