import { describe, expect, it } from 'vitest';
import { formatBaht, roundBaht, sumBaht } from '../money';

describe('roundBaht', () => {
  it('rounds half up at the satang', () => {
    expect(roundBaht(1.005)).toBe(1.01);
    expect(roundBaht(1757.8125)).toBe(1757.81);
    expect(roundBaht(351.5625)).toBe(351.56);
    expect(roundBaht(2.675)).toBe(2.68);
  });

  it('handles negatives symmetrically', () => {
    expect(roundBaht(-1.005)).toBe(-1.01);
    expect(roundBaht(-750)).toBe(-750);
  });

  it('reads numeric strings from the database', () => {
    expect(roundBaht('22500.00')).toBe(22500);
  });

  it('returns 0 for unreadable input', () => {
    expect(roundBaht(null)).toBe(0);
    expect(roundBaht(undefined)).toBe(0);
    expect(roundBaht('abc')).toBe(0);
    expect(roundBaht(Infinity)).toBe(0);
  });
});

describe('sumBaht', () => {
  it('does not drift', () => {
    expect(sumBaht([0.1, 0.2])).toBe(0.3);
    expect(sumBaht([22500, 1757.81])).toBe(24257.81);
  });

  it('ignores unreadable entries and handles empty lists', () => {
    expect(sumBaht([100, null, 'x', '50.50'])).toBe(150.5);
    expect(sumBaht([])).toBe(0);
  });
});

describe('formatBaht', () => {
  it('always shows two decimals and separators', () => {
    expect(formatBaht(24257.81)).toBe('24,257.81');
    expect(formatBaht(22500)).toBe('22,500.00');
    expect(formatBaht('0')).toBe('0.00');
    expect(formatBaht(-750)).toBe('-750.00');
  });
});
