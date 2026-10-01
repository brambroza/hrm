/**
 * @file Date and time helpers for Thailand (UTC+07:00, no daylight saving).
 *
 * Kept free of any Supabase or React import so the rules can be unit tested
 * and reused by the calculation code without a browser or a database.
 */

/** Thailand's fixed UTC offset. Every timestamp the app writes carries it. */
export const BANGKOK_OFFSET = '+07:00';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Whether a string is a real calendar date in `YYYY-MM-DD` form.
 * @param value - Candidate date string.
 * @returns True for dates such as `2026-02-28`, false for `2026-02-30` or other shapes.
 */
export const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
};

/**
 * Whether a string is a 24-hour clock time in `HH:mm` form.
 * @param value - Candidate time string.
 * @returns True for `00:00` to `23:59`.
 */
export const isClockTime = (value: unknown): value is string =>
  typeof value === 'string' && CLOCK_TIME.test(value);

/**
 * Move a calendar date by a number of days.
 *
 * Works on the calendar date alone. Going through a local `Date` and
 * `toISOString()` shifts the result by a day for any zone east of UTC.
 *
 * @param date - Date in `YYYY-MM-DD` form.
 * @param days - Days to add; negative moves backwards.
 * @returns The resulting date in `YYYY-MM-DD` form.
 * @throws {RangeError} When `date` is not a valid calendar date.
 */
export const addDays = (date: string, days: number): string => {
  if (!isIsoDate(date)) throw new RangeError(`Invalid date: ${date}`);
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

/**
 * Every calendar date from `from` to `to`, both included.
 * @param from - First date, `YYYY-MM-DD`.
 * @param to - Last date, `YYYY-MM-DD`.
 * @returns Dates in ascending order; empty when `to` is before `from`.
 * @throws {RangeError} When either bound is not a valid calendar date.
 */
export const buildDateRange = (from: string, to: string): string[] => {
  if (!isIsoDate(from)) throw new RangeError(`Invalid start date: ${from}`);
  if (!isIsoDate(to)) throw new RangeError(`Invalid end date: ${to}`);

  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
};

/**
 * Build a timestamp for a wall-clock time in Thailand.
 *
 * The offset is always written. A timestamp without one is read by PostgreSQL
 * in the session time zone, which is UTC on Supabase, so 08:00 was stored as
 * 15:00 Thai time.
 *
 * @param date - Date in `YYYY-MM-DD` form.
 * @param time - Time in `HH:mm` form.
 * @returns ISO 8601 timestamp such as `2026-09-28T08:00:00+07:00`.
 * @throws {RangeError} When the date or the time is malformed.
 */
export const toBangkokTimestamp = (date: string, time: string): string => {
  if (!isIsoDate(date)) throw new RangeError(`Invalid date: ${date}`);
  if (!isClockTime(time)) throw new RangeError(`Invalid time: ${time}`);
  return `${date}T${time}:00${BANGKOK_OFFSET}`;
};

/**
 * Timestamp for a punch that belongs to a shift starting on `workDate`.
 *
 * A punch whose clock time is earlier than the shift's first punch happened
 * after midnight, so it is dated the following day. Without this an overnight
 * shift (22:00 to 06:00) produced a negative duration.
 *
 * @param workDate - The date the shift started, `YYYY-MM-DD`.
 * @param time - Clock time of this punch, `HH:mm`.
 * @param firstPunchTime - Clock time of the first punch of the shift, `HH:mm`.
 * @returns ISO 8601 timestamp with the Thai offset.
 */
export const toShiftPunchTimestamp = (workDate: string, time: string, firstPunchTime: string): string => {
  if (!isClockTime(firstPunchTime)) throw new RangeError(`Invalid time: ${firstPunchTime}`);
  const crossesMidnight = isClockTime(time) && time < firstPunchTime;
  return toBangkokTimestamp(crossesMidnight ? addDays(workDate, 1) : workDate, time);
};

/**
 * Whole minutes between two timestamps.
 * @param start - Earlier timestamp.
 * @param end - Later timestamp.
 * @returns Minutes from start to end, never negative; 0 when either is missing or unreadable.
 */
export const minutesBetween = (start?: string | null, end?: string | null): number => {
  if (!start || !end) return 0;
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return Number.isFinite(diff) ? Math.max(diff, 0) : 0;
};

/**
 * Hours between two timestamps, to two decimals.
 * @param start - Earlier timestamp.
 * @param end - Later timestamp.
 * @returns Hours as a number, never negative.
 */
export const hoursBetween = (start?: string | null, end?: string | null): number =>
  Math.round((minutesBetween(start, end) / 60) * 100) / 100;

/**
 * Clock time of a timestamp as read on a wall clock in Thailand.
 * @param value - Timestamp to format.
 * @param options - Parts to show; by default hours, minutes and seconds.
 * @returns `HH:mm:ss` (or the parts asked for), or an empty string when the value is missing or invalid.
 */
export const formatBangkokTime = (value?: string | null, options?: Intl.DateTimeFormatOptions): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour12: false,
    ...(options || { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }).format(date);
};
