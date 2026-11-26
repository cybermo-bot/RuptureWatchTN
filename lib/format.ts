// Dates as a Tunisian pharmacist reads them: French, Tunis time.

const TIME_ZONE = 'Africa/Tunis';

const dateFormat = new Intl.DateTimeFormat('fr', { dateStyle: 'long', timeZone: TIME_ZONE });
const timeFormat = new Intl.DateTimeFormat('fr', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });

const toDate = (d: Date | string) => (typeof d === 'string' ? new Date(d) : d);

/** "22 novembre 2026" */
export function formatDate(d: Date | string): string {
  // French writes the first of the month "1er".
  return dateFormat.format(toDate(d)).replace(/^1 /, '1er ');
}

const weekdayFormat = new Intl.DateTimeFormat('fr', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TIME_ZONE });

/** "jeudi 26 novembre", in Tunis time. */
export function formatWeekday(d: Date | string): string {
  return weekdayFormat.format(toDate(d)).replace(/ 1 /, ' 1er ');
}

/** "09:30" */
export function formatTime(d: Date | string): string {
  return timeFormat.format(toDate(d));
}

const dayMonthFormat = new Intl.DateTimeFormat('fr', { day: 'numeric', month: 'short', timeZone: TIME_ZONE });

/** "9 nov." */
export function formatDayMonth(d: Date | string): string {
  return dayMonthFormat.format(toDate(d)).replace(/^1 /, '1er ');
}
