// Rate limits on the writes that a person can repeat: reports (web; the WhatsApp webhook has its
// own, per sender) and joining the test as a pharmacy. Counted in the database, so they hold
// across server instances; no address or device is stored for them.

/** Reports one pharmacy can file in ten minutes, on the web. A busy counter stays far below. */
export const REPORTS_PER_10_MIN = 30;
/** New tester pharmacies per hour, for the whole site: a leaked invitation link cannot flood it. */
export const TESTERS_PER_HOUR = 20;

export const TEN_MINUTES_MS = 10 * 60_000;
export const HOUR_MS = 60 * 60_000;
