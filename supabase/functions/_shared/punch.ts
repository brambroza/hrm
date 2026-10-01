/**
 * @file Which punch comes next, and what it does to the day's attendance row.
 *
 * attendance_logs holds one row per employee per day with check_in and
 * check_out. A punch is "in" when the employee has no open day, and "out" when
 * they do. An open day from yesterday still counts, because night shifts end
 * the next morning.
 */

/**
 * Whole minutes from one timestamp to another, never negative.
 * @param start - Earlier ISO timestamp.
 * @param end - Later ISO timestamp.
 * @returns Minutes, 0 when either is missing.
 */
const minutesBetween = (start?: string | null, end?: string | null): number => {
  if (!start || !end) return 0;
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return Number.isFinite(diff) ? Math.max(diff, 0) : 0;
};

export type PunchKind = 'in' | 'out';

export interface AttendanceDay {
  id: string;
  log_date: string;
  check_in?: string | null;
  check_out?: string | null;
}

export interface PunchPlan {
  kind: PunchKind;
  /** The row to update for an "out" punch; null means insert a new day. */
  target: AttendanceDay | null;
  /** Why the plan is refused, when it is. */
  refusal?: string;
}

/** Longest time a day may stay open and still receive an "out" punch. */
export const MAX_OPEN_HOURS = 20;
/** Two punches closer than this are a double tap, not a shift. */
export const MIN_GAP_MINUTES = 1;

/**
 * Decide what the next punch does.
 *
 * @param days - The employee's recent attendance rows, any order.
 * @param now - The moment of the punch, as an ISO timestamp.
 * @param today - Today's date in Bangkok, `YYYY-MM-DD`.
 * @returns The plan, or a refusal.
 */
export const planPunch = (days: AttendanceDay[], now: string, today: string): PunchPlan => {
  const open = [...days]
    .filter((day) => day.check_in && !day.check_out)
    .sort((a, b) => (b.check_in as string).localeCompare(a.check_in as string))[0];

  if (open) {
    const minutesOpen = minutesBetween(open.check_in as string, now);
    if (minutesOpen < MIN_GAP_MINUTES) return { kind: 'out', target: open, refusal: 'เพิ่งลงเวลาเข้าไปเมื่อสักครู่' };
    if (minutesOpen > MAX_OPEN_HOURS * 60) {
      // The old day is left as a missing punch for HR; today starts fresh.
      return planPunch(days.filter((day) => day.id !== open.id), now, today);
    }
    return { kind: 'out', target: open };
  }

  const todayRow = days.find((day) => day.log_date === today);
  if (todayRow?.check_in && todayRow.check_out) {
    return { kind: 'in', target: null, refusal: 'วันนี้ลงเวลาเข้าและออกแล้ว หากต้องแก้ไขติดต่อฝ่ายบุคคล' };
  }
  return { kind: 'in', target: null };
};

/** The label of a punch kind in Thai. */
export const PUNCH_LABELS: Record<PunchKind, string> = { in: 'ลงเวลาเข้า', out: 'ลงเวลาออก' };
