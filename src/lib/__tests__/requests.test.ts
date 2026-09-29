import { describe, expect, it } from 'vitest';
import {
  canDecideRequest,
  clockMinutesBetween,
  overlapsExisting,
  validateLeaveRequest,
  validateOtRequest,
  validateRejection,
} from '../requests';

describe('clockMinutesBetween', () => {
  it('measures same-day spans', () => {
    expect(clockMinutesBetween('17:00', '19:30')).toBe(150);
  });

  it('measures spans across midnight', () => {
    // Regression: 22:00 to 02:00 used to be saved as 0 minutes.
    expect(clockMinutesBetween('22:00', '02:00')).toBe(240);
    expect(clockMinutesBetween('23:30', '00:15')).toBe(45);
  });

  it('is 0 for equal or malformed times', () => {
    expect(clockMinutesBetween('08:00', '08:00')).toBe(0);
    expect(clockMinutesBetween('', '08:00')).toBe(0);
    expect(clockMinutesBetween('25:00', '08:00')).toBe(0);
    expect(clockMinutesBetween(null, undefined)).toBe(0);
  });
});

describe('overlapsExisting', () => {
  const existing = [
    { start_date: '2026-10-05', end_date: '2026-10-07', status: 'approved' },
    { start_date: '2026-10-20', end_date: '2026-10-20', status: 'rejected' },
    { start_date: '2026-10-25', end_date: '2026-10-26', status: 'pending' },
  ];

  it('detects shared days including the edges', () => {
    expect(overlapsExisting(existing, '2026-10-07', '2026-10-09')).toBe(true);
    expect(overlapsExisting(existing, '2026-10-01', '2026-10-05')).toBe(true);
    expect(overlapsExisting(existing, '2026-10-24', '2026-10-25')).toBe(true);
  });

  it('ignores rejected and cancelled requests', () => {
    expect(overlapsExisting(existing, '2026-10-20', '2026-10-20')).toBe(false);
    expect(overlapsExisting([{ start_date: '2026-10-01', end_date: '2026-10-02', status: 'Cancelled' }], '2026-10-01', '2026-10-01')).toBe(false);
  });

  it('passes adjacent ranges', () => {
    expect(overlapsExisting(existing, '2026-10-08', '2026-10-10')).toBe(false);
    expect(overlapsExisting([], '2026-10-08', '2026-10-10')).toBe(false);
  });
});

describe('validateLeaveRequest', () => {
  it('accepts a normal request', () => {
    expect(validateLeaveRequest({ start_date: '2026-10-02', end_date: '2026-10-05' })).toBeNull();
  });

  it('rejects malformed dates', () => {
    expect(validateLeaveRequest({ start_date: '', end_date: '2026-10-05' })).toBe('requests.invalidDate');
    expect(validateLeaveRequest({ start_date: '2026-02-30', end_date: '2026-03-01' })).toBe('requests.invalidDate');
  });

  it('rejects an end before the start', () => {
    expect(validateLeaveRequest({ start_date: '2026-10-05', end_date: '2026-10-02' })).toBe('requests.endBeforeStart');
  });

  it('allows half-day leave on a single day only', () => {
    expect(validateLeaveRequest({ start_date: '2026-10-02', end_date: '2026-10-02', is_half_day: true })).toBeNull();
    expect(validateLeaveRequest({ start_date: '2026-10-02', end_date: '2026-10-03', is_half_day: true })).toBe('requests.halfDaySingleDay');
  });

  it('rejects a clash with existing leave', () => {
    const existing = [{ start_date: '2026-10-05', end_date: '2026-10-05', status: 'pending' }];
    expect(validateLeaveRequest({ start_date: '2026-10-02', end_date: '2026-10-05' }, existing)).toBe('requests.overlap');
  });
});

describe('validateOtRequest', () => {
  it('accepts same-day and overnight overtime', () => {
    expect(validateOtRequest({ request_date: '2026-09-28', start_time: '17:00', end_time: '19:30' })).toBeNull();
    expect(validateOtRequest({ request_date: '2026-09-28', start_time: '22:00', end_time: '02:00' })).toBeNull();
  });

  it('rejects bad input', () => {
    expect(validateOtRequest({ request_date: '', start_time: '17:00', end_time: '19:30' })).toBe('requests.invalidDate');
    expect(validateOtRequest({ request_date: '2026-09-28', start_time: '', end_time: '19:30' })).toBe('requests.invalidTime');
    expect(validateOtRequest({ request_date: '2026-09-28', start_time: '17:00', end_time: '17:00' })).toBe('requests.zeroDuration');
  });
});

describe('canDecideRequest', () => {
  const base = { canEdit: true, status: 'pending', requestEmployeeId: 'e1', deciderEmployeeId: 'e2' };

  it('lets an approver decide a pending request of someone else', () => {
    expect(canDecideRequest(base)).toBe(true);
    expect(canDecideRequest({ ...base, deciderEmployeeId: null })).toBe(true);
  });

  it('never lets anyone decide their own request', () => {
    expect(canDecideRequest({ ...base, deciderEmployeeId: 'e1' })).toBe(false);
  });

  it('requires the permission and a pending status', () => {
    expect(canDecideRequest({ ...base, canEdit: false })).toBe(false);
    expect(canDecideRequest({ ...base, status: 'approved' })).toBe(false);
    expect(canDecideRequest({ ...base, status: 'rejected' })).toBe(false);
  });
});

describe('validateRejection', () => {
  it('requires a real reason', () => {
    expect(validateRejection('เอกสารแนบไม่ครบ')).toBeNull();
    expect(validateRejection('  ')).toBe('requests.reasonRequired');
    expect(validateRejection('')).toBe('requests.reasonRequired');
    expect(validateRejection(undefined)).toBe('requests.reasonRequired');
  });
});
