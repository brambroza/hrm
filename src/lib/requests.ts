/**
 * @file Rules shared by leave and overtime requests.
 * Pure functions: no database, no React.
 */
import { isClockTime, isIsoDate } from './thaiTime';

/** Statuses that no longer occupy the dates they were filed for. */
const INACTIVE_STATUSES = ['rejected', 'cancelled'];

/** Message keys returned by the validators; the page translates them. */
export type RequestError =
  | 'requests.invalidDate'
  | 'requests.endBeforeStart'
  | 'requests.halfDaySingleDay'
  | 'requests.overlap'
  | 'requests.invalidTime'
  | 'requests.zeroDuration'
  | 'requests.reasonRequired';

export interface DateSpan {
  start_date: string;
  end_date: string;
  status?: string | null;
}

export interface LeaveDraft {
  start_date: string;
  end_date: string;
  is_half_day?: boolean;
}

/**
 * Minutes between two clock times, treating an end at or before the start as
 * the following day. 22:00 to 02:00 is 240 minutes, not 0.
 * @param start - Start time, `HH:mm`.
 * @param end - End time, `HH:mm`.
 * @returns Minutes, or 0 when either time is malformed or they are equal.
 */
export const clockMinutesBetween = (start: unknown, end: unknown): number => {
  if (!isClockTime(start) || !isClockTime(end)) return 0;
  const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  const from = toMinutes(start);
  const to = toMinutes(end);
  if (to === from) return 0;
  return to > from ? to - from : to + 24 * 60 - from;
};

/**
 * Whether a date range collides with an existing request that is still live.
 * @param existing - The employee's other requests.
 * @param startDate - First day requested.
 * @param endDate - Last day requested.
 * @returns True when any pending or approved request shares a day with the range.
 */
export const overlapsExisting = (existing: DateSpan[], startDate: string, endDate: string): boolean =>
  existing.some(
    (item) =>
      !INACTIVE_STATUSES.includes(String(item.status ?? '').toLowerCase()) &&
      item.start_date <= endDate &&
      item.end_date >= startDate,
  );

/**
 * Check a leave request before it is sent.
 * @param draft - Dates and half-day flag as entered.
 * @param existing - The same employee's other leave requests.
 * @returns A message key for the first problem, or null when the request is acceptable.
 */
export const validateLeaveRequest = (draft: LeaveDraft, existing: DateSpan[] = []): RequestError | null => {
  if (!isIsoDate(draft.start_date) || !isIsoDate(draft.end_date)) return 'requests.invalidDate';
  if (draft.end_date < draft.start_date) return 'requests.endBeforeStart';
  if (draft.is_half_day && draft.start_date !== draft.end_date) return 'requests.halfDaySingleDay';
  if (overlapsExisting(existing, draft.start_date, draft.end_date)) return 'requests.overlap';
  return null;
};

/**
 * Check an overtime request before it is sent.
 * @param draft - Date and times as entered.
 * @returns A message key for the first problem, or null when the request is acceptable.
 */
export const validateOtRequest = (draft: {
  request_date: string;
  start_time: string;
  end_time: string;
}): RequestError | null => {
  if (!isIsoDate(draft.request_date)) return 'requests.invalidDate';
  if (!isClockTime(draft.start_time) || !isClockTime(draft.end_time)) return 'requests.invalidTime';
  if (clockMinutesBetween(draft.start_time, draft.end_time) === 0) return 'requests.zeroDuration';
  return null;
};

/**
 * Whether the current user may approve or reject a request.
 * Nobody decides their own request, whatever their permissions.
 * @param input.canEdit - The user holds the module's edit permission.
 * @param input.status - Current status of the request.
 * @param input.requestEmployeeId - Employee the request belongs to.
 * @param input.deciderEmployeeId - Employee record of the current user, if any.
 * @returns True when the decision buttons should be offered.
 */
export const canDecideRequest = (input: {
  canEdit: boolean;
  status?: string | null;
  requestEmployeeId?: string | null;
  deciderEmployeeId?: string | null;
}): boolean => {
  if (!input.canEdit) return false;
  if (String(input.status ?? 'pending').toLowerCase() !== 'pending') return false;
  if (input.deciderEmployeeId && input.requestEmployeeId === input.deciderEmployeeId) return false;
  return true;
};

/**
 * Check the note given with a rejection.
 * @param note - Reason typed by the approver.
 * @returns A message key when the reason is missing, otherwise null.
 */
export const validateRejection = (note: unknown): RequestError | null =>
  typeof note === 'string' && note.trim().length >= 3 ? null : 'requests.reasonRequired';
