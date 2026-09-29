import { describe, expect, it } from 'vitest';
import {
  ageOn, buildEmployeeRegister, buildWageRecord, buildWorkCertificate, serviceLength, serviceLengthText, thaiLongDate, wrapThai,
} from '../builders';
import { LEGAL_DOCUMENTS, STATUS_LABELS, GROUP_LABELS } from '../catalogue';

const company = { name: 'บริษัท ตัวอย่าง จำกัด', tax_id: '0105500000011', address: 'ระยอง' };

const somchai = {
  id: 'e1', employee_id: 'EMP-0031', name_th: 'สมชาย ใจดี', national_id: '1234567890121', nationality: 'ไทย',
  gender: 'male', birthdate: '1990-05-20', address: '12 หมู่ 3 ระยอง', department: 'ผลิต 1', position: 'พนักงานฝ่ายผลิต',
  employment_type: 'monthly', start_date: '2024-03-01', end_date: null, salary: '22500.00', status: 'active',
};
const wipa = {
  id: 'e2', employee_id: 'DAY-0107', name: 'วิภา ทองคำ', nationality: 'ไทย', department: 'ผลิต 2', position: 'พนักงานบรรจุ',
  employment_type: 'daily', start_date: '2023-01-16', end_date: '2026-08-31', salary: 400, status: 'resigned',
};

describe('thaiLongDate', () => {
  it('writes the date in the Buddhist era', () => {
    expect(thaiLongDate('2026-09-29')).toBe('29 กันยายน 2569');
    expect(thaiLongDate('2026-01-01T00:00:00+07:00')).toBe('1 มกราคม 2569');
  });

  it('is empty for a missing or invalid date', () => {
    expect(thaiLongDate(null)).toBe('');
    expect(thaiLongDate('2026-02-30')).toBe('');
    expect(thaiLongDate('เมื่อวาน')).toBe('');
  });
});

describe('serviceLength', () => {
  it('counts the last day worked', () => {
    expect(serviceLength('2024-03-01', '2026-02-28')).toEqual({ years: 2, months: 0, days: 0 });
    expect(serviceLength('2026-09-01', '2026-09-30')).toEqual({ years: 0, months: 1, days: 0 });
    expect(serviceLength('2026-09-29', '2026-09-29')).toEqual({ years: 0, months: 0, days: 1 });
  });

  it('handles parts of months and leap years', () => {
    expect(serviceLength('2023-01-16', '2026-08-31')).toEqual({ years: 3, months: 7, days: 16 });
    expect(serviceLength('2024-02-29', '2025-02-28')).toEqual({ years: 1, months: 0, days: 0 });
  });

  it('is null when the dates cannot be used', () => {
    expect(serviceLength(null, '2026-01-01')).toBeNull();
    expect(serviceLength('2026-01-02', '2026-01-01')).toBeNull();
    expect(serviceLength('2026-13-01', '2026-12-01')).toBeNull();
  });

  it('is written without the zero parts', () => {
    expect(serviceLengthText({ years: 2, months: 0, days: 0 })).toBe('2 ปี');
    expect(serviceLengthText({ years: 3, months: 7, days: 16 })).toBe('3 ปี 7 เดือน 16 วัน');
    expect(serviceLengthText({ years: 0, months: 0, days: 0 })).toBe('0 วัน');
    expect(serviceLengthText(null)).toBe('');
  });
});

describe('ageOn', () => {
  it('counts whole years', () => {
    expect(ageOn('1990-05-20', '2026-05-19')).toBe(35);
    expect(ageOn('1990-05-20', '2026-05-20')).toBe(36);
    expect(ageOn(null, '2026-05-20')).toBeNull();
    expect(ageOn('2030-01-01', '2026-05-20')).toBeNull();
  });
});

describe('buildEmployeeRegister', () => {
  const register = buildEmployeeRegister([somchai, wipa], company, '2026-09-29');

  it('lists everyone who worked there, those who left included, oldest first', () => {
    expect(register.rows.map((row) => row.name)).toEqual(['วิภา ทองคำ', 'สมชาย ใจดี']);
    expect(register.rows.map((row) => row.no)).toEqual(['1', '2']);
    expect(register.rows[0].end).toBe('31 สิงหาคม 2569');
    expect(register.rows[1].end).toBe('');
  });

  it('fills what is stored', () => {
    expect(register.rows[1]).toMatchObject({
      code: 'EMP-0031',
      gender: 'ชาย',
      nationality: 'ไทย',
      birth: '20 พฤษภาคม 2533 (36 ปี)',
      address: '12 หมู่ 3 ระยอง',
      start: '1 มีนาคม 2567',
      position: 'พนักงานฝ่ายผลิต / ผลิต 1',
      wage: '22,500.00',
      wageType: 'รายเดือน',
    });
    expect(register.rows[0]).toMatchObject({ wage: '400.00', wageType: 'รายวัน' });
    expect(register.company).toBe('บริษัท ตัวอย่าง จำกัด');
    expect(register.asOf).toBe('29 กันยายน 2569');
  });

  it('leaves blank what is not stored, and says how much is missing', () => {
    expect(register.rows[0]).toMatchObject({ gender: '', birth: '', address: '' });
    expect(register.missing).toEqual([
      { key: 'gender', label: 'เพศ', count: 1 },
      { key: 'birth', label: 'วันเดือนปีเกิด หรืออายุ', count: 1 },
      { key: 'address', label: 'ที่อยู่ปัจจุบัน', count: 1 },
    ]);
  });

  it('does not print a wage of zero or an unknown gender', () => {
    const odd = buildEmployeeRegister([{ ...somchai, salary: 0, gender: 'x' }, { ...somchai, id: 'e9', salary: null }], company, '2026-09-29');
    expect(odd.rows.map((row) => row.wage)).toEqual(['', '']);
    expect(odd.rows[0].gender).toBe('');
    expect(odd.missing.find((entry) => entry.key === 'wage')?.count).toBe(2);
  });

  it('reads gender, birthdate and address from other_info when the row has no such column', () => {
    const extra = buildEmployeeRegister(
      [{ ...wipa, other_info: { gender: 'female', birthdate: '1995-12-01', address: ' 9 ซอย 4 ระยอง ' } }],
      company,
      '2026-09-29',
    );
    expect(extra.rows[0]).toMatchObject({ gender: 'หญิง', birth: '1 ธันวาคม 2538 (30 ปี)', address: '9 ซอย 4 ระยอง' });
    expect(extra.missing).toEqual([]);
  });

  it('reports nothing missing when every required field is there', () => {
    expect(buildEmployeeRegister([somchai], company, '2026-09-29').missing).toEqual([]);
  });

  it('copes with no employees', () => {
    const empty = buildEmployeeRegister([], {}, '2026-09-29');
    expect(empty.rows).toEqual([]);
    expect(empty.missing).toEqual([]);
    expect(empty.company).toBe('');
  });
});

describe('buildWageRecord', () => {
  const lines = [
    { employee: somchai, basic_salary: '22500.00', total_income: '23000.00', total_deductions: '750.00', net_salary: '22250.00' },
    { employee: wipa, basic_salary: 10400, total_income: 10400, total_deductions: 0, net_salary: 10400 },
  ];
  const record = buildWageRecord(lines, ' งวดเดือนกันยายน 2569 ', company);

  it('has a row per employee, in code order, with a place to sign', () => {
    expect(record.rows.map((row) => row.code)).toEqual(['DAY-0107', 'EMP-0031']);
    expect(record.columns[record.columns.length - 1].label).toBe('ลายมือชื่อผู้รับเงิน');
    expect(record.rows[0].signature).toBe('');
    expect(record.period).toBe('งวดเดือนกันยายน 2569');
  });

  it('shows the wage, what came on top of it, deductions and net pay', () => {
    expect(record.rows[1]).toMatchObject({ wage: '22,500.00', other: '500.00', deductions: '750.00', net: '22,250.00' });
    expect(record.totals).toEqual({ wage: '32,900.00', other: '500.00', deductions: '750.00', net: '32,650.00' });
  });

  it('leaves overtime and holiday pay blank rather than showing zero', () => {
    record.rows.forEach((row) => {
      expect(row.overtime).toBe('');
      expect(row.holiday).toBe('');
      expect(row.days).toBe('');
    });
    expect(record.unavailable).toEqual(['วันและเวลาทำงาน', 'ค่าล่วงเวลา', 'ค่าทำงานในวันหยุด']);
  });

  it('counts lines that do not add up', () => {
    expect(record.inconsistent).toBe(0);
    const bad = buildWageRecord([{ ...lines[0], net_salary: 99999 }], 'x', company);
    expect(bad.inconsistent).toBe(1);
  });

  it('copes with an empty period and missing figures', () => {
    const empty = buildWageRecord([], 'x', company);
    expect(empty.rows).toEqual([]);
    expect(empty.totals.net).toBe('0.00');
    const blank = buildWageRecord([{ employee: null }], 'x', company);
    expect(blank.rows[0]).toMatchObject({ name: '', wage: '0.00', net: '0.00' });
  });
});

describe('buildWorkCertificate', () => {
  it('certifies someone who left, with the period and the work done', () => {
    const certificate = buildWorkCertificate(wipa, company, { issuedOn: '2026-09-29', signatoryName: 'สุรชัย มั่นคง', signatoryTitle: 'ผู้จัดการฝ่ายบุคคล' });
    expect(certificate.problems).toEqual([]);
    expect(certificate.paragraphs[0]).toBe(
      'หนังสือฉบับนี้ให้ไว้เพื่อรับรองว่า วิภา ทองคำ ได้ทำงานกับ บริษัท ตัวอย่าง จำกัด ตั้งแต่วันที่ 16 มกราคม 2566 ถึงวันที่ 31 สิงหาคม 2569 รวมระยะเวลา 3 ปี 7 เดือน 16 วัน',
    );
    expect(certificate.paragraphs[1]).toBe('โดยปฏิบัติงานในตำแหน่ง พนักงานบรรจุ แผนกผลิต 2');
    expect(certificate.paragraphs[2]).toBe('ให้ไว้ ณ วันที่ 29 กันยายน 2569');
    expect(certificate.signatory).toEqual({ name: 'สุรชัย มั่นคง', title: 'ผู้จัดการฝ่ายบุคคล', company: 'บริษัท ตัวอย่าง จำกัด' });
  });

  it('certifies someone still employed, up to the day of issue', () => {
    const certificate = buildWorkCertificate(somchai, company, { issuedOn: '2026-09-29' });
    expect(certificate.paragraphs[0]).toContain('เป็นพนักงานของ บริษัท ตัวอย่าง จำกัด ตั้งแต่วันที่ 1 มีนาคม 2567 จนถึงปัจจุบัน');
    expect(certificate.paragraphs[0]).toContain('เลขประจำตัวประชาชน 1234567890121');
    expect(certificate.paragraphs[1]).toContain('ปัจจุบันปฏิบัติงาน');
    expect(certificate.signatory.title).toBe('ผู้มีอำนาจลงนาม');
  });

  it('never mentions pay or a reason for leaving', () => {
    const text = buildWorkCertificate(wipa, company, { issuedOn: '2026-09-29' }).paragraphs.join(' ');
    expect(text).not.toContain('400');
    expect(text).not.toMatch(/ค่าจ้าง|เงินเดือน|ลาออก|เลิกจ้าง/);
  });

  it('uses the passport number for someone without a national ID', () => {
    const certificate = buildWorkCertificate({ ...wipa, passport_number: 'MB123456' }, company, { issuedOn: '2026-09-29' });
    expect(certificate.paragraphs[0]).toContain('หนังสือเดินทางเลขที่ MB123456');
  });

  it('lists what stops it being issued', () => {
    const certificate = buildWorkCertificate(
      { id: 'x', start_date: null, end_date: '2026-13-40', position: ' ' },
      { name: '' },
      { issuedOn: 'today' },
    );
    expect(certificate.problems).toEqual([
      'ไม่มีชื่อพนักงาน',
      'ไม่มีชื่อบริษัท กรุณาตั้งค่าที่หน้าตั้งค่าเริ่มต้น',
      'ไม่มีวันที่เริ่มจ้าง',
      'วันที่ออกหนังสือไม่ถูกต้อง',
      'วันสิ้นสุดการจ้างไม่ถูกต้อง',
      'ไม่มีตำแหน่งงาน ซึ่งใช้ระบุลักษณะงานที่ทำ',
    ]);
  });

  it('refuses an end date before the start date', () => {
    const certificate = buildWorkCertificate({ ...wipa, end_date: '2022-01-01' }, company, { issuedOn: '2026-09-29' });
    expect(certificate.problems).toContain('วันสิ้นสุดการจ้างอยู่ก่อนวันที่เริ่มจ้าง');
  });
});

describe('wrapThai', () => {
  const measure = (piece: string) => piece.length;

  it('breaks Thai text that has no spaces', () => {
    const text = 'หนังสือฉบับนี้ให้ไว้เพื่อรับรองว่าพนักงานได้ทำงานกับบริษัทตั้งแต่วันที่เริ่มงานจนถึงปัจจุบัน';
    const lines = wrapThai(text, 30, measure);
    expect(lines.length).toBeGreaterThan(1);
    lines.forEach((line) => expect(line.length).toBeLessThanOrEqual(30));
    expect(lines.join('')).toBe(text);
  });

  it('keeps short text on one line and drops empty text', () => {
    expect(wrapThai('สั้น', 30, measure)).toEqual(['สั้น']);
    expect(wrapThai('   ', 30, measure)).toEqual([]);
  });

  it('never starts a line with a space', () => {
    wrapThai('คำแรก คำที่สอง คำที่สาม คำที่สี่ คำที่ห้า', 12, measure).forEach((line) => {
      expect(line.startsWith(' ')).toBe(false);
      expect(line.endsWith(' ')).toBe(false);
    });
  });
});

describe('catalogue', () => {
  it('has unique ids and a known status and group for every document', () => {
    expect(new Set(LEGAL_DOCUMENTS.map((doc) => doc.id)).size).toBe(LEGAL_DOCUMENTS.length);
    LEGAL_DOCUMENTS.forEach((doc) => {
      expect(Object.keys(STATUS_LABELS)).toContain(doc.status);
      expect(Object.keys(GROUP_LABELS)).toContain(doc.group);
      expect(doc.basis.length).toBeGreaterThan(5);
      expect(doc.timing.length).toBeGreaterThan(5);
    });
  });

  it('does not claim forms that depend on calculations the system lacks', () => {
    ['sso-contribution', 'pnd1', 'pnd1-kor', 'withholding-certificate', 'wcf'].forEach((id) => {
      expect(LEGAL_DOCUMENTS.find((doc) => doc.id === id)?.status, id).toBe('planned');
    });
  });

  it('quotes no rate that changes by announcement', () => {
    const text = JSON.stringify(LEGAL_DOCUMENTS);
    expect(text).not.toMatch(/\d+\s*%/);
    expect(text).not.toMatch(/15,000|17,500|750 บาท/);
  });
});
