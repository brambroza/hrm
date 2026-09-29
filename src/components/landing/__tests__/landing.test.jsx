import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ProductMock from '../ProductMock';
import { COMPARE, DAILY_STEPS, MODULES, TOUR } from '../data';
import { MOCK_EXCEPTIONS, MOCK_EXCEPTION_FILTERS, MOCK_PAYROLL_LINES, MOCK_SHIFT_DAYS } from '../mockData';

/** Parse a figure such as '1,757.81' or '−750.00'. */
const amount = (text) => Number(text.replace(/,/g, '').replace('−', '-'));

describe('ProductMock', () => {
  it.each(TOUR.map((item) => item.id))('renders the %s screen', (variant) => {
    const html = renderToStaticMarkup(<ProductMock variant={variant} />);
    expect(html).toContain('GoAlong HR');
    // Every screen says its figures are sample data.
    expect(html).toContain('ข้อมูลตัวอย่าง');
  });

  it('falls back to the inbox for an unknown screen', () => {
    const html = renderToStaticMarkup(<ProductMock variant="nope" />);
    expect(html).toContain('ต้องตัดสินใจ');
    expect(html).toContain(MOCK_EXCEPTIONS[0].name);
  });

  it('shows where the overtime figure comes from', () => {
    const html = renderToStaticMarkup(<ProductMock variant="payroll" />);
    expect(html).toContain('1,757.81');
    expect(html).toContain('ออก 19:32 กะสิ้นสุด 17:00');
  });
});

describe('sample data is internally consistent', () => {
  it('payroll lines add up to the stated total', () => {
    const parts = MOCK_PAYROLL_LINES.filter((line) => !line.total).map((line) => amount(line.amount));
    const total = amount(MOCK_PAYROLL_LINES.find((line) => line.total).amount);
    expect(Math.round(parts.reduce((a, b) => a + b, 0) * 100) / 100).toBe(total);
  });

  it('overtime equals hours x 1.5 x the hourly rate', () => {
    const hourly = 22500 / 30 / 8;
    expect(Math.round(hourly * 1.5 * 12.5 * 100) / 100).toBe(1757.81);
  });

  it('filter counts add up to the total shown', () => {
    const all = MOCK_EXCEPTION_FILTERS.find((f) => f.id === 'all').count;
    const rest = MOCK_EXCEPTION_FILTERS.filter((f) => f.id !== 'all').reduce((sum, f) => sum + f.count, 0);
    expect(rest).toBe(all);
  });

  it('every sample exception belongs to a filter', () => {
    const ids = MOCK_EXCEPTION_FILTERS.map((f) => f.id);
    MOCK_EXCEPTIONS.forEach((row) => expect(ids).toContain(row.type));
  });

  it('1 October 2026 is a Thursday and Sundays fall on the 4th and 11th', () => {
    expect(new Date(Date.UTC(2026, 9, 1)).getUTCDay()).toBe(4);
    expect(MOCK_SHIFT_DAYS[0].name).toBe('พฤ');
    expect(MOCK_SHIFT_DAYS.filter((d) => d.name === 'อา').map((d) => d.n)).toEqual([4, 11]);
  });
});

describe('landing content stays honest', () => {
  it('the comparison keeps rows that favour the rented model', () => {
    expect(COMPARE.some((row) => row.better === 'theirs')).toBe(true);
    expect(COMPARE.some((row) => row.better === 'ours')).toBe(true);
    COMPARE.forEach((row) => expect(['ours', 'theirs', 'depends']).toContain(row.better));
  });

  it('the comparison names no vendor', () => {
    const text = JSON.stringify(COMPARE).toLowerCase();
    ['empeo', 'humansoft', 'bytehr'].forEach((vendor) => expect(text).not.toContain(vendor));
  });

  it('every module carries a known status', () => {
    MODULES.forEach((m) => expect(['พร้อมใช้', 'ส่งมอบในโครงการ']).toContain(m.status));
  });

  it('daily work is three steps', () => {
    expect(DAILY_STEPS).toHaveLength(3);
  });
});
