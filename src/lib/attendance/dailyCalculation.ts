/**
 * @file Daily attendance calculation: one employee, one work date.
 *
 * Moved out of AttendanceCalculationPage so it can be tested. The rules are the
 * ones the page already applied; Phase 0 only fixes the date handling around
 * them. Weekly days off, early leave, half-day leave and holiday work are not
 * handled yet and belong to the Phase 1 calculation engine.
 */
import { BANGKOK_OFFSET, addDays, formatBangkokTime, minutesBetween } from '../thaiTime';

export interface Shift {
  id: string;
  shift_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  break_minutes?: number | null;
  cross_day_shift?: boolean | null;
  scan_policy?: string | null;
}

export interface ShiftAssignment {
  employee_id: string;
  shift_id: string;
  start_date: string;
  end_date?: string | null;
}

export interface AttendanceLog {
  check_in?: string | null;
  check_out?: string | null;
  check_in_morning?: string | null;
  check_out_morning?: string | null;
  check_in_afternoon?: string | null;
  check_out_afternoon?: string | null;
  ot_in?: string | null;
  ot_out?: string | null;
  missing_punch?: boolean | null;
}

export interface AttendancePolicy {
  late_grace_minutes: number;
  absent_by_late_minutes: number;
  ot_method?: string | null;
}

export interface Leave {
  employee_id: string;
  start_date: string;
  end_date: string;
  status: string;
  reason?: string | null;
}

export interface OtRequest {
  employee_id: string;
  request_date: string;
  minutes?: number | null;
}

export type DailyStatus =
  | 'normal'
  | 'late'
  | 'absent'
  | 'absent_by_late'
  | 'missing_punch'
  | 'leave'
  | 'holiday'
  | 'day_off';

export interface DailyResult {
  checkIn: string;
  checkOut: string;
  workHours: string;
  lateMinutes: number;
  otMinutes: number;
  status: DailyStatus;
  note: string;
}

export interface DailyInput {
  log?: AttendanceLog | null;
  date: string;
  shift?: Shift | null;
  policy: AttendancePolicy;
  holiday: boolean;
  /** True when the date is a weekly day off for this employee. */
  weeklyOff?: boolean;
  leave?: Leave | null;
  otRequest?: OtRequest | null;
}

/** Policy used when an organization has not saved one. */
export const DEFAULT_POLICY: AttendancePolicy = {
  late_grace_minutes: 5,
  absent_by_late_minutes: 30,
};

/**
 * The shift an employee is assigned to on a date.
 * @param employeeId - Employee row id.
 * @param date - Work date, `YYYY-MM-DD`.
 * @param assignmentMap - Assignments grouped by employee id.
 * @param shiftMap - Shifts by id.
 * @returns The shift, or null when the employee has no assignment covering the date.
 */
export const getShiftByEmployee = (
  employeeId: string,
  date: string,
  assignmentMap: Map<string, ShiftAssignment[]>,
  shiftMap: Map<string, Shift>,
): Shift | null => {
  const assignments = assignmentMap.get(employeeId) || [];
  const match = assignments.find((assignment) => {
    const end = assignment.end_date || '9999-12-31';
    return date >= assignment.start_date && date <= end;
  });
  return (match && shiftMap.get(match.shift_id)) || null;
};

/**
 * The approved leave covering a date, if any.
 * @param leaves - Leave rows for the period.
 * @param employeeId - Employee row id.
 * @param date - Work date, `YYYY-MM-DD`.
 * @returns The matching leave, or undefined.
 */
export const findLeave = (leaves: Leave[], employeeId: string, date: string): Leave | undefined =>
  leaves.find(
    (leave) =>
      leave.employee_id === employeeId &&
      leave.status === 'approved' &&
      date >= leave.start_date &&
      date <= leave.end_date,
  );

/**
 * The approved OT request for a date, if any.
 * @param requests - Approved OT requests for the period.
 * @param employeeId - Employee row id.
 * @param date - Work date, `YYYY-MM-DD`.
 * @returns The matching request, or undefined.
 */
export const findOtRequest = (requests: OtRequest[], employeeId: string, date: string): OtRequest | undefined =>
  requests.find((request) => request.employee_id === employeeId && request.request_date === date);

/**
 * The moment a shift boundary falls on, in Thai time.
 * @param date - Work date the shift starts on, `YYYY-MM-DD`.
 * @param time - Boundary time, `HH:mm` or `HH:mm:ss`.
 * @param nextDay - True when the boundary falls on the day after the work date.
 * @returns The boundary as a Date.
 */
export const buildShiftDateTime = (date: string, time?: string | null, nextDay = false): Date => {
  const day = nextDay ? addDays(date, 1) : date;
  return new Date(`${day}T${time || '00:00:00'}${BANGKOK_OFFSET}`);
};

/**
 * Whether a shift ends on the day after it starts.
 * Derived from the times as well as the stored flag, so a 22:00 to 06:00 shift
 * is treated as overnight even when nobody ticked the checkbox.
 * @param shift - The shift to inspect.
 * @returns True for overnight shifts.
 */
export const isOvernightShift = (shift: Shift): boolean => {
  if (shift.cross_day_shift) return true;
  if (!shift.start_time || !shift.end_time) return false;
  return shift.end_time < shift.start_time;
};

/**
 * Work out one employee's attendance result for one work date.
 *
 * Order of precedence: approved leave, holiday, no scan, then the scans.
 * A weekly day off with no scan is a day off, not an absence; with scans it
 * is worked out like any other day so the hours are not lost.
 *
 * @param input - Log, shift, policy and day context.
 * @returns Display times, hours, late and OT minutes, and a status.
 */
export const calculateDaily = ({ log, date, shift, policy, holiday, weeklyOff, leave, otRequest }: DailyInput): DailyResult => {
  const shown = (value?: string | null) => (value ? formatBangkokTime(value) : '-');
  const checkIn = shown(log?.check_in);
  const checkOut = shown(log?.check_out);

  const base: DailyResult = {
    checkIn,
    checkOut,
    workHours: '-',
    lateMinutes: 0,
    otMinutes: 0,
    status: 'absent',
    note: '',
  };

  if (leave) return { ...base, status: 'leave', note: leave.reason || '' };
  if (holiday) return { ...base, status: 'holiday' };
  if (!log) return weeklyOff ? { ...base, status: 'day_off' } : { ...base, note: 'no_scan' };

  const splitScans = shift?.scan_policy === '4' || shift?.scan_policy === '6';
  const firstIn = splitScans ? log.check_in_morning : log.check_in;
  const lastOut = splitScans ? log.check_out_afternoon : log.check_out;
  const missingPunch = Boolean(log.missing_punch) || Boolean(firstIn) !== Boolean(lastOut);

  let { workHours, lateMinutes, otMinutes, status } = base;
  if (missingPunch) status = 'missing_punch';

  if (splitScans) {
    const total =
      minutesBetween(log.check_in_morning, log.check_out_morning) +
      minutesBetween(log.check_in_afternoon, log.check_out_afternoon);
    workHours = total ? (total / 60).toFixed(2) : '-';
  } else if (log.check_in && log.check_out) {
    const worked = Math.max(0, minutesBetween(log.check_in, log.check_out) - (shift?.break_minutes || 0));
    workHours = (worked / 60).toFixed(2);
  }

  if (shift && firstIn) {
    const start = buildShiftDateTime(date, shift.start_time);
    const lateDiff = Math.round((new Date(firstIn).getTime() - start.getTime()) / 60000);
    if (lateDiff > policy.late_grace_minutes) {
      lateMinutes = lateDiff;
      if (lateDiff >= policy.absent_by_late_minutes) {
        status = 'absent_by_late';
      } else if (!missingPunch) {
        status = 'late';
      }
    } else if (!missingPunch) {
      status = 'normal';
    }
  }

  if (policy.ot_method === 'request') {
    if (otRequest) otMinutes = Number(otRequest.minutes || 0);
  } else if (shift && (log.check_out || log.ot_out)) {
    const end = buildShiftDateTime(date, shift.end_time, isOvernightShift(shift));
    const lastPunch = new Date((log.ot_out || log.check_out) as string);
    const otDiff = Math.round((lastPunch.getTime() - end.getTime()) / 60000);
    if (otDiff > 0) otMinutes = otDiff;
  }

  if (shift?.scan_policy === '4') {
    return {
      checkIn: `${shown(log.check_in_morning)} / ${shown(log.check_in_afternoon)}`,
      checkOut: `${shown(log.check_out_morning)} / ${shown(log.check_out_afternoon)}`,
      workHours,
      lateMinutes,
      otMinutes,
      status,
      note: '',
    };
  }

  if (shift?.scan_policy === '6') {
    return {
      checkIn: `${shown(log.check_in_morning)} / ${shown(log.check_in_afternoon)} / ${shown(log.ot_in)}`,
      checkOut: `${shown(log.check_out_morning)} / ${shown(log.check_out_afternoon)} / ${shown(log.ot_out)}`,
      workHours,
      lateMinutes,
      otMinutes,
      status,
      note: '',
    };
  }

  return { checkIn, checkOut, workHours, lateMinutes, otMinutes, status, note: '' };
};
