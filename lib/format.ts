// Dates as a Tunisian pharmacist reads them: French, Tunis time.

const TIME_ZONE = 'Africa/Tunis';

const dateFormat = new Intl.DateTimeFormat('fr', { dateStyle: 'long', timeZone: TIME_ZONE });
const timeFormat = new Intl.DateTimeFormat('fr', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });

const toDate = (d: Date | string) => (typeof d === 'string' ? new Date(d) : d);

/** "22 novembre 2026" */
export function formatDate(d: Date | string): string {
  return dateFormat.format(toDate(d));
}

/** "09:30" */
export function formatTime(d: Date | string): string {
  return timeFormat.format(toDate(d));
}
