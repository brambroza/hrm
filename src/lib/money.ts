/**
 * @file Money helpers. Amounts are Thai baht with two decimals (satang).
 */

/**
 * Round to the satang, half up, without binary floating point drift.
 * `1.005` is stored as 1.00499…, so `Math.round(1.005 * 100) / 100` gives 1.00;
 * shifting the decimal point as text avoids that.
 * @param value - Amount in baht.
 * @returns The amount rounded to two decimals; 0 for unreadable input.
 */
export const roundBaht = (value: unknown): number => {
  const amount = typeof value === 'string' ? Number(value) : (value as number);
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return 0;
  const sign = amount < 0 ? -1 : 1;
  const shifted = Math.round(Number(`${Math.abs(amount)}e2`));
  return (sign * shifted) / 100;
};

/**
 * Format an amount for display: thousands separators, always two decimals.
 * @param value - Amount in baht.
 * @returns Text such as `24,257.81`.
 */
export const formatBaht = (value: unknown): string =>
  roundBaht(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Add amounts and round once at the end.
 * @param values - Amounts in baht; unreadable entries count as 0.
 * @returns The total, rounded to the satang.
 */
export const sumBaht = (values: unknown[]): number => {
  const satang = values.reduce<number>((total, value) => total + Math.round(roundBaht(value) * 100), 0);
  return satang / 100;
};
