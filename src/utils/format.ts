/**
 * Display formatting helpers (pure). Numbers and dates are formatted here so
 * screens never re-implement grouping or date strings. No Intl dependency — the
 * grouping is a manual regex so output is identical across Hermes builds.
 */

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Round to a whole number and group thousands with commas: 22400 → "22,400". */
export function groupThousands(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  return sign + Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "Thursday, Jun 4" — the Home hero date. */
export function formatLongDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/** "Tue, Jun 2" — compact date for list rows. */
export function formatShortDate(date: Date): string {
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/** "Jan 2026" — for "since" lines. */
export function formatMonthYear(date: Date): string {
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/** Compact large numbers: 2_100_000 → "2.1M", 96_000 → "96k", 142 → "142". */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  return groupThousands(value);
}
