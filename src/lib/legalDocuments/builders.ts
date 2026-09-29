/**
 * @file Turns stored records into the contents of statutory documents.
 * Pure: records in, rows and paragraphs out. Rendering to PDF or Excel is done
 * elsewhere.
 */
import { isIsoDate } from '../thaiTime';
import { formatBaht, roundBaht, sumBaht } from '../money';

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

/** Text printed where the system holds no value. Never a guess. */
export const BLANK = '';

export interface Company {
  name?: string | null;
  tax_id?: string | null;
  address?: string | null;
  phone?: string | null;
}

export interface EmployeeRecord {
  id: string;
  employee_id?: string | null;
  name?: string | null;
  name_th?: string | null;
  national_id?: string | null;
  passport_number?: string | null;
  nationality?: string | null;
  gender?: string | null;
  birthdate?: string | null;
  birth_date?: string | null;
  address?: string | null;
  department?: string | null;
  position?: string | null;
  employment_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  salary?: number | string | null;
  status?: string | null;
  /** Free-form extras; gender, birthdate and address are read from here when the row has no column for them. */
  other_info?: Record<string, unknown> | null;
}

/**
 * A date as written in Thai official documents, in the Buddhist era.
 * @param date - Date in `YYYY-MM-DD` form, or a timestamp starting with one.
 * @returns Text such as `29 กันยายน 2569`; empty when there is no valid date.
 */
export const thaiLongDate = (date?: string | null): string => {
  const day = typeof date === 'string' ? date.slice(0, 10) : '';
  if (!isIsoDate(day)) return BLANK;
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  return `${dayOfMonth} ${THAI_MONTHS[month - 1]} ${year + 543}`;
};

/**
 * Whole years, months and days between two dates, the end day included, as a
 * length of service is counted.
 * @param start - First day, `YYYY-MM-DD`.
 * @param end - Last day, `YYYY-MM-DD`.
 * @returns The parts, or null when a date is invalid or the end is before the start.
 */
export const serviceLength = (start?: string | null, end?: string | null): { years: number; months: number; days: number } | null => {
  if (!isIsoDate(start) || !isIsoDate(end) || end < start) return null;
  const [sy, sm, sd] = start.split('-').map(Number);
  const [y, m, d] = end.split('-').map(Number);
  // The last day worked counts, so measure up to the day after it.
  const after = new Date(Date.UTC(y, m - 1, d + 1));
  const ey = after.getUTCFullYear();
  const em = after.getUTCMonth() + 1;
  const ed = after.getUTCDate();

  let years = ey - sy;
  let months = em - sm;
  let days = ed - sd;
  if (days < 0) {
    months -= 1;
    days += new Date(Date.UTC(ey, em - 1, 0)).getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
};

/**
 * A length of service in words.
 * @param length - Parts from serviceLength.
 * @returns Text such as `2 ปี 3 เดือน`; zero parts are left out.
 */
export const serviceLengthText = (length: { years: number; months: number; days: number } | null): string => {
  if (!length) return BLANK;
  const parts = [
    length.years ? `${length.years} ปี` : '',
    length.months ? `${length.months} เดือน` : '',
    length.days ? `${length.days} วัน` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' ') : '0 วัน';
};

/**
 * Age in whole years on a given day.
 * @param birth - Date of birth, `YYYY-MM-DD`.
 * @param on - The day the age is wanted for.
 * @returns The age, or null when the dates are unusable.
 */
export const ageOn = (birth?: string | null, on?: string | null): number | null => {
  if (!isIsoDate(birth) || !isIsoDate(on) || on < birth) return null;
  const [by, bm, bd] = birth.split('-').map(Number);
  const [oy, om, od] = on.split('-').map(Number);
  return oy - by - (om < bm || (om === bm && od < bd) ? 1 : 0);
};

/**
 * A text field from the row, or from `other_info` when the row lacks it.
 * @param employee - The employee.
 * @param keys - Names to try, in order.
 * @returns The first non-empty value, trimmed.
 */
const field = (employee: EmployeeRecord, ...keys: string[]): string => {
  const sources = [employee as unknown as Record<string, unknown>, employee.other_info || {}];
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return '';
};

const displayName = (employee: EmployeeRecord): string => (employee.name_th || employee.name || '').trim();
const EMPLOYMENT_LABELS: Record<string, string> = { monthly: 'รายเดือน', daily: 'รายวัน', hourly: 'รายชั่วโมง', piece: 'ตามผลงาน' };
const GENDER_LABELS: Record<string, string> = { male: 'ชาย', female: 'หญิง', m: 'ชาย', f: 'หญิง', ชาย: 'ชาย', หญิง: 'หญิง' };

/** Columns of the employee register, in the order section 113 lists them. */
export const REGISTER_COLUMNS = [
  { key: 'no', label: 'ลำดับ' },
  { key: 'code', label: 'รหัสพนักงาน' },
  { key: 'name', label: 'ชื่อและชื่อสกุล', required: true },
  { key: 'gender', label: 'เพศ', required: true },
  { key: 'nationality', label: 'สัญชาติ', required: true },
  { key: 'birth', label: 'วันเดือนปีเกิด หรืออายุ', required: true },
  { key: 'address', label: 'ที่อยู่ปัจจุบัน', required: true },
  { key: 'start', label: 'วันที่เริ่มจ้าง', required: true },
  { key: 'position', label: 'ตำแหน่งหรืองานในหน้าที่', required: true },
  { key: 'wage', label: 'อัตราค่าจ้าง (บาท)', required: true },
  { key: 'wageType', label: 'ประเภทค่าจ้าง' },
  { key: 'end', label: 'วันสิ้นสุดของการจ้าง' },
] as const;

export type RegisterKey = (typeof REGISTER_COLUMNS)[number]['key'];
export type RegisterRow = Record<RegisterKey, string>;

export interface EmployeeRegister {
  title: string;
  company: string;
  asOf: string;
  columns: typeof REGISTER_COLUMNS;
  rows: RegisterRow[];
  /** Required columns that are empty, with how many employees lack each. */
  missing: { key: RegisterKey; label: string; count: number }[];
}

/**
 * Build the employee register.
 *
 * Employees who left are kept: the register is the record of everyone who
 * worked there, and the law has it kept for two years after they leave.
 * A value the system does not hold is left blank and counted, never invented.
 *
 * @param employees - Employee rows.
 * @param company - The employer.
 * @param asOf - Day the register is printed, `YYYY-MM-DD`.
 * @returns Rows ready to render, and what is missing.
 */
export const buildEmployeeRegister = (employees: EmployeeRecord[], company: Company, asOf: string): EmployeeRegister => {
  const sorted = [...employees].sort((a, b) =>
    (a.start_date || '9999').localeCompare(b.start_date || '9999') || (a.employee_id || '').localeCompare(b.employee_id || ''),
  );

  const rows = sorted.map((employee, index): RegisterRow => {
    const born = field(employee, 'birthdate', 'birth_date') || null;
    const age = ageOn(born, asOf);
    const wage = employee.salary === null || employee.salary === undefined || employee.salary === '' ? null : roundBaht(employee.salary);
    return {
      no: String(index + 1),
      code: employee.employee_id || BLANK,
      name: displayName(employee),
      gender: GENDER_LABELS[field(employee, 'gender').toLowerCase()] || BLANK,
      nationality: (employee.nationality || '').trim(),
      birth: born && thaiLongDate(born) ? `${thaiLongDate(born)}${age === null ? '' : ` (${age} ปี)`}` : BLANK,
      address: field(employee, 'address'),
      start: thaiLongDate(employee.start_date),
      position: [employee.position, employee.department].map((value) => (value || '').trim()).filter(Boolean).join(' / '),
      wage: wage && wage > 0 ? formatBaht(wage) : BLANK,
      wageType: EMPLOYMENT_LABELS[String(employee.employment_type ?? '').trim().toLowerCase()] || (employee.employment_type || '').trim(),
      end: thaiLongDate(employee.end_date),
    };
  });

  const missing = REGISTER_COLUMNS.filter((column) => 'required' in column && column.required)
    .map((column) => ({ key: column.key, label: column.label, count: rows.filter((row) => !row[column.key]).length }))
    .filter((entry) => entry.count > 0);

  return { title: 'ทะเบียนลูกจ้าง', company: (company.name || '').trim(), asOf: thaiLongDate(asOf), columns: REGISTER_COLUMNS, rows, missing };
};

export interface PayrollLine {
  employee?: EmployeeRecord | null;
  basic_salary?: number | string | null;
  total_income?: number | string | null;
  total_deductions?: number | string | null;
  net_salary?: number | string | null;
}

/** Columns of the wage payment record. */
export const WAGE_COLUMNS = [
  { key: 'no', label: 'ลำดับ' },
  { key: 'code', label: 'รหัส' },
  { key: 'name', label: 'ชื่อและชื่อสกุล' },
  { key: 'days', label: 'วันและเวลาทำงาน' },
  { key: 'wage', label: 'ค่าจ้าง' },
  { key: 'overtime', label: 'ค่าล่วงเวลา' },
  { key: 'holiday', label: 'ค่าทำงานในวันหยุด' },
  { key: 'other', label: 'เงินได้อื่น' },
  { key: 'deductions', label: 'รายการหัก' },
  { key: 'net', label: 'จ่ายสุทธิ' },
  { key: 'signature', label: 'ลายมือชื่อผู้รับเงิน' },
] as const;

export type WageKey = (typeof WAGE_COLUMNS)[number]['key'];
export type WageRow = Record<WageKey, string>;

export interface WageRecord {
  title: string;
  company: string;
  period: string;
  columns: typeof WAGE_COLUMNS;
  rows: WageRow[];
  totals: { wage: string; other: string; deductions: string; net: string };
  /** Columns the system cannot fill yet. */
  unavailable: string[];
  /** Lines whose parts do not add up to the net amount stored. */
  inconsistent: number;
}

/**
 * Build the wage payment record for one pay period.
 *
 * Overtime, holiday pay and hours are left blank: the system does not
 * calculate them yet, and a record of payment must not show figures nobody
 * calculated. "Other income" is what the stored total holds beyond the wage.
 *
 * @param lines - Payroll calculations of the period, with their employee.
 * @param periodName - Name of the pay period.
 * @param company - The employer.
 * @returns Rows ready to render, and totals.
 */
export const buildWageRecord = (lines: PayrollLine[], periodName: string, company: Company): WageRecord => {
  const sorted = [...lines].sort((a, b) => (a.employee?.employee_id || '').localeCompare(b.employee?.employee_id || ''));
  let inconsistent = 0;

  const figures = sorted.map((line) => {
    const wage = roundBaht(line.basic_salary);
    const income = roundBaht(line.total_income);
    const deductions = roundBaht(line.total_deductions);
    const net = roundBaht(line.net_salary);
    if (roundBaht(income - deductions) !== net) inconsistent += 1;
    return { line, wage, other: roundBaht(Math.max(0, income - wage)), deductions, net };
  });

  const rows = figures.map(({ line, wage, other, deductions, net }, index): WageRow => ({
    no: String(index + 1),
    code: line.employee?.employee_id || BLANK,
    name: line.employee ? displayName(line.employee) : BLANK,
    days: BLANK,
    wage: formatBaht(wage),
    overtime: BLANK,
    holiday: BLANK,
    other: formatBaht(other),
    deductions: formatBaht(deductions),
    net: formatBaht(net),
    signature: BLANK,
  }));

  return {
    title: 'เอกสารเกี่ยวกับการจ่ายค่าจ้าง ค่าล่วงเวลา ค่าทำงานในวันหยุด และค่าล่วงเวลาในวันหยุด',
    company: (company.name || '').trim(),
    period: periodName.trim(),
    columns: WAGE_COLUMNS,
    rows,
    totals: {
      wage: formatBaht(sumBaht(figures.map((f) => f.wage))),
      other: formatBaht(sumBaht(figures.map((f) => f.other))),
      deductions: formatBaht(sumBaht(figures.map((f) => f.deductions))),
      net: formatBaht(sumBaht(figures.map((f) => f.net))),
    },
    unavailable: ['วันและเวลาทำงาน', 'ค่าล่วงเวลา', 'ค่าทำงานในวันหยุด'],
    inconsistent,
  };
};

export interface WorkCertificate {
  title: string;
  issuedOn: string;
  paragraphs: string[];
  signatory: { name: string; title: string; company: string };
  /** Reasons the certificate cannot be issued as it stands. */
  problems: string[];
}

/**
 * Build a certificate of employment.
 *
 * It states who worked, for how long and doing what, which is what the Civil
 * and Commercial Code asks for. Pay and the reason for leaving are left out:
 * neither is required, and both can harm the person the certificate is for.
 *
 * @param employee - The employee.
 * @param company - The employer.
 * @param options - Day of issue and who signs.
 * @returns Text ready to render, and anything that stops it being issued.
 */
export const buildWorkCertificate = (
  employee: EmployeeRecord,
  company: Company,
  options: { issuedOn: string; signatoryName?: string; signatoryTitle?: string },
): WorkCertificate => {
  const problems: string[] = [];
  const name = displayName(employee);
  const companyName = (company.name || '').trim();
  const stillEmployed = !employee.end_date;
  const lastDay = employee.end_date || options.issuedOn;

  if (!name) problems.push('ไม่มีชื่อพนักงาน');
  if (!companyName) problems.push('ไม่มีชื่อบริษัท กรุณาตั้งค่าที่หน้าตั้งค่าเริ่มต้น');
  if (!isIsoDate(employee.start_date)) problems.push('ไม่มีวันที่เริ่มจ้าง');
  if (!isIsoDate(options.issuedOn)) problems.push('วันที่ออกหนังสือไม่ถูกต้อง');
  if (employee.end_date && !isIsoDate(employee.end_date)) problems.push('วันสิ้นสุดการจ้างไม่ถูกต้อง');
  if (isIsoDate(employee.start_date) && isIsoDate(lastDay) && lastDay < employee.start_date) {
    problems.push('วันสิ้นสุดการจ้างอยู่ก่อนวันที่เริ่มจ้าง');
  }
  if (!(employee.position || '').trim()) problems.push('ไม่มีตำแหน่งงาน ซึ่งใช้ระบุลักษณะงานที่ทำ');

  const length = serviceLengthText(serviceLength(employee.start_date, lastDay));
  const role = [(employee.position || '').trim(), employee.department ? `แผนก${employee.department.trim()}` : ''].filter(Boolean).join(' ');
  const idText = employee.national_id
    ? ` เลขประจำตัวประชาชน ${employee.national_id}`
    : employee.passport_number
      ? ` หนังสือเดินทางเลขที่ ${employee.passport_number}`
      : '';

  const period = stillEmployed
    ? `ตั้งแต่วันที่ ${thaiLongDate(employee.start_date)} จนถึงปัจจุบัน`
    : `ตั้งแต่วันที่ ${thaiLongDate(employee.start_date)} ถึงวันที่ ${thaiLongDate(employee.end_date)}`;

  return {
    title: 'หนังสือรับรองการทำงาน',
    issuedOn: thaiLongDate(options.issuedOn),
    paragraphs: [
      `หนังสือฉบับนี้ให้ไว้เพื่อรับรองว่า ${name}${idText} ${stillEmployed ? 'เป็นพนักงานของ' : 'ได้ทำงานกับ'} ${companyName} ${period}${length ? ` รวมระยะเวลา ${length}` : ''}`,
      `${stillEmployed ? 'ปัจจุบันปฏิบัติงาน' : 'โดยปฏิบัติงาน'}ในตำแหน่ง ${role}`,
      `ให้ไว้ ณ วันที่ ${thaiLongDate(options.issuedOn)}`,
    ],
    signatory: {
      name: (options.signatoryName || '').trim(),
      title: (options.signatoryTitle || 'ผู้มีอำนาจลงนาม').trim(),
      company: companyName,
    },
    problems,
  };
};

/**
 * Break Thai text into lines that fit a width. Thai is written without spaces
 * between words, so breaking on spaces alone would let a sentence run off the
 * page. Words are found with the browser's segmenter.
 *
 * @param text - One paragraph.
 * @param width - Width available.
 * @param measure - Returns the width of a piece of text in the same unit.
 * @returns The lines.
 */
export const wrapThai = (text: string, width: number, measure: (piece: string) => number): string[] => {
  const Segmenter = (Intl as unknown as { Segmenter?: new (locale: string, options: { granularity: string }) => { segment: (input: string) => Iterable<{ segment: string }> } }).Segmenter;
  const words = Segmenter
    ? [...new Segmenter('th', { granularity: 'word' }).segment(text)].map((part) => part.segment)
    : text.split(/(\s+)/);

  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    if (line && measure((line + word).trimEnd()) > width) {
      lines.push(line.trimEnd());
      line = word.trimStart();
    } else {
      line += word;
    }
  });
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
};
