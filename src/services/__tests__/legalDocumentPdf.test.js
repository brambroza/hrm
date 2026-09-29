import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildEmployeeRegisterPdf, buildWageRecordPdf, buildWorkCertificatePdf, fileSafe } from '../legalDocumentPdf';
import { buildEmployeeRegister, buildWageRecord, buildWorkCertificate } from '@/lib/legalDocuments/builders';

/** Read the font from the repository instead of fetching it. */
const loadFont = async (file) => {
  const data = fs.readFileSync(path.resolve(import.meta.dirname, '../../../public/fonts', file));
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
};

const company = { name: 'บริษัท ตัวอย่าง จำกัด', address: 'ระยอง', phone: '02-000-0000' };
const staff = Array.from({ length: 60 }, (_, index) => ({
  id: `e${index}`,
  employee_id: `EMP-${String(index).padStart(4, '0')}`,
  name_th: `พนักงาน ทดสอบ${index}`,
  position: 'พนักงานฝ่ายผลิต',
  department: 'ผลิต 1',
  start_date: '2024-03-01',
  salary: 15000 + index,
}));

describe('legal document PDFs', () => {
  it('prints the register across pages in landscape', async () => {
    const doc = await buildEmployeeRegisterPdf(buildEmployeeRegister(staff, company, '2026-09-29'), loadFont);
    expect(doc.internal.getNumberOfPages()).toBeGreaterThan(1);
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(doc.internal.pageSize.getHeight());
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(10000);
  });

  it('prints the wage record', async () => {
    const lines = staff.map((employee) => ({ employee, basic_salary: employee.salary, total_income: employee.salary, total_deductions: 0, net_salary: employee.salary }));
    const doc = await buildWageRecordPdf(buildWageRecord(lines, 'กันยายน 2569', company), loadFont);
    expect(doc.internal.getNumberOfPages()).toBeGreaterThan(1);
  });

  it('prints an empty register without failing', async () => {
    const doc = await buildEmployeeRegisterPdf(buildEmployeeRegister([], company, '2026-09-29'), loadFont);
    expect(doc.internal.getNumberOfPages()).toBe(1);
  });

  it('prints the certificate on one portrait page', async () => {
    const certificate = buildWorkCertificate(staff[0], company, { issuedOn: '2026-09-29', signatoryName: 'สุรชัย มั่นคง' });
    const doc = await buildWorkCertificatePdf(certificate, company, loadFont);
    expect(doc.internal.getNumberOfPages()).toBe(1);
    expect(doc.internal.pageSize.getHeight()).toBeGreaterThan(doc.internal.pageSize.getWidth());
  });

  it('refuses a certificate that has problems', async () => {
    const certificate = buildWorkCertificate({ id: 'x' }, company, { issuedOn: '2026-09-29' });
    await expect(buildWorkCertificatePdf(certificate, company, loadFont)).rejects.toThrow('ไม่มีชื่อพนักงาน');
  });

  it('makes file names safe', () => {
    expect(fileSafe('งวด 9/2569: ก.ย.')).toBe('งวด_9_2569_ก.ย.');
    expect(fileSafe(null)).toBe('');
  });
});
