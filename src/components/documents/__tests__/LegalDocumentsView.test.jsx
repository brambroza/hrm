import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LegalDocumentsView from '../LegalDocumentsView';
import { LEGAL_DOCUMENTS, LEGAL_DISCLAIMER } from '@/lib/legalDocuments/catalogue';
import { buildEmployeeRegister, buildWageRecord, buildWorkCertificate } from '@/lib/legalDocuments/builders';

// Without an i18n instance the hook returns the key, which is what the assertions look for.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key) }),
}));

const company = { name: 'บริษัท ตัวอย่าง จำกัด' };
const employee = {
  id: 'e1', employee_id: 'EMP-0031', name_th: 'สมชาย ใจดี', position: 'พนักงานฝ่ายผลิต', start_date: '2024-03-01', salary: 22500,
};
const line = { employee, basic_salary: 22500, total_income: 22500, total_deductions: 0, net_salary: 22500 };

/** Render the screen with sensible defaults. */
const render = (overrides = {}) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <LegalDocumentsView
        documents={LEGAL_DOCUMENTS}
        register={buildEmployeeRegister([employee], company, '2026-09-29')}
        periods={[{ id: 'p1', name: 'กันยายน 2569' }]}
        periodId="p1"
        wageRecord={buildWageRecord([line], 'กันยายน 2569', company)}
        employees={[{ id: 'e1', label: 'EMP-0031 สมชาย ใจดี' }]}
        employeeId="e1"
        certificate={buildWorkCertificate(employee, company, { issuedOn: '2026-09-29' })}
        signatory={{ name: '', title: '' }}
        canPayroll
        busy={null}
        onPeriod={() => {}}
        onEmployee={() => {}}
        onSignatory={() => {}}
        onDownload={() => {}}
        {...overrides}
      />
    </MemoryRouter>,
  );

describe('LegalDocumentsView', () => {
  it('lists every document with its law and status, and the disclaimer', () => {
    const html = render();
    LEGAL_DOCUMENTS.forEach((document) => {
      expect(html).toContain(document.name);
      expect(html).toContain(document.basis);
    });
    expect(html).toContain('ออกจากระบบได้');
    expect(html).toContain('อยู่ในแผนพัฒนา');
    expect(html).toContain('จัดทำเอง');
    expect(html).toContain(LEGAL_DISCLAIMER);
  });

  it('says which required register fields are missing and links to the fix', () => {
    const html = render();
    expect(html).toContain('documents.register.missingItem {&quot;label&quot;:&quot;เพศ&quot;,&quot;count&quot;:1}');
    expect(html).toContain('href="/employees"');
  });

  it('shows no register warning when nothing is missing', () => {
    const full = { ...employee, gender: 'male', nationality: 'ไทย', birthdate: '1990-05-20', address: 'ระยอง' };
    const html = render({ register: buildEmployeeRegister([full], company, '2026-09-29') });
    expect(html).not.toContain('documents.register.missing');
  });

  it('warns that overtime columns are blank', () => {
    expect(render()).toContain('documents.wage.blank');
  });

  it('hides pay figures from someone without payroll permission', () => {
    const html = render({ canPayroll: false });
    expect(html).toContain('documents.wage.noPermission');
    expect(html).not.toContain('documents.wage.summary');
    expect(html).not.toContain('id="documents-period"');
  });

  it('previews the certificate, and blocks download when it has problems', () => {
    expect(render()).toContain('สมชาย ใจดี เป็นพนักงานของ บริษัท ตัวอย่าง จำกัด');
    const broken = render({ certificate: buildWorkCertificate({ ...employee, position: '' }, company, { issuedOn: '2026-09-29' }) });
    expect(broken).toContain('ไม่มีตำแหน่งงาน');
    expect(broken).not.toContain('เป็นพนักงานของ');
  });

  it('disables downloads when there is nothing to print', () => {
    const html = render({
      register: buildEmployeeRegister([], company, '2026-09-29'),
      wageRecord: buildWageRecord([], 'x', company),
      certificate: null,
      employeeId: '',
    });
    expect(html.match(/disabled=""/g)?.length).toBe(3);
    expect(html).not.toContain('documents.wage.blank');
  });
});
