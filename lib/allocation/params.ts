// Parameters of the fair split. Design parameters proposed for a pilot, not findings:
// shown on screen as parameters, to be set with the wholesalers and the coordination unit.

export interface AllocationParams {
  /** Share of the available stock kept first for hospital pharmacies (0 to 1). */
  hospitalReserveShare: number;
  /** The period the split covers, in days: no governorate gets more than its need for it. */
  periodDays: number;
  /** Days in the "monthly use" figures. */
  daysPerMonth: number;
}

export const ALLOCATION_PARAMS: AllocationParams = {
  hospitalReserveShare: 0.1,
  periodDays: 30,
  daysPerMonth: 30,
};
