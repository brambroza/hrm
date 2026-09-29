/**
 * @file Guided setup: one form, every related record.
 *
 * Working hours used to live in three places that nothing kept in step: the
 * system settings, the shift definitions and the weekly days off. The setup
 * form asks once and this module works out every record that has to change.
 * It is pure: it reads the form and the current records, and returns a plan.
 */
import { isClockTime, isIsoDate } from '../thaiTime';
import { clockMinutesBetween } from '../requests';

/** Day names as stored in system_settings.working_days, Sunday first. */
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** Name of the shift the setup keeps in step with the working hours. */
export const DEFAULT_SHIFT_NAME = 'กะปกติ';

export const OT_METHODS = ['scan', 'request'] as const;
export const OT_ROUNDINGS = ['none', '15', '30', '60'] as const;
export const PAYMENT_METHODS = ['bank_transfer', 'cash', 'cheque'] as const;

export const SETUP_STEPS = ['company', 'workHours', 'policy', 'holidays', 'departments', 'payroll'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

export interface HolidayEntry {
  id?: string;
  holiday_date: string;
  name: string;
}

export interface SetupForm {
  company: { name: string; tax_id: string; address: string; phone: string; email: string };
  workHours: {
    working_days: string[];
    work_start_time: string;
    work_end_time: string;
    lunch_break_start: string;
    lunch_break_end: string;
  };
  policy: {
    late_grace_minutes: number | string;
    absent_by_late_minutes: number | string;
    ot_method: string;
    ot_rounding: string;
  };
  holidays: { year: number; entries: HolidayEntry[] };
  departments: { names: string[] };
  payroll: { payroll_date: number | string; payment_method: string; default_bank: string };
}

export interface SetupSnapshot {
  organization?: { id: string; name?: string | null; tax_id?: string | null } | null;
  settings?: {
    id: string;
    working_days?: string[] | null;
    work_start_time?: string | null;
    work_end_time?: string | null;
    payroll_date?: number | null;
  } | null;
  shifts?: { id: string; shift_name: string }[];
  weekOffs?: { id: string; weekday: number; department?: string | null; employee_group?: string | null }[];
  policy?: { id: string } | null;
  holidays?: { id: string; holiday_date: string; name: string; department?: string | null; employee_group?: string | null }[];
  departments?: { id: string; name: string }[];
}

export type StepErrors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^0\d{8,9}$/;

/**
 * Whether a 13-digit Thai tax or national ID passes its check digit.
 * Digits 1 to 12 are weighted 13 down to 2; the check digit is
 * (11 - sum mod 11) mod 10.
 * @param value - Candidate ID; spaces and dashes are ignored.
 * @returns True when the ID has 13 digits and a correct check digit.
 */
export const isValidThaiId = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const digits = value.replace(/[\s-]/g, '');
  if (!/^\d{13}$/.test(digits)) return false;
  const sum = digits
    .slice(0, 12)
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * (13 - index), 0);
  return (11 - (sum % 11)) % 10 === Number(digits[12]);
};

/**
 * Whole number inside a range.
 * @param value - Number or numeric text.
 * @param min - Smallest accepted value.
 * @param max - Largest accepted value.
 * @returns True when the value is an integer within the range.
 */
const isIntegerBetween = (value: unknown, min: number, max: number): boolean => {
  if (value === '' || value === null || value === undefined) return false;
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max;
};

/**
 * Minutes of the lunch break, 0 when none is entered.
 * @param hours - Working hours as entered.
 * @returns Break length in minutes.
 */
export const breakMinutes = (hours: SetupForm['workHours']): number =>
  clockMinutesBetween(hours.lunch_break_start, hours.lunch_break_end);

/**
 * Weekday numbers that are days off, 0 for Sunday to 6 for Saturday.
 * @param workingDays - Day names that are worked.
 * @returns Numbers of the days not worked, ascending.
 */
export const weeklyDaysOff = (workingDays: string[]): number[] =>
  WEEKDAYS.map((day, index) => (workingDays.includes(day) ? -1 : index)).filter((index) => index >= 0);

/**
 * Check one step of the form.
 * @param step - Step to check.
 * @param form - The whole form.
 * @returns Message keys by field name; empty when the step is acceptable.
 */
export const validateStep = (step: SetupStep, form: SetupForm): StepErrors => {
  const errors: StepErrors = {};

  if (step === 'company') {
    const { name, tax_id, phone, email } = form.company;
    if (!name.trim()) errors.name = 'setup.errors.required';
    else if (name.trim().length > 200) errors.name = 'setup.errors.tooLong';
    if (tax_id.trim() && !isValidThaiId(tax_id)) errors.tax_id = 'setup.errors.taxId';
    if (phone.trim() && !PHONE.test(phone.replace(/[\s-]/g, ''))) errors.phone = 'setup.errors.phone';
    if (email.trim() && !EMAIL.test(email.trim())) errors.email = 'setup.errors.email';
  }

  if (step === 'workHours') {
    const hours = form.workHours;
    const days = hours.working_days.filter((day) => (WEEKDAYS as readonly string[]).includes(day));
    if (days.length === 0) errors.working_days = 'setup.errors.workingDays';
    if (!isClockTime(hours.work_start_time)) errors.work_start_time = 'setup.errors.time';
    if (!isClockTime(hours.work_end_time)) errors.work_end_time = 'setup.errors.time';
    if (!errors.work_start_time && !errors.work_end_time && hours.work_start_time === hours.work_end_time) {
      errors.work_end_time = 'setup.errors.sameTime';
    }

    const hasStart = Boolean(hours.lunch_break_start);
    const hasEnd = Boolean(hours.lunch_break_end);
    if (hasStart !== hasEnd) {
      errors.lunch_break_end = 'setup.errors.breakPair';
    } else if (hasStart) {
      if (!isClockTime(hours.lunch_break_start)) errors.lunch_break_start = 'setup.errors.time';
      if (!isClockTime(hours.lunch_break_end)) errors.lunch_break_end = 'setup.errors.time';
      if (!errors.lunch_break_start && !errors.lunch_break_end && !errors.work_start_time && !errors.work_end_time) {
        const shift = clockMinutesBetween(hours.work_start_time, hours.work_end_time);
        if (breakMinutes(hours) === 0 || breakMinutes(hours) >= shift) errors.lunch_break_end = 'setup.errors.breakLength';
      }
    }
  }

  if (step === 'policy') {
    const policy = form.policy;
    if (!isIntegerBetween(policy.late_grace_minutes, 0, 120)) errors.late_grace_minutes = 'setup.errors.minutes';
    if (!isIntegerBetween(policy.absent_by_late_minutes, 1, 480)) errors.absent_by_late_minutes = 'setup.errors.minutes';
    if (
      !errors.late_grace_minutes &&
      !errors.absent_by_late_minutes &&
      Number(policy.absent_by_late_minutes) <= Number(policy.late_grace_minutes)
    ) {
      errors.absent_by_late_minutes = 'setup.errors.absentAfterGrace';
    }
    if (!(OT_METHODS as readonly string[]).includes(policy.ot_method)) errors.ot_method = 'setup.errors.choice';
    if (!(OT_ROUNDINGS as readonly string[]).includes(policy.ot_rounding)) errors.ot_rounding = 'setup.errors.choice';
  }

  if (step === 'holidays') {
    const seen = new Set<string>();
    form.holidays.entries.forEach((entry, index) => {
      if (!isIsoDate(entry.holiday_date)) errors[`entry_${index}`] = 'setup.errors.date';
      else if (!entry.holiday_date.startsWith(`${form.holidays.year}-`)) errors[`entry_${index}`] = 'setup.errors.holidayYear';
      else if (!entry.name.trim()) errors[`entry_${index}`] = 'setup.errors.holidayName';
      else if (seen.has(entry.holiday_date)) errors[`entry_${index}`] = 'setup.errors.holidayDuplicate';
      seen.add(entry.holiday_date);
    });
  }

  if (step === 'departments') {
    const seen = new Set<string>();
    form.departments.names.forEach((name, index) => {
      const key = name.trim().toLowerCase();
      if (!key) errors[`name_${index}`] = 'setup.errors.required';
      else if (key.length > 100) errors[`name_${index}`] = 'setup.errors.tooLong';
      else if (seen.has(key)) errors[`name_${index}`] = 'setup.errors.departmentDuplicate';
      seen.add(key);
    });
    if (form.departments.names.length === 0) errors.names = 'setup.errors.departmentNone';
  }

  if (step === 'payroll') {
    const payroll = form.payroll;
    if (!isIntegerBetween(payroll.payroll_date, 1, 31)) errors.payroll_date = 'setup.errors.payDay';
    if (!(PAYMENT_METHODS as readonly string[]).includes(payroll.payment_method)) errors.payment_method = 'setup.errors.choice';
    if (payroll.default_bank.length > 100) errors.default_bank = 'setup.errors.tooLong';
  }

  return errors;
};

/**
 * Check the whole form.
 * @param form - The form to check.
 * @returns Errors by step; a step with no problems has an empty object.
 */
export const validateAll = (form: SetupForm): Record<SetupStep, StepErrors> =>
  SETUP_STEPS.reduce(
    (all, step) => ({ ...all, [step]: validateStep(step, form) }),
    {} as Record<SetupStep, StepErrors>,
  );

export interface SetupPlan {
  organization: { id: string | null; values: Record<string, string | null> };
  settings: { id: string | null; values: Record<string, unknown> };
  shift: { id: string | null; values: Record<string, unknown> };
  weekOffs: { add: number[]; removeIds: string[] };
  policy: { id: string | null; values: Record<string, unknown> };
  holidays: { add: { holiday_date: string; name: string }[]; update: { id: string; name: string }[]; removeIds: string[] };
  departments: { add: string[] };
}

/** Trimmed text, or null when nothing is left. */
const textOrNull = (value: string): string | null => value.trim() || null;

/**
 * Work out every record the form implies.
 *
 * One answer about working hours becomes three writes: the settings row, the
 * default shift and the weekly days off. Only organization-wide days off and
 * holidays are touched; rows scoped to a department or a group are left alone.
 *
 * @param form - A form that has passed validateAll.
 * @param snapshot - The records as they are now.
 * @returns What to insert, update and remove.
 */
export const buildSetupPlan = (form: SetupForm, snapshot: SetupSnapshot): SetupPlan => {
  const hours = form.workHours;
  const workingDays = WEEKDAYS.filter((day) => hours.working_days.includes(day));
  const overnight = hours.work_end_time < hours.work_start_time;

  const wantedOff = weeklyDaysOff(workingDays);
  const orgWideOff = (snapshot.weekOffs || []).filter((row) => !row.department && !row.employee_group);
  const keptOff = new Set<number>();
  const removeOffIds: string[] = [];
  orgWideOff.forEach((row) => {
    // A weekday listed twice keeps one row.
    if (wantedOff.includes(row.weekday) && !keptOff.has(row.weekday)) keptOff.add(row.weekday);
    else removeOffIds.push(row.id);
  });

  const year = `${form.holidays.year}-`;
  const orgWideHolidays = (snapshot.holidays || []).filter(
    (row) => !row.department && !row.employee_group && row.holiday_date.startsWith(year),
  );
  const wantedHolidays = new Map(form.holidays.entries.map((entry) => [entry.holiday_date, entry.name.trim()]));
  const existingDates = new Map<string, { id: string; name: string }>();
  const removeHolidayIds: string[] = [];
  orgWideHolidays.forEach((row) => {
    if (wantedHolidays.has(row.holiday_date) && !existingDates.has(row.holiday_date)) existingDates.set(row.holiday_date, row);
    else removeHolidayIds.push(row.id);
  });

  const existingDepartments = new Set((snapshot.departments || []).map((row) => row.name.trim().toLowerCase()));
  const defaultShift = (snapshot.shifts || []).find((shift) => shift.shift_name === DEFAULT_SHIFT_NAME);

  return {
    organization: {
      id: snapshot.organization?.id ?? null,
      values: {
        name: form.company.name.trim(),
        tax_id: textOrNull(form.company.tax_id.replace(/[\s-]/g, '')),
        address: textOrNull(form.company.address),
        phone: textOrNull(form.company.phone.replace(/[\s-]/g, '')),
        email: textOrNull(form.company.email.toLowerCase()),
      },
    },
    settings: {
      id: snapshot.settings?.id ?? null,
      values: {
        working_days: workingDays,
        work_start_time: hours.work_start_time,
        work_end_time: hours.work_end_time,
        lunch_break_start: hours.lunch_break_start || null,
        lunch_break_end: hours.lunch_break_end || null,
        payroll_date: Number(form.payroll.payroll_date),
        payment_method: form.payroll.payment_method,
        default_bank: textOrNull(form.payroll.default_bank),
      },
    },
    shift: {
      id: defaultShift?.id ?? null,
      values: {
        shift_name: DEFAULT_SHIFT_NAME,
        shift_type: 'Fixed',
        start_time: hours.work_start_time,
        end_time: hours.work_end_time,
        break_minutes: breakMinutes(hours),
        late_tolerance_minutes: Number(form.policy.late_grace_minutes),
        cross_day_shift: overnight,
      },
    },
    weekOffs: {
      add: wantedOff.filter((weekday) => !keptOff.has(weekday)),
      removeIds: removeOffIds,
    },
    policy: {
      id: snapshot.policy?.id ?? null,
      values: {
        name: 'Default Policy',
        late_grace_minutes: Number(form.policy.late_grace_minutes),
        late_threshold_minutes: Number(form.policy.late_grace_minutes),
        absent_by_late_minutes: Number(form.policy.absent_by_late_minutes),
        ot_method: form.policy.ot_method,
        ot_rounding: form.policy.ot_rounding,
      },
    },
    holidays: {
      add: form.holidays.entries
        .filter((entry) => !existingDates.has(entry.holiday_date))
        .map((entry) => ({ holiday_date: entry.holiday_date, name: entry.name.trim() })),
      update: form.holidays.entries
        .filter((entry) => {
          const existing = existingDates.get(entry.holiday_date);
          return existing !== undefined && existing.name !== entry.name.trim();
        })
        .map((entry) => ({ id: existingDates.get(entry.holiday_date)!.id, name: entry.name.trim() })),
      removeIds: removeHolidayIds,
    },
    departments: {
      add: form.departments.names.map((name) => name.trim()).filter((name) => !existingDepartments.has(name.toLowerCase())),
    },
  };
};

/**
 * Plain-language list of what saving will change, for the review step.
 * @param plan - The plan about to be applied.
 * @returns Message keys with their values, in the order the changes are made.
 */
export const describePlan = (plan: SetupPlan): { key: string; values?: Record<string, unknown> }[] => {
  const lines: { key: string; values?: Record<string, unknown> }[] = [
    { key: 'setup.plan.organization' },
    { key: 'setup.plan.settings' },
    { key: plan.shift.id ? 'setup.plan.shiftUpdate' : 'setup.plan.shiftCreate', values: { name: DEFAULT_SHIFT_NAME } },
  ];
  if (plan.weekOffs.add.length || plan.weekOffs.removeIds.length) {
    lines.push({ key: 'setup.plan.weekOffs', values: { add: plan.weekOffs.add.length, remove: plan.weekOffs.removeIds.length } });
  }
  lines.push({ key: 'setup.plan.policy' });
  if (plan.holidays.add.length || plan.holidays.update.length || plan.holidays.removeIds.length) {
    lines.push({
      key: 'setup.plan.holidays',
      values: { add: plan.holidays.add.length, update: plan.holidays.update.length, remove: plan.holidays.removeIds.length },
    });
  }
  if (plan.departments.add.length) lines.push({ key: 'setup.plan.departments', values: { count: plan.departments.add.length } });
  return lines;
};

/**
 * Which steps of the setup are already done, judged from the stored records.
 * @param snapshot - The records as they are now.
 * @param year - Year whose holidays are checked.
 * @returns A flag per step and the count of finished steps.
 */
export const setupStatus = (
  snapshot: SetupSnapshot,
  year: number,
): { steps: Record<SetupStep, boolean>; done: number; total: number; complete: boolean } => {
  const settings = snapshot.settings;
  const steps: Record<SetupStep, boolean> = {
    company: Boolean(snapshot.organization?.name?.trim() && snapshot.organization?.tax_id?.trim()),
    workHours:
      Boolean(settings?.work_start_time && settings?.work_end_time && settings?.working_days?.length) &&
      (snapshot.shifts || []).some((shift) => shift.shift_name === DEFAULT_SHIFT_NAME),
    policy: Boolean(snapshot.policy?.id),
    holidays: (snapshot.holidays || []).some((row) => row.holiday_date.startsWith(`${year}-`)),
    departments: (snapshot.departments || []).length > 0,
    payroll: Boolean(settings?.payroll_date),
  };
  const done = SETUP_STEPS.filter((step) => steps[step]).length;
  return { steps, done, total: SETUP_STEPS.length, complete: done === SETUP_STEPS.length };
};

/**
 * Weekday of a calendar date, 0 for Sunday to 6 for Saturday.
 * @param date - Date in `YYYY-MM-DD` form.
 * @returns The weekday number.
 * @throws {RangeError} When the date is malformed.
 */
export const weekdayOf = (date: string): number => {
  if (!isIsoDate(date)) throw new RangeError(`Invalid date: ${date}`);
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

/** Stored records with every column the form reads. */
export interface SetupRecords extends SetupSnapshot {
  organization?: (SetupSnapshot['organization'] & { address?: string | null; phone?: string | null; email?: string | null }) | null;
  settings?:
    | (NonNullable<SetupSnapshot['settings']> & {
        lunch_break_start?: string | null;
        lunch_break_end?: string | null;
        payment_method?: string | null;
        default_bank?: string | null;
      })
    | null;
  policy?:
    | (NonNullable<SetupSnapshot['policy']> & {
        late_grace_minutes?: number | null;
        absent_by_late_minutes?: number | null;
        ot_method?: string | null;
        ot_rounding?: string | null;
      })
    | null;
}

/** `HH:mm` from a stored time such as `08:00:00`; empty when there is none. */
const clock = (value?: string | null): string => (value ? value.slice(0, 5) : '');

/**
 * Fill the form from what is already stored, with sensible starting values
 * where nothing is. Nothing is asked twice.
 * @param records - The records as they are now.
 * @param year - Year whose holidays are edited.
 * @returns A form ready to edit.
 */
export const formFromRecords = (records: SetupRecords, year: number): SetupForm => {
  const { organization, settings, policy } = records;
  const storedDays = (settings?.working_days || []).filter((day) => (WEEKDAYS as readonly string[]).includes(day));

  return {
    company: {
      name: organization?.name ?? '',
      tax_id: organization?.tax_id ?? '',
      address: organization?.address ?? '',
      phone: organization?.phone ?? '',
      email: organization?.email ?? '',
    },
    workHours: {
      working_days: storedDays.length ? storedDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      work_start_time: clock(settings?.work_start_time) || '08:00',
      work_end_time: clock(settings?.work_end_time) || '17:00',
      lunch_break_start: settings ? clock(settings.lunch_break_start) || (settings.work_start_time ? '' : '12:00') : '12:00',
      lunch_break_end: settings ? clock(settings.lunch_break_end) || (settings.work_start_time ? '' : '13:00') : '13:00',
    },
    policy: {
      late_grace_minutes: policy?.late_grace_minutes ?? 5,
      absent_by_late_minutes: policy?.absent_by_late_minutes ?? 30,
      ot_method: (OT_METHODS as readonly string[]).includes(policy?.ot_method ?? '') ? (policy!.ot_method as string) : 'scan',
      ot_rounding: (OT_ROUNDINGS as readonly string[]).includes(policy?.ot_rounding ?? '') ? (policy!.ot_rounding as string) : 'none',
    },
    holidays: {
      year,
      entries: (records.holidays || [])
        .filter((row) => !row.department && !row.employee_group && row.holiday_date.startsWith(`${year}-`))
        .map((row) => ({ id: row.id, holiday_date: row.holiday_date, name: row.name }))
        .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date)),
    },
    departments: { names: (records.departments || []).map((row) => row.name) },
    payroll: {
      payroll_date: settings?.payroll_date ?? 25,
      payment_method: (PAYMENT_METHODS as readonly string[]).includes(settings?.payment_method ?? '')
        ? (settings!.payment_method as string)
        : 'bank_transfer',
      default_bank: settings?.default_bank ?? '',
    },
  };
};
