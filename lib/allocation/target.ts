// "Stock nécessaire pour viser N jours": the smallest total stock with which the fair split
// gives every governorate with a use at least N days of cover. A simulated target chosen by the
// operator, never a recommendation. Pure function, no I/O.

import { ALLOCATION_PARAMS, type AllocationParams } from './params';
import { fairSplit, governorateNeeds, minCoverAfter, type GovernorateNeed } from './split';

export type TargetResult =
  | { status: 'ok'; stock: number; reserve: number; distributable: number }
  /** Every governorate already has the target before any box. */
  | { status: 'reached' }
  /** Above the period: the split never gives more than the need for the period. */
  | { status: 'beyond_horizon'; periodDays: number }
  | { status: 'invalid' };

const EPS = 1e-9;

export function stockForTarget(
  targetDays: number,
  needs: readonly GovernorateNeed[],
  params: AllocationParams = ALLOCATION_PARAMS,
): TargetResult {
  if (!Number.isFinite(targetDays) || targetDays <= 0) return { status: 'invalid' };
  if (targetDays > params.periodDays) return { status: 'beyond_horizon', periodDays: params.periodDays };
  const govs = governorateNeeds(needs, params).filter((g) => g.daily > 0);
  if (govs.length === 0) return { status: 'invalid' };
  const reaches = (stock: number) => (minCoverAfter(fairSplit(stock, needs, params)) ?? 0) >= targetDays - EPS;
  if (reaches(0)) return { status: 'reached' };

  // An upper bound: every box the target asks for, plus the reserve on top, plus rounding.
  const wanted = govs.reduce((n, g) => n + Math.max(0, Math.ceil((targetDays - g.cover) * g.daily - EPS)), 0);
  const share = Math.min(1, Math.max(0, params.hospitalReserveShare));
  if (share >= 1) return { status: 'invalid' };
  let hi = Math.ceil(wanted / (1 - share)) + govs.length + 2;
  while (!reaches(hi)) hi *= 2;
  let lo = 0;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (reaches(mid)) hi = mid;
    else lo = mid;
  }
  const split = fairSplit(hi, needs, params);
  return { status: 'ok', stock: hi, reserve: split.reserve, distributable: split.allocated };
}
