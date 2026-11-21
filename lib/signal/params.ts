// Thresholds of the warning logic.
// These are design parameters (from the Phase 2.1 blueprint, or proposed starting values),
// not findings. They are meant to be calibrated in a pilot. Show them on the methods page.

export interface SignalParams {
  /** An order counts as "not delivered" only after this many hours. */
  minUndeliveredHours: number;
  /** Window for "confirmed" and for counting distinct pharmacies, in days. */
  confirmWindowDays: number;
  /** Window for "likely", in days. */
  likelyWindowDays: number;
  /** Distinct pharmacies in the likely window needed for "likely". */
  likelyMinPharmacies: number;
  /** Distinct pharmacies in the confirm window needed for "confirmed". */
  confirmMinPharmacies: number;
  /** Distinct governorates needed for "confirmed" (gate two). */
  confirmMinGovernorates: number;
  /** A foreign notice older than this no longer counts, in days. */
  noticeActiveDays: number;
  /** Days without any new not_delivered report before a likely or confirmed level may clear. */
  quietDays: number;
  /** Distinct pharmacies reporting delivered_again needed to clear. */
  clearMinDeliveredPharmacies: number;
  /** Without delivered_again reports, a likely or confirmed level is lowered after this many quiet days. */
  staleDays: number;
  /** How long "cleared" stays visible before returning to "none", in days. */
  clearedDisplayDays: number;
}

export const DEFAULT_PARAMS: SignalParams = {
  minUndeliveredHours: 72,
  confirmWindowDays: 14,
  likelyWindowDays: 7,
  likelyMinPharmacies: 2,
  confirmMinPharmacies: 4,
  confirmMinGovernorates: 2,
  noticeActiveDays: 90,
  quietDays: 14,
  clearMinDeliveredPharmacies: 2,
  staleDays: 30,
  clearedDisplayDays: 7,
};
