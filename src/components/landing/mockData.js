/**
 * @file Sample data for the screens shown on the landing page.
 * Every name and figure here is invented for illustration. The payroll
 * arithmetic is kept consistent so a visitor who checks it finds it correct:
 * 22,500 / 30 / 8 = 93.75 per hour, x 1.5 = 140.625, x 12.5 hours = 1,757.81.
 */

/** Rows of the exception inbox. `tone` is a Tailwind text colour class. */
export const MOCK_EXCEPTIONS = [
  { id: 1, type: 'scan', name: 'สมชาย ใจดี', shift: 'เช้า 08:00–17:00', kind: 'สแกนไม่ครบ', tone: 'text-orange-800', found: 'มีเวลาเข้า 07:52 ไม่มีเวลาออก', suggest: 'ใช้เวลาออกตามกะ 17:00' },
  { id: 2, type: 'scan', name: 'วิภา ทองคำ', shift: 'ดึก 22:00–06:00', kind: 'สแกนไม่ครบ', tone: 'text-orange-800', found: 'มีเวลาออก 06:04 ไม่มีเวลาเข้า', suggest: 'ใช้เวลาเข้าตามกะ 22:00 ของวันที่ 27' },
  { id: 3, type: 'ot', name: 'อนันต์ ศรีสุข', shift: 'เช้า 08:00–17:00', kind: 'เกินเวลา ไม่มีคำขอ OT', tone: 'text-blue-800', found: 'ออก 19:32 เกินกะ 2 ชม. 32 นาที', suggest: 'สร้างคำขอ OT 2 ชม. 30 นาที ส่งหัวหน้าอนุมัติ' },
  { id: 4, type: 'shift', name: 'กนกวรรณ พรหมมา', shift: 'ยังไม่มีกะ', kind: 'มีเวลา แต่ไม่มีกะ', tone: 'text-purple-800', found: 'เข้า 13:51 ออก 22:06', suggest: 'กะบ่าย 14:00–22:00' },
  { id: 5, type: 'absent', name: 'ธนพล อินทร์แก้ว', shift: 'เช้า 08:00–17:00', kind: 'ขาดงาน ไม่มีใบลา', tone: 'text-red-800', found: 'ไม่มีรายการสแกนทั้งวัน', suggest: 'แจ้งพนักงานให้ยื่นลาภายใน 2 วัน' },
];

/** Filter chips above the inbox. */
export const MOCK_EXCEPTION_FILTERS = [
  { id: 'all', label: 'ทั้งหมด', count: 14 },
  { id: 'scan', label: 'สแกนไม่ครบ', count: 6 },
  { id: 'ot', label: 'เกินเวลาไม่มีคำขอ OT', count: 4 },
  { id: 'shift', label: 'ไม่มีกะ', count: 2 },
  { id: 'absent', label: 'ขาดงานไม่มีใบลา', count: 2 },
];

/** Rows the attendance import could not accept as they are. */
export const MOCK_IMPORT_ISSUES = [
  { row: 47, problem: 'ไม่พบรหัสพนักงาน 0317', detail: 'รหัสใกล้เคียง: EMP-0137 สุรชัย มั่นคง', fix: 'จับคู่กับ EMP-0137' },
  { row: 112, problem: 'ไม่พบรหัสพนักงาน 0502', detail: 'ไม่มีรหัสใกล้เคียงในทะเบียน', fix: 'เลือกพนักงาน' },
  { row: 203, problem: 'รูปแบบเวลาไม่ถูกต้อง', detail: 'ชั่วโมงเกิน 23', fix: 'ระบุเวลา' },
  { row: 341, problem: 'ไม่มีเวลาสแกน', detail: 'ช่องวันและเวลาว่าง', fix: 'ข้ามแถวนี้' },
  { row: 498, problem: 'พนักงานลาออกแล้ว', detail: 'สิ้นสุดการจ้าง 31 ส.ค. 2569', fix: 'ข้ามแถวนี้' },
];

/** Shift kinds in the planner. `cell` holds the Tailwind classes of a grid cell. */
export const MOCK_SHIFT_KINDS = [
  { code: 'ช', label: 'เช้า', cell: 'bg-amber-100 text-amber-900 border border-amber-300' },
  { code: 'บ', label: 'บ่าย', cell: 'bg-blue-100 text-blue-900 border border-blue-300' },
  { code: 'ด', label: 'ดึก', cell: 'bg-slate-800 text-white border border-slate-800' },
  { code: '–', label: 'หยุด', cell: 'bg-slate-100 text-slate-600 border border-slate-200' },
];

/** Employees in the planner. `group` is the shift they start the month on. */
export const MOCK_SHIFT_STAFF = [
  { name: 'สมชาย ใจดี', group: 0 },
  { name: 'อนันต์ ศรีสุข', group: 0 },
  { name: 'สุรชัย มั่นคง', group: 1 },
  { name: 'มานพ สายทอง', group: 1 },
  { name: 'วีระ จันทร์ดี', group: 2 },
  { name: 'ณัฐพล ศรีวงศ์', group: 2 },
];

/** 1 to 14 October 2026; the 1st is a Thursday. */
export const MOCK_SHIFT_DAYS = ['พฤ', 'ศ', 'ส', 'อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา', 'จ', 'อ', 'พ'].map((name, i) => ({ name, n: i + 1 }));

/** People whose pay moved more than the threshold. */
export const MOCK_PAYROLL_PEOPLE = [
  { name: 'อนันต์ ศรีสุข', why: 'OT เพิ่ม ไม่ได้เบี้ยขยัน', delta: '+5.5%', tone: 'text-blue-800' },
  { name: 'วิภา ทองคำ', why: 'ค่ากะดึกเพิ่ม 6 กะ', delta: '+7.2%', tone: 'text-blue-800' },
  { name: 'ธนพล อินทร์แก้ว', why: 'ขาดงาน 3 วัน', delta: '−11.4%', tone: 'text-orange-800' },
  { name: 'ประเสริฐ แก้วมณี', why: 'OT วันหยุด 2 วัน', delta: '+14.8%', tone: 'text-blue-800' },
  { name: 'กนกวรรณ พรหมมา', why: 'เริ่มงาน 15 ก.ย. คิดตามสัดส่วน', delta: 'พนักงานใหม่', tone: 'text-slate-600' },
];

/** Lines of one payslip with the source of each figure. */
export const MOCK_PAYROLL_LINES = [
  { label: 'เงินเดือน', amount: '22,500.00', source: 'ทำงานครบงวด ไม่มีวันขาดงาน' },
  {
    label: 'OT วันทำงาน 1.5 เท่า',
    amount: '1,757.81',
    source: '12 ชม. 30 นาที × 140.625 บาท',
    highlight: true,
    days: [
      { date: '9 ก.ย.', basis: 'ออก 19:32 กะสิ้นสุด 17:00', hours: '2 ชม. 30 นาที' },
      { date: '16 ก.ย.', basis: 'ออก 21:04 กะสิ้นสุด 17:00', hours: '4 ชม.' },
      { date: '22 ก.ย.', basis: 'ออก 20:38 กะสิ้นสุด 17:00', hours: '3 ชม. 30 นาที' },
      { date: '28 ก.ย.', basis: 'ออก 19:32 กะสิ้นสุด 17:00', hours: '2 ชม. 30 นาที' },
    ],
  },
  { label: 'เบี้ยขยัน', amount: '0.00', source: 'ไม่ได้รับ · มาสาย 2 ครั้ง (3 และ 17 ก.ย.)', warn: true },
  { label: 'รวมรายได้', amount: '24,257.81', total: true },
];

/** Differences found in a parallel run, each with its cause. */
export const MOCK_PROOF_ROWS = [
  { name: 'วิภา ทองคำ', item: 'OT วันทำงาน', theirs: '843.75', ours: '1,265.63', cause: 'วิธีเดิมไม่นับ OT ที่ข้ามเที่ยงคืน', proof: '14 ส.ค. กะสิ้นสุด 22:00 สแกนออก 01:06 ของวันที่ 15' },
  { name: 'อนันต์ ศรีสุข', item: 'เบี้ยขยัน', theirs: '500.00', ours: '0.00', cause: 'วิธีเดิมจ่ายเบี้ยขยันทั้งที่มาสาย', proof: 'สแกนเข้า 08:11 วันที่ 6 และ 08:09 วันที่ 20 ส.ค.' },
  { name: 'ประเสริฐ แก้วมณี', item: 'ค่าจ้างวันหยุดตามประเพณี', theirs: '400.00', ours: '800.00', cause: 'วิธีเดิมคิด 1 เท่า พนักงานรายวันต้องได้ 2 เท่า', proof: 'ทำงานวันที่ 12 ส.ค. ซึ่งเป็นวันหยุดตามประกาศบริษัท' },
  { name: 'สุนิสา บุญเรือง', item: 'หักลาไม่รับค่าจ้าง', theirs: '−1,500.00', ours: '−750.00', cause: 'วิธีเดิมหัก 2 วัน ใบลาอนุมัติ 1 วัน', proof: 'ใบลาวันที่ 18 ส.ค. วันที่ 19 มีรายการสแกนครบ' },
  { name: 'ธนพล อินทร์แก้ว', item: 'ค่ากะดึก', theirs: '960.00', ours: '960.00', cause: 'กฎในระบบตั้งผิดในรอบแรก แก้แล้วตรงกัน', proof: 'ระเบียบบริษัทคิด 120 บาทต่อกะ × 8 กะ' },
];
