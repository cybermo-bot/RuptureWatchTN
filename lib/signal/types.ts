// Types for the warning logic. Pure data, no I/O.

export type Level = 'none' | 'watch' | 'likely' | 'confirmed' | 'cleared';

/** Where a row of data comes from. Shown as a badge wherever the row is displayed. */
export type Origin = 'official_source' | 'tester' | 'simulated';

export interface PharmacyReport {
  id: string;
  pharmacyId: string;
  governorateCode: string;
  moleculeId: string;
  /** "not_delivered": an order stayed unfilled. "delivered_again": the medicine arrived again. */
  kind: 'not_delivered' | 'delivered_again';
  /** When the order was placed. Required for not_delivered; ignored for delivered_again. */
  orderedAt: Date | null;
  reportedAt: Date;
  origin: Origin;
}

export interface ForeignNotice {
  id: string;
  moleculeId: string;
  /** Regulator, e.g. "ANSM" or "BfArM". */
  source: string;
  status: 'shortage' | 'tension' | 'resolved';
  publishedAt: Date;
  url: string;
  origin: Origin;
}

export interface PreviousState {
  level: Level;
  since: Date;
}

export type RuleId =
  | 'no_evidence'
  | 'foreign_notice_only' // gate one: foreign evidence alone stops at watch
  | 'local_reports_below_threshold'
  | 'two_pharmacies_7d'
  | 'local_report_plus_foreign_notice'
  | 'single_governorate_cap' // gate two: one governorate cannot confirm alone
  | 'confirmed_threshold'
  | 'hold_until_delivered'
  | 'quiet_period_downgrade'
  | 'delivered_again_cleared'
  | 'cleared_expired';

export interface Evidence {
  /** Distinct pharmacies with a valid not_delivered report in the confirm window. */
  pharmacies14d: number;
  /** Distinct governorates among those pharmacies. */
  governorates14d: number;
  /** Distinct pharmacies with a valid not_delivered report in the likely window. */
  pharmacies7d: number;
  /** Foreign notices currently active for this molecule (latest per source, not resolved, recent). */
  activeNotices: ForeignNotice[];
  /** Distinct pharmacies reporting delivered_again after the last valid not_delivered report. */
  deliveredAgainPharmacies: number;
  lastNotDeliveredAt: Date | null;
  /** not_delivered reports ignored because the order was younger than the minimum delay. */
  ignoredTooEarly: number;
}

export interface Evaluation {
  moleculeId: string;
  level: Level;
  rule: RuleId;
  evidence: Evidence;
  /** True when level differs from the previous state. */
  changed: boolean;
  direction: 'up' | 'down' | 'same';
  /** True when an active warning (watch, likely, confirmed) ends: a stand-down message must be sent. */
  standDown: boolean;
  /** Start of the current level. */
  since: Date;
}
