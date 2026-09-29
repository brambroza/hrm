import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildDateRange,
  formatBangkokTime,
  hoursBetween,
  isClockTime,
  isIsoDate,
  minutesBetween,
  toBangkokTimestamp,
  toShiftPunchTimestamp,
} from '../thaiTime';

describe('isIsoDate', () => {
  it('accepts real calendar dates', () => {
    expect(isIsoDate('2026-09-28')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
  });

  it('rejects impossible dates and other shapes', () => {
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('28/09/2026')).toBe(false);
    expect(isIsoDate('')).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });
});

describe('isClockTime', () => {
  it('accepts 24-hour times and rejects the rest', () => {
    expect(isClockTime('00:00')).toBe(true);
    expect(isClockTime('23:59')).toBe(true);
    expect(isClockTime('24:00')).toBe(false);
    expect(isClockTime('25:10')).toBe(false);
    expect(isClockTime('8:00')).toBe(false);
    expect(isClockTime(undefined)).toBe(false);
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('throws on a malformed date', () => {
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError);
  });
});

describe('buildDateRange', () => {
  it('returns the requested day itself for a one-day range', () => {
    // Regression: the range used to come back one day early (2026-09-27).
    expect(buildDateRange('2026-09-28', '2026-09-28')).toEqual(['2026-09-28']);
  });

  it('includes both ends', () => {
    expect(buildDateRange('2026-09-29', '2026-10-02')).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
  });

  it('covers a whole month', () => {
    const september = buildDateRange('2026-09-01', '2026-09-30');
    expect(september).toHaveLength(30);
    expect(september[0]).toBe('2026-09-01');
    expect(september[29]).toBe('2026-09-30');
  });

  it('is empty when the end is before the start', () => {
    expect(buildDateRange('2026-09-28', '2026-09-27')).toEqual([]);
  });

  it('throws on malformed bounds', () => {
    expect(() => buildDateRange('', '2026-09-28')).toThrow(RangeError);
    expect(() => buildDateRange('2026-09-28', 'tomorrow')).toThrow(RangeError);
  });
});

describe('toBangkokTimestamp', () => {
  it('always writes the Thai offset', () => {
    expect(toBangkokTimestamp('2026-09-28', '08:00')).toBe('2026-09-28T08:00:00+07:00');
  });

  it('points at 01:00 UTC for 08:00 Thai time', () => {
    expect(new Date(toBangkokTimestamp('2026-09-28', '08:00')).toISOString()).toBe('2026-09-28T01:00:00.000Z');
  });

  it('rejects malformed input', () => {
    expect(() => toBangkokTimestamp('2026-09-28', '25:10')).toThrow(RangeError);
    expect(() => toBangkokTimestamp('28-09-2026', '08:00')).toThrow(RangeError);
  });
});

describe('toShiftPunchTimestamp', () => {
  it('keeps a same-day punch on the work date', () => {
    expect(toShiftPunchTimestamp('2026-09-28', '17:00', '08:00')).toBe('2026-09-28T17:00:00+07:00');
  });

  it('dates a punch after midnight on the following day', () => {
    expect(toShiftPunchTimestamp('2026-09-28', '06:04', '22:00')).toBe('2026-09-29T06:04:00+07:00');
  });

  it('keeps the first punch itself on the work date', () => {
    expect(toShiftPunchTimestamp('2026-09-28', '22:00', '22:00')).toBe('2026-09-28T22:00:00+07:00');
  });
});

describe('minutesBetween and hoursBetween', () => {
  it('measures an overnight shift as eight hours', () => {
    const start = toBangkokTimestamp('2026-09-28', '22:00');
    const end = toShiftPunchTimestamp('2026-09-28', '06:00', '22:00');
    expect(minutesBetween(start, end)).toBe(480);
    expect(hoursBetween(start, end)).toBe(8);
  });

  it('never goes negative and tolerates missing values', () => {
    expect(minutesBetween('2026-09-28T17:00:00+07:00', '2026-09-28T08:00:00+07:00')).toBe(0);
    expect(minutesBetween(null, '2026-09-28T08:00:00+07:00')).toBe(0);
    expect(minutesBetween('not a date', '2026-09-28T08:00:00+07:00')).toBe(0);
    expect(hoursBetween(undefined, undefined)).toBe(0);
  });
});

describe('formatBangkokTime', () => {
  it('shows Thai wall-clock time whatever the machine zone', () => {
    expect(formatBangkokTime('2026-09-28T01:00:00Z')).toBe('08:00:00');
  });

  it('is empty for a missing value', () => {
    expect(formatBangkokTime(null)).toBe('');
  });
});
