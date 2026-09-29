import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POLICY,
  calculateDaily,
  findLeave,
  findOtRequest,
  getShiftByEmployee,
  isOvernightShift,
  type Shift,
} from '../dailyCalculation';

const DATE = '2026-09-28';
const at = (time: string, date = DATE) => `${date}T${time}:00+07:00`;

const dayShift: Shift = { id: 's-day', shift_name: 'เช้า', start_time: '08:00:00', end_time: '17:00:00', break_minutes: 60 };
const nightShift: Shift = { id: 's-night', shift_name: 'ดึก', start_time: '22:00:00', end_time: '06:00:00', break_minutes: 60 };

const base = { date: DATE, policy: DEFAULT_POLICY, holiday: false };

describe('calculateDaily precedence', () => {
  it('approved leave wins over everything', () => {
    const result = calculateDaily({
      ...base,
      shift: dayShift,
      holiday: true,
      log: { check_in: at('08:00'), check_out: at('17:00') },
      leave: { employee_id: 'e1', start_date: DATE, end_date: DATE, status: 'approved', reason: 'ป่วย' },
    });
    expect(result.status).toBe('leave');
    expect(result.note).toBe('ป่วย');
  });

  it('holiday comes before scans', () => {
    expect(calculateDaily({ ...base, shift: dayShift, holiday: true }).status).toBe('holiday');
  });

  it('no log is an absence noted as no_scan', () => {
    const result = calculateDaily({ ...base, shift: dayShift });
    expect(result.status).toBe('absent');
    expect(result.note).toBe('no_scan');
  });
});

describe('calculateDaily day shift', () => {
  it('on time, break deducted, no OT', () => {
    const result = calculateDaily({ ...base, shift: dayShift, log: { check_in: at('07:55'), check_out: at('17:00') } });
    expect(result.status).toBe('normal');
    expect(result.workHours).toBe('8.08');
    expect(result.lateMinutes).toBe(0);
    expect(result.otMinutes).toBe(0);
    expect(result.checkIn).toBe('07:55:00');
  });

  it('inside the grace period is not late', () => {
    const result = calculateDaily({ ...base, shift: dayShift, log: { check_in: at('08:05'), check_out: at('17:00') } });
    expect(result.status).toBe('normal');
    expect(result.lateMinutes).toBe(0);
  });

  it('past the grace period is late by the full difference', () => {
    const result = calculateDaily({ ...base, shift: dayShift, log: { check_in: at('08:11'), check_out: at('17:00') } });
    expect(result.status).toBe('late');
    expect(result.lateMinutes).toBe(11);
  });

  it('thirty minutes late counts as absent by lateness', () => {
    const result = calculateDaily({ ...base, shift: dayShift, log: { check_in: at('08:30'), check_out: at('17:00') } });
    expect(result.status).toBe('absent_by_late');
    expect(result.lateMinutes).toBe(30);
  });

  it('counts OT from the end of the shift', () => {
    const result = calculateDaily({ ...base, shift: dayShift, log: { check_in: at('08:00'), check_out: at('19:32') } });
    expect(result.otMinutes).toBe(152);
  });

  it('flags a missing punch', () => {
    const result = calculateDaily({ ...base, shift: dayShift, log: { check_in: at('07:52') } });
    expect(result.status).toBe('missing_punch');
    expect(result.workHours).toBe('-');
    expect(result.checkOut).toBe('-');
  });

  it('a log without an assigned shift stays absent', () => {
    // Known gap kept from the original behaviour; the exception inbox in Phase 2 surfaces these.
    const result = calculateDaily({ ...base, shift: null, log: { check_in: at('08:00'), check_out: at('17:00') } });
    expect(result.status).toBe('absent');
    expect(result.workHours).toBe('9.00');
  });
});

describe('calculateDaily overnight shift', () => {
  it('measures hours across midnight', () => {
    const result = calculateDaily({
      ...base,
      shift: nightShift,
      log: { check_in: at('21:58'), check_out: at('06:04', '2026-09-29') },
    });
    expect(result.status).toBe('normal');
    expect(result.workHours).toBe('7.10');
    expect(result.otMinutes).toBe(4);
  });

  it('treats end before start as overnight without the flag', () => {
    expect(isOvernightShift(nightShift)).toBe(true);
    expect(isOvernightShift(dayShift)).toBe(false);
    expect(isOvernightShift({ id: 'x', start_time: '08:00', end_time: '17:00', cross_day_shift: true })).toBe(true);
    expect(isOvernightShift({ id: 'y' })).toBe(false);
  });

  it('does not count the whole shift as OT', () => {
    const result = calculateDaily({
      ...base,
      shift: nightShift,
      log: { check_in: at('22:00'), check_out: at('06:00', '2026-09-29') },
    });
    expect(result.otMinutes).toBe(0);
  });
});

describe('calculateDaily OT by request', () => {
  const policy = { ...DEFAULT_POLICY, ot_method: 'request' };

  it('uses the approved minutes, not the scans', () => {
    const result = calculateDaily({
      ...base,
      policy,
      shift: dayShift,
      log: { check_in: at('08:00'), check_out: at('20:00') },
      otRequest: { employee_id: 'e1', request_date: DATE, minutes: 120 },
    });
    expect(result.otMinutes).toBe(120);
  });

  it('gives no OT without a request', () => {
    const result = calculateDaily({ ...base, policy, shift: dayShift, log: { check_in: at('08:00'), check_out: at('20:00') } });
    expect(result.otMinutes).toBe(0);
  });
});

describe('calculateDaily split scans', () => {
  const fourScan: Shift = { ...dayShift, id: 's4', scan_policy: '4' };

  it('adds the morning and afternoon segments', () => {
    const result = calculateDaily({
      ...base,
      shift: fourScan,
      log: {
        check_in_morning: at('08:00'),
        check_out_morning: at('12:00'),
        check_in_afternoon: at('13:00'),
        check_out_afternoon: at('17:00'),
      },
    });
    expect(result.workHours).toBe('8.00');
    expect(result.status).toBe('normal');
    expect(result.checkIn).toBe('08:00:00 / 13:00:00');
  });

  it('flags a missing last scan', () => {
    const result = calculateDaily({
      ...base,
      shift: fourScan,
      log: { check_in_morning: at('08:00'), check_out_morning: at('12:00'), check_in_afternoon: at('13:00') },
    });
    expect(result.status).toBe('missing_punch');
  });
});

describe('lookups', () => {
  const shiftMap = new Map([[dayShift.id, dayShift], [nightShift.id, nightShift]]);
  const assignmentMap = new Map([
    ['e1', [
      { employee_id: 'e1', shift_id: 's-day', start_date: '2026-09-01', end_date: '2026-09-27' },
      { employee_id: 'e1', shift_id: 's-night', start_date: '2026-09-28', end_date: null },
    ]],
  ]);

  it('finds the shift covering a date, open-ended included', () => {
    expect(getShiftByEmployee('e1', '2026-09-27', assignmentMap, shiftMap)?.id).toBe('s-day');
    expect(getShiftByEmployee('e1', '2026-12-01', assignmentMap, shiftMap)?.id).toBe('s-night');
  });

  it('returns null without an assignment', () => {
    expect(getShiftByEmployee('e1', '2026-08-31', assignmentMap, shiftMap)).toBeNull();
    expect(getShiftByEmployee('e2', DATE, assignmentMap, shiftMap)).toBeNull();
  });

  it('only approved leave of the same employee counts', () => {
    const leaves = [
      { employee_id: 'e1', start_date: DATE, end_date: DATE, status: 'pending' },
      { employee_id: 'e2', start_date: DATE, end_date: DATE, status: 'approved' },
    ];
    expect(findLeave(leaves, 'e1', DATE)).toBeUndefined();
    expect(findLeave(leaves, 'e2', DATE)).toBeDefined();
  });

  it('matches an OT request by employee and date', () => {
    const requests = [{ employee_id: 'e1', request_date: DATE, minutes: 60 }];
    expect(findOtRequest(requests, 'e1', DATE)?.minutes).toBe(60);
    expect(findOtRequest(requests, 'e1', '2026-09-29')).toBeUndefined();
  });
});

describe('calculateDaily weekly day off', () => {
  it('is a day off, not an absence, when nobody scanned', () => {
    const result = calculateDaily({ ...base, shift: dayShift, weeklyOff: true });
    expect(result.status).toBe('day_off');
    expect(result.note).toBe('');
  });

  it('still counts the hours of someone who came in', () => {
    const result = calculateDaily({
      ...base,
      shift: dayShift,
      weeklyOff: true,
      log: { check_in: at('08:00'), check_out: at('17:00') },
    });
    expect(result.status).toBe('normal');
    expect(result.workHours).toBe('8.00');
  });

  it('leave and holidays still come first', () => {
    expect(calculateDaily({ ...base, shift: dayShift, weeklyOff: true, holiday: true }).status).toBe('holiday');
  });
});
