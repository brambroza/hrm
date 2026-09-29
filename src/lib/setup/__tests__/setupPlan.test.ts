import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHIFT_NAME,
  breakMinutes,
  buildSetupPlan,
  describePlan,
  isValidThaiId,
  setupStatus,
  validateAll,
  validateStep,
  weekdayOf,
  weeklyDaysOff,
  type SetupForm,
  type SetupSnapshot,
} from '../setupPlan';
import { FIXED_THAI_HOLIDAYS, fixedHolidaysForYear } from '../thaiHolidays';

/** A tax ID with a correct check digit, built for the test rather than taken from a real company. */
const VALID_TAX_ID = '0105500000011';

const form = (): SetupForm => ({
  company: { name: 'บริษัท ตัวอย่าง จำกัด', tax_id: VALID_TAX_ID, address: 'ระยอง', phone: '038-000-000', email: 'HR@Example.co.th' },
  workHours: {
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    work_start_time: '08:00',
    work_end_time: '17:00',
    lunch_break_start: '12:00',
    lunch_break_end: '13:00',
  },
  policy: { late_grace_minutes: 5, absent_by_late_minutes: 30, ot_method: 'scan', ot_rounding: '30' },
  holidays: {
    year: 2026,
    entries: [
      { holiday_date: '2026-01-01', name: 'วันขึ้นปีใหม่' },
      { holiday_date: '2026-05-01', name: 'วันแรงงานแห่งชาติ' },
    ],
  },
  departments: { names: ['ผลิต 1', 'คลังสินค้า'] },
  payroll: { payroll_date: 25, payment_method: 'bank_transfer', default_bank: 'กสิกรไทย' },
});

describe('isValidThaiId', () => {
  it('accepts an ID with a correct check digit, with or without separators', () => {
    expect(isValidThaiId(VALID_TAX_ID)).toBe(true);
    expect(isValidThaiId('0-1055-00000-01-1')).toBe(true);
  });

  it('rejects a wrong check digit, wrong length and non-digits', () => {
    expect(isValidThaiId('0105500000010')).toBe(false);
    expect(isValidThaiId('010550000001')).toBe(false);
    expect(isValidThaiId('01055000000100')).toBe(false);
    expect(isValidThaiId('01055000000ab')).toBe(false);
    expect(isValidThaiId('')).toBe(false);
    expect(isValidThaiId(null)).toBe(false);
  });

  it('agrees with the published algorithm on a worked example', () => {
    // 1-2345-67890-12-?: sum = 1*13+2*12+3*11+4*10+5*9+6*8+7*7+8*6+9*5+0*4+1*3+2*2 = 352
    // 352 mod 11 = 0, (11 - 0) mod 10 = 1
    expect(isValidThaiId('1234567890121')).toBe(true);
    expect(isValidThaiId('1234567890120')).toBe(false);
  });
});

describe('weeklyDaysOff and breakMinutes', () => {
  it('lists the days that are not worked, Sunday as 0', () => {
    expect(weeklyDaysOff(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])).toEqual([0, 6]);
    expect(weeklyDaysOff(form().workHours.working_days)).toEqual([0]);
    expect(weeklyDaysOff([])).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('measures the break, 0 when there is none', () => {
    expect(breakMinutes(form().workHours)).toBe(60);
    expect(breakMinutes({ ...form().workHours, lunch_break_start: '', lunch_break_end: '' })).toBe(0);
  });
});

describe('validateStep', () => {
  it('passes a complete form', () => {
    const all = validateAll(form());
    Object.values(all).forEach((errors) => expect(errors).toEqual({}));
  });

  it('company: needs a name and well-formed optional fields', () => {
    const f = form();
    f.company = { name: ' ', tax_id: '123', address: '', phone: '12345', email: 'nope' };
    expect(validateStep('company', f)).toEqual({
      name: 'setup.errors.required',
      tax_id: 'setup.errors.taxId',
      phone: 'setup.errors.phone',
      email: 'setup.errors.email',
    });
  });

  it('company: optional fields may be empty', () => {
    const f = form();
    f.company = { name: 'บริษัท', tax_id: '', address: '', phone: '', email: '' };
    expect(validateStep('company', f)).toEqual({});
  });

  it('work hours: needs days and two different times', () => {
    const f = form();
    f.workHours = { working_days: [], work_start_time: '08:00', work_end_time: '08:00', lunch_break_start: '', lunch_break_end: '' };
    expect(validateStep('workHours', f)).toEqual({
      working_days: 'setup.errors.workingDays',
      work_end_time: 'setup.errors.sameTime',
    });
  });

  it('work hours: accepts an overnight shift', () => {
    const f = form();
    f.workHours = { ...f.workHours, work_start_time: '22:00', work_end_time: '06:00', lunch_break_start: '02:00', lunch_break_end: '03:00' };
    expect(validateStep('workHours', f)).toEqual({});
  });

  it('work hours: the break needs both ends and must be shorter than the shift', () => {
    const f = form();
    f.workHours = { ...f.workHours, lunch_break_end: '' };
    expect(validateStep('workHours', f).lunch_break_end).toBe('setup.errors.breakPair');

    f.workHours = { ...form().workHours, work_start_time: '08:00', work_end_time: '09:00', lunch_break_start: '08:00', lunch_break_end: '09:00' };
    expect(validateStep('workHours', f).lunch_break_end).toBe('setup.errors.breakLength');
  });

  it('policy: absence threshold must come after the grace period', () => {
    const f = form();
    f.policy = { ...f.policy, late_grace_minutes: 30, absent_by_late_minutes: 30 };
    expect(validateStep('policy', f)).toEqual({ absent_by_late_minutes: 'setup.errors.absentAfterGrace' });
  });

  it('policy: rejects blanks, fractions and unknown choices', () => {
    const f = form();
    f.policy = { late_grace_minutes: '', absent_by_late_minutes: 12.5, ot_method: 'guess', ot_rounding: '7' };
    expect(validateStep('policy', f)).toEqual({
      late_grace_minutes: 'setup.errors.minutes',
      absent_by_late_minutes: 'setup.errors.minutes',
      ot_method: 'setup.errors.choice',
      ot_rounding: 'setup.errors.choice',
    });
  });

  it('holidays: checks the date, the year, the name and duplicates', () => {
    const f = form();
    f.holidays.entries = [
      { holiday_date: '2026-02-30', name: 'x' },
      { holiday_date: '2027-01-01', name: 'x' },
      { holiday_date: '2026-04-13', name: ' ' },
      { holiday_date: '2026-05-01', name: 'a' },
      { holiday_date: '2026-05-01', name: 'b' },
    ];
    expect(validateStep('holidays', f)).toEqual({
      entry_0: 'setup.errors.date',
      entry_1: 'setup.errors.holidayYear',
      entry_2: 'setup.errors.holidayName',
      entry_4: 'setup.errors.holidayDuplicate',
    });
  });

  it('holidays: an empty list is allowed', () => {
    const f = form();
    f.holidays.entries = [];
    expect(validateStep('holidays', f)).toEqual({});
  });

  it('departments: needs at least one, no blanks, no duplicates in any casing', () => {
    const f = form();
    f.departments.names = [];
    expect(validateStep('departments', f)).toEqual({ names: 'setup.errors.departmentNone' });

    f.departments.names = ['Sales', ' ', 'sales'];
    expect(validateStep('departments', f)).toEqual({
      name_1: 'setup.errors.required',
      name_2: 'setup.errors.departmentDuplicate',
    });
  });

  it('payroll: pay day is a day of the month', () => {
    const f = form();
    f.payroll = { payroll_date: 32, payment_method: 'barter', default_bank: '' };
    expect(validateStep('payroll', f)).toEqual({
      payroll_date: 'setup.errors.payDay',
      payment_method: 'setup.errors.choice',
    });
  });
});

describe('buildSetupPlan', () => {
  it('turns one answer about working hours into settings, a shift and days off', () => {
    const plan = buildSetupPlan(form(), {});

    expect(plan.settings.values).toMatchObject({
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      work_start_time: '08:00',
      work_end_time: '17:00',
      payroll_date: 25,
    });
    expect(plan.shift).toEqual({
      id: null,
      values: {
        shift_name: DEFAULT_SHIFT_NAME,
        shift_type: 'Fixed',
        start_time: '08:00',
        end_time: '17:00',
        break_minutes: 60,
        late_tolerance_minutes: 5,
        cross_day_shift: false,
      },
    });
    expect(plan.weekOffs).toEqual({ add: [0], removeIds: [] });
  });

  it('marks an overnight shift without being told', () => {
    const f = form();
    f.workHours = { ...f.workHours, work_start_time: '22:00', work_end_time: '06:00', lunch_break_start: '', lunch_break_end: '' };
    const plan = buildSetupPlan(f, {});
    expect(plan.shift.values.cross_day_shift).toBe(true);
    expect(plan.shift.values.break_minutes).toBe(0);
  });

  it('keeps working days in calendar order whatever order they were ticked', () => {
    const f = form();
    f.workHours.working_days = ['Friday', 'Monday', 'Bogus'];
    expect(buildSetupPlan(f, {}).settings.values.working_days).toEqual(['Monday', 'Friday']);
  });

  it('cleans company fields', () => {
    const plan = buildSetupPlan(form(), { organization: { id: 'org-1' } });
    expect(plan.organization).toEqual({
      id: 'org-1',
      values: { name: 'บริษัท ตัวอย่าง จำกัด', tax_id: VALID_TAX_ID, address: 'ระยอง', phone: '038000000', email: 'hr@example.co.th' },
    });
  });

  it('updates what exists instead of adding it again', () => {
    const snapshot: SetupSnapshot = {
      settings: { id: 'set-1' },
      policy: { id: 'pol-1' },
      shifts: [{ id: 'sh-9', shift_name: 'กะดึก' }, { id: 'sh-1', shift_name: DEFAULT_SHIFT_NAME }],
      weekOffs: [
        { id: 'w-sun', weekday: 0 },
        { id: 'w-sat', weekday: 6 },
        { id: 'w-dept', weekday: 3, department: 'คลังสินค้า' },
      ],
      holidays: [
        { id: 'h-ny', holiday_date: '2026-01-01', name: 'ปีใหม่' },
        { id: 'h-old', holiday_date: '2026-08-12', name: 'วันแม่แห่งชาติ' },
        { id: 'h-2025', holiday_date: '2025-01-01', name: 'วันขึ้นปีใหม่' },
        { id: 'h-dept', holiday_date: '2026-03-03', name: 'วันหยุดแผนก', department: 'ผลิต 1' },
      ],
      departments: [{ id: 'd-1', name: 'ผลิต 1 ' }],
    };
    const plan = buildSetupPlan(form(), snapshot);

    expect(plan.settings.id).toBe('set-1');
    expect(plan.policy.id).toBe('pol-1');
    expect(plan.shift.id).toBe('sh-1');
    // Saturday is worked now; the department's own day off is not ours to touch.
    expect(plan.weekOffs).toEqual({ add: [], removeIds: ['w-sat'] });
    expect(plan.holidays).toEqual({
      add: [{ holiday_date: '2026-05-01', name: 'วันแรงงานแห่งชาติ' }],
      update: [{ id: 'h-ny', name: 'วันขึ้นปีใหม่' }],
      // Other years and department holidays stay.
      removeIds: ['h-old'],
    });
    expect(plan.departments.add).toEqual(['คลังสินค้า']);
  });

  it('removes duplicate rows of the same weekday and holiday', () => {
    const plan = buildSetupPlan(form(), {
      weekOffs: [{ id: 'a', weekday: 0 }, { id: 'b', weekday: 0 }],
      holidays: [
        { id: 'x', holiday_date: '2026-01-01', name: 'วันขึ้นปีใหม่' },
        { id: 'y', holiday_date: '2026-01-01', name: 'วันขึ้นปีใหม่' },
      ],
    });
    expect(plan.weekOffs).toEqual({ add: [], removeIds: ['b'] });
    expect(plan.holidays.removeIds).toEqual(['y']);
  });

  it('is a no-op the second time', () => {
    const snapshot: SetupSnapshot = {
      shifts: [{ id: 'sh-1', shift_name: DEFAULT_SHIFT_NAME }],
      weekOffs: [{ id: 'w', weekday: 0 }],
      holidays: [
        { id: 'h1', holiday_date: '2026-01-01', name: 'วันขึ้นปีใหม่' },
        { id: 'h2', holiday_date: '2026-05-01', name: 'วันแรงงานแห่งชาติ' },
      ],
      departments: [{ id: 'd1', name: 'ผลิต 1' }, { id: 'd2', name: 'คลังสินค้า' }],
    };
    const plan = buildSetupPlan(form(), snapshot);
    expect(plan.weekOffs).toEqual({ add: [], removeIds: [] });
    expect(plan.holidays).toEqual({ add: [], update: [], removeIds: [] });
    expect(plan.departments.add).toEqual([]);
  });
});

describe('describePlan', () => {
  it('lists only what will change', () => {
    const keys = describePlan(buildSetupPlan(form(), {})).map((line) => line.key);
    expect(keys).toEqual([
      'setup.plan.organization',
      'setup.plan.settings',
      'setup.plan.shiftCreate',
      'setup.plan.weekOffs',
      'setup.plan.policy',
      'setup.plan.holidays',
      'setup.plan.departments',
    ]);
  });

  it('says update when the default shift exists and skips empty sections', () => {
    const snapshot: SetupSnapshot = {
      shifts: [{ id: 'sh-1', shift_name: DEFAULT_SHIFT_NAME }],
      weekOffs: [{ id: 'w', weekday: 0 }],
      holidays: [
        { id: 'h1', holiday_date: '2026-01-01', name: 'วันขึ้นปีใหม่' },
        { id: 'h2', holiday_date: '2026-05-01', name: 'วันแรงงานแห่งชาติ' },
      ],
      departments: [{ id: 'd1', name: 'ผลิต 1' }, { id: 'd2', name: 'คลังสินค้า' }],
    };
    const keys = describePlan(buildSetupPlan(form(), snapshot)).map((line) => line.key);
    expect(keys).toEqual(['setup.plan.organization', 'setup.plan.settings', 'setup.plan.shiftUpdate', 'setup.plan.policy']);
  });
});

describe('setupStatus', () => {
  it('reports nothing done on an empty organization', () => {
    const status = setupStatus({}, 2026);
    expect(status.done).toBe(0);
    expect(status.total).toBe(6);
    expect(status.complete).toBe(false);
  });

  it('a settings row with no values does not count', () => {
    // provision_organization creates an empty settings row for every tenant.
    const status = setupStatus({ settings: { id: 's' }, policy: { id: 'p' } }, 2026);
    expect(status.steps).toMatchObject({ workHours: false, payroll: false, policy: true });
  });

  it('working hours need the default shift as well as the settings', () => {
    const settings = { id: 's', working_days: ['Monday'], work_start_time: '08:00', work_end_time: '17:00' };
    expect(setupStatus({ settings }, 2026).steps.workHours).toBe(false);
    expect(setupStatus({ settings, shifts: [{ id: 'x', shift_name: DEFAULT_SHIFT_NAME }] }, 2026).steps.workHours).toBe(true);
  });

  it('holidays count for the year asked about only', () => {
    const snapshot = { holidays: [{ id: 'h', holiday_date: '2025-01-01', name: 'x' }] };
    expect(setupStatus(snapshot, 2026).steps.holidays).toBe(false);
    expect(setupStatus(snapshot, 2025).steps.holidays).toBe(true);
  });

  it('is complete when every step is done', () => {
    const status = setupStatus(
      {
        organization: { id: 'o', name: 'บริษัท', tax_id: VALID_TAX_ID },
        settings: { id: 's', working_days: ['Monday'], work_start_time: '08:00', work_end_time: '17:00', payroll_date: 25 },
        shifts: [{ id: 'x', shift_name: DEFAULT_SHIFT_NAME }],
        policy: { id: 'p' },
        holidays: [{ id: 'h', holiday_date: '2026-01-01', name: 'x' }],
        departments: [{ id: 'd', name: 'ผลิต' }],
      },
      2026,
    );
    expect(status).toMatchObject({ done: 6, complete: true });
  });
});

describe('weekdayOf', () => {
  it('gives Sunday as 0', () => {
    expect(weekdayOf('2026-10-04')).toBe(0);
    expect(weekdayOf('2026-10-01')).toBe(4);
    expect(weekdayOf('2026-10-03')).toBe(6);
  });

  it('throws on a malformed date', () => {
    expect(() => weekdayOf('2026-13-01')).toThrow(RangeError);
  });
});

describe('fixedHolidaysForYear', () => {
  it('produces valid dates in order, including Labour Day', () => {
    const list = fixedHolidaysForYear(2026);
    expect(list).toHaveLength(FIXED_THAI_HOLIDAYS.length);
    expect(list.map((h) => h.holiday_date)).toEqual([...list.map((h) => h.holiday_date)].sort());
    expect(list.find((h) => h.holiday_date === '2026-05-01')?.name).toBe('วันแรงงานแห่งชาติ');
    expect(new Set(list.map((h) => h.holiday_date)).size).toBe(list.length);
  });

  it('rejects a year that is not Gregorian', () => {
    expect(() => fixedHolidaysForYear(2569.5)).toThrow(RangeError);
    expect(() => fixedHolidaysForYear(99)).toThrow(RangeError);
  });
});

describe('formFromRecords', () => {
  it('starts a new organization with usable defaults', async () => {
    const { formFromRecords } = await import('../setupPlan');
    const f = formFromRecords({}, 2026);
    expect(f.workHours).toEqual({
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      work_start_time: '08:00',
      work_end_time: '17:00',
      lunch_break_start: '12:00',
      lunch_break_end: '13:00',
    });
    expect(f.policy).toEqual({ late_grace_minutes: 5, absent_by_late_minutes: 30, ot_method: 'scan', ot_rounding: 'none' });
    expect(f.payroll).toEqual({ payroll_date: 25, payment_method: 'bank_transfer', default_bank: '' });
    expect(f.holidays).toEqual({ year: 2026, entries: [] });
    expect(validateStep('workHours', f)).toEqual({});
    expect(validateStep('policy', f)).toEqual({});
    expect(validateStep('payroll', f)).toEqual({});
  });

  it('reads stored values, trimming seconds from times', async () => {
    const { formFromRecords } = await import('../setupPlan');
    const f = formFromRecords(
      {
        organization: { id: 'o', name: 'บริษัท', tax_id: VALID_TAX_ID, address: null, phone: '038000000', email: null },
        settings: {
          id: 's',
          working_days: ['Saturday', 'Monday', 'Nonsense'],
          work_start_time: '22:00:00',
          work_end_time: '06:00:00',
          lunch_break_start: null,
          lunch_break_end: null,
          payroll_date: 28,
          payment_method: 'cash',
          default_bank: null,
        },
        policy: { id: 'p', late_grace_minutes: 0, absent_by_late_minutes: 60, ot_method: 'request', ot_rounding: 'weird' },
        holidays: [
          { id: 'b', holiday_date: '2026-05-01', name: 'วันแรงงานแห่งชาติ' },
          { id: 'a', holiday_date: '2026-01-01', name: 'วันขึ้นปีใหม่' },
          { id: 'c', holiday_date: '2025-12-31', name: 'วันสิ้นปี' },
          { id: 'd', holiday_date: '2026-03-03', name: 'วันหยุดแผนก', department: 'ผลิต 1' },
        ],
        departments: [{ id: 'd1', name: 'ผลิต 1' }],
      },
      2026,
    );
    expect(f.company).toEqual({ name: 'บริษัท', tax_id: VALID_TAX_ID, address: '', phone: '038000000', email: '' });
    expect(f.workHours).toEqual({
      working_days: ['Saturday', 'Monday'],
      work_start_time: '22:00',
      work_end_time: '06:00',
      // A stored shift with no break stays without one.
      lunch_break_start: '',
      lunch_break_end: '',
    });
    // Grace of 0 is a real value, not a missing one.
    expect(f.policy).toEqual({ late_grace_minutes: 0, absent_by_late_minutes: 60, ot_method: 'request', ot_rounding: 'none' });
    expect(f.holidays.entries.map((e) => e.id)).toEqual(['a', 'b']);
    expect(f.departments.names).toEqual(['ผลิต 1']);
    expect(f.payroll).toEqual({ payroll_date: 28, payment_method: 'cash', default_bank: '' });
  });
});
