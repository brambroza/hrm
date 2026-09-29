import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// The helpers module pulls in the Supabase client, which needs browser env vars.
vi.mock('@/utils/helpers', () => ({
  formatThaiDateTime: () => '29/09/2026 09:00:00',
  getThaiISODate: () => '2026-09-29',
}));

const { buildPayrollSlipPdf, buildPayrollReportPdf } = await import('../payrollPdfService');
const { THAI_FONT } = await import('@/lib/pdfThaiFont');

/** Read a font from public/fonts the way the browser fetches it. */
const loadFont = async (file) => {
  const buffer = await readFile(path.resolve(import.meta.dirname, '../../../public/fonts', file));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

const employee = { name: 'อนันต์ ศรีสุข', employee_id: 'EMP-0088', department: 'ผลิต 1', position: 'พนักงานฝ่ายผลิต' };
const company = { name: 'บริษัท ตัวอย่าง จำกัด', address: 'กรุงเทพมหานคร', phone: '02-000-0000', email: 'hr@example.co.th' };
const payroll = {
  periodName: 'งวดเดือนกันยายน 2569',
  basic_salary: 22500,
  allowances: [{ name: 'OT วันทำงาน 1.5 เท่า', amount: 1757.8125 }],
  total_income: 24257.81,
  deductions: [],
  total_deductions: 0,
  net_salary: 24257.81,
};

describe('buildPayrollSlipPdf', () => {
  it('embeds the Thai font and uses it', async () => {
    const doc = await buildPayrollSlipPdf(payroll, employee, company, loadFont);
    expect(doc.getFontList()[THAI_FONT]).toEqual(expect.arrayContaining(['normal', 'bold']));
    expect(doc.getFont().fontName).toBe(THAI_FONT);

    const pdf = doc.output();
    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf).toContain('/FontFile2');
  });

  it('copes with missing optional data', async () => {
    const doc = await buildPayrollSlipPdf({ net_salary: null }, {}, {}, loadFont);
    expect(doc.getNumberOfPages()).toBe(1);
  });
});

describe('buildPayrollReportPdf', () => {
  it('builds the summary with Thai group names', async () => {
    const report = {
      summary: { totalEmployees: 2, totalBaseSalary: 40000, totalIncome: 42000, totalDeductions: 1500, totalNetSalary: 40500 },
      byDepartment: { 'ผลิต 1': { count: 2, totalSalary: 42000, totalDeductions: 1500, totalNet: 40500 } },
      byType: { 'รายเดือน': { count: 2, totalSalary: 42000, totalDeductions: 1500, totalNet: 40500 } },
    };
    const doc = await buildPayrollReportPdf(report, 'งวดเดือนกันยายน 2569', loadFont);
    expect(doc.getFontList()[THAI_FONT]).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
