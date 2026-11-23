// The reference model the fair split is compared with: the stock shared in proportion to each
// governorate's estimated monthly use. Pure function, no I/O.
//
// It is a reference for comparison, not a claim about how any wholesaler works today. It follows
// the same rules as fairSplit(): the hospital reserve first, no governorate above its need for the
// period (the cap), what no governorate needs stays unallocated. A governorate whose proportional
// share would pass its need gets its need, and the surplus goes back to the others, in proportion
// again, until no share passes a need.
// Whole boxes: each share is rounded down, then the boxes left go one at a time to the largest
// remainders; equal remainders go by governorate code, so the result never depends on order.

import { ALLOCATION_PARAMS, type AllocationParams } from './params';
import { governorateNeeds, splitRows, stockAndReserve, type GovernorateNeed, type Split } from './split';

const EPS = 1e-9;

export function proportionalSplit(
  stockInput: number,
  needs: readonly GovernorateNeed[],
  params: AllocationParams = ALLOCATION_PARAMS,
): Split {
  const { stock, reserve, rest } = stockAndReserve(stockInput, params);
  const govs = governorateNeeds(needs, params);
  const totalNeed = govs.reduce((n, g) => n + g.need, 0);
  let remaining = Math.min(rest, totalNeed);

  const boxes = govs.map(() => 0);
  let eligible = govs.map((g, i) => i).filter((i) => govs[i].daily > 0 && govs[i].need > 0);

  // Cap the governorates whose share reaches their need, and share their surplus again.
  for (;;) {
    const weight = eligible.reduce((w, i) => w + govs[i].daily, 0);
    if (weight <= 0 || remaining <= 0) break;
    const capped = eligible.filter((i) => (remaining * govs[i].daily) / weight >= govs[i].need - EPS);
    if (capped.length === 0) break;
    for (const i of capped) {
      boxes[i] = govs[i].need;
      remaining -= govs[i].need;
    }
    eligible = eligible.filter((i) => !capped.includes(i));
  }

  // The rest, in proportion, rounded down; then the largest remainders, ties by code.
  const weight = eligible.reduce((w, i) => w + govs[i].daily, 0);
  if (weight > 0 && remaining > 0) {
    const exact = eligible.map((i) => ({ i, share: (remaining * govs[i].daily) / weight }));
    for (const e of exact) boxes[e.i] = Math.floor(e.share + EPS);
    let left = remaining - exact.reduce((n, e) => n + boxes[e.i], 0);
    const order = exact
      .map((e) => ({ i: e.i, remainder: e.share - boxes[e.i] }))
      .sort((a, b) => (Math.abs(b.remainder - a.remainder) > EPS ? b.remainder - a.remainder : govs[a.i].code.localeCompare(govs[b.i].code)));
    for (const o of order) {
      if (left <= 0) break;
      if (boxes[o.i] >= govs[o.i].need) continue;
      boxes[o.i] += 1;
      left -= 1;
    }
  }

  const allocated = boxes.reduce((a, b) => a + b, 0);
  return { stock, reserve, allocated, unallocated: rest - allocated, rows: splitRows(govs, boxes), params };
}
