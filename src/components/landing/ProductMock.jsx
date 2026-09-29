import React, { useMemo, useState } from 'react';
import { Check, FileUp, Lock } from 'lucide-react';
import {
  MOCK_EXCEPTIONS, MOCK_EXCEPTION_FILTERS, MOCK_IMPORT_ISSUES, MOCK_SHIFT_KINDS, MOCK_SHIFT_STAFF,
  MOCK_SHIFT_DAYS, MOCK_PAYROLL_PEOPLE, MOCK_PAYROLL_LINES, MOCK_PROOF_ROWS,
} from '@/components/landing/mockData';

/** Sidebar entries, in the order of the designed application. */
const MENU = [
  { id: 'inbox', label: 'ต้องตัดสินใจ' },
  { id: 'overview', label: 'ภาพรวม' },
  { id: 'employees', label: 'พนักงาน' },
  { id: 'import', label: 'เวลาทำงาน' },
  { id: 'shift', label: 'ตารางกะ' },
  { id: 'leave', label: 'ลา และ OT' },
  { id: 'payroll', label: 'เงินเดือน' },
];

/** Which sidebar entry each screen highlights. */
const ACTIVE_MENU = { inbox: 'inbox', import: 'import', shift: 'shift', payroll: 'payroll', proof: 'payroll' };

/**
 * A figure with a caption, used in the summary strips.
 * @param {{label: string, value: string, note?: string, tone?: 'plain'|'good'|'warn'}} props
 * @returns {JSX.Element}
 */
const Figure = ({ label, value, note, tone = 'plain' }) => {
  const tones = {
    plain: 'border-slate-200 bg-white text-slate-900',
    good: 'border-slate-200 bg-white text-emerald-700',
    warn: 'border-orange-300 bg-orange-50 text-orange-800',
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="text-[10px] text-slate-600">{label}</div>
      <div className="mt-0.5 text-base font-semibold tabular-nums">{value}</div>
      {note && <div className="text-[10px] text-slate-600">{note}</div>}
    </div>
  );
};

/**
 * Numbered steps across the top of a wizard screen.
 * @param {{steps: string[], current: number}} props - `current` is zero-based.
 * @returns {JSX.Element}
 */
const Stepper = ({ steps, current }) => (
  <ol className="mb-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
    {steps.map((step, i) => (
      <li
        key={step}
        aria-current={i === current ? 'step' : undefined}
        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] ${
          i === current ? 'border-slate-900 bg-slate-900 font-medium text-white' : 'border-slate-200 bg-white text-slate-600'
        }`}
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
            i < current ? 'bg-emerald-700 text-white' : i === current ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-700'
          }`}
        >
          {i < current ? <Check className="h-2.5 w-2.5" aria-hidden="true" /> : i + 1}
        </span>
        <span className="truncate">{step}</span>
      </li>
    ))}
  </ol>
);

/** Exception inbox: the only rows a person has to decide on. Filters and ticks work. */
const InboxScreen = () => {
  const [filter, setFilter] = useState('all');
  const [picked, setPicked] = useState(() => new Set([1, 2]));

  const rows = MOCK_EXCEPTIONS.filter((row) => filter === 'all' || row.type === filter);

  /** @param {number} id - Row to tick or untick. */
  const toggle = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Figure label="นำเข้าล่าสุด" value="07:42 น." note="ไฟล์จากเครื่องสแกน" />
        <Figure label="รายการสแกน" value="512" note="จับคู่เข้า-ออกให้แล้ว" />
        <Figure label="ผ่านโดยไม่ต้องแตะ" value="236 คน" note="จาก 250 คน" tone="good" />
        <Figure label="ต้องตัดสินใจ" value="14 รายการ" note="งานของวันนี้มีเท่านี้" tone="warn" />
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {MOCK_EXCEPTION_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-2.5 py-1 text-[10px] transition-colors ${
              filter === f.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {f.label} · {f.count}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-blue-200 bg-blue-50 px-3 py-2">
          <span className="text-[11px] text-blue-900">เลือกแล้ว {picked.size} รายการ</span>
          <span className="rounded-md bg-blue-600 px-2.5 py-1 text-[10px] font-medium text-white">ยืนยันตามที่ระบบเสนอ</span>
        </div>
        {rows.map((row) => (
          <label
            key={row.id}
            className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={picked.has(row.id)}
              onChange={() => toggle(row.id)}
              className="h-3.5 w-3.5 shrink-0"
            />
            <span className="w-28 shrink-0">
              <span className="block truncate text-[11px] font-medium text-slate-900">{row.name}</span>
              <span className="block truncate text-[10px] text-slate-600">{row.shift}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[11px] font-medium ${row.tone}`}>{row.kind}</span>
              <span className="block truncate text-[10px] text-slate-600">{row.found}</span>
            </span>
            <span className="hidden min-w-0 flex-1 text-[11px] text-slate-800 md:block">{row.suggest}</span>
          </label>
        ))}
      </div>
    </>
  );
};

/** Attendance import, at the review step. */
const ImportScreen = () => (
  <>
    <Stepper steps={['อัปโหลดไฟล์', 'จับคู่คอลัมน์', 'ตรวจผล', 'ยืนยัน']} current={2} />
    <div className="grid gap-3 md:grid-cols-5">
      <div className="space-y-2 md:col-span-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-900">
            <FileUp className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" /> scan-2569-09-28.csv
          </div>
          {[
            ['แถวทั้งหมด', '528', 'text-slate-900'],
            ['พร้อมนำเข้า', '512', 'text-emerald-700'],
            ['สแกนซ้ำ รวมเป็นครั้งเดียว', '11', 'text-slate-900'],
            ['ต้องแก้ก่อนนำเข้า', '5', 'text-orange-800'],
          ].map(([label, value, tone]) => (
            <div key={label} className="flex justify-between py-0.5 text-[11px]">
              <span className="text-slate-600">{label}</span>
              <span className={`font-medium tabular-nums ${tone}`}>{value}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-[10px] leading-relaxed text-emerald-900">
          กะดึกจับคู่ข้ามวันให้แล้ว 38 คน เวลาออกเช้าวันที่ 28 นับเป็นของกะที่เริ่มคืนวันที่ 27
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white md:col-span-3">
        <div className="border-b border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-900">แถวที่ต้องแก้ 5 รายการ</div>
        {MOCK_IMPORT_ISSUES.map((issue) => (
          <div key={issue.row} className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0">
            <span className="w-8 shrink-0 text-[10px] tabular-nums text-slate-600">{issue.row}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium text-orange-800">{issue.problem}</span>
              <span className="block truncate text-[10px] text-slate-600">{issue.detail}</span>
            </span>
            <span className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-[10px] text-slate-800">{issue.fix}</span>
          </div>
        ))}
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-3 py-2">
          <span className="rounded-md bg-blue-600 px-2.5 py-1 text-[10px] font-medium text-white">นำเข้า 512 รายการที่ผ่าน</span>
        </div>
      </div>
    </div>
  </>
);

/**
 * Shift code an employee works on a day under the rotating pattern:
 * Sundays off, the shift moves on one step each week.
 * @param {number} group - Starting shift of the employee (0 morning, 1 afternoon, 2 night).
 * @param {number} dayIndex - Zero-based day of the grid.
 * @returns {number} Index into MOCK_SHIFT_KINDS.
 */
const patternShift = (group, dayIndex) => {
  if (MOCK_SHIFT_DAYS[dayIndex].name === 'อา') return 3;
  const week = dayIndex <= 2 ? 0 : dayIndex <= 9 ? 1 : 2;
  return (group + week) % 3;
};

/** Shift planner. Clicking a cell moves it to the next shift. */
const ShiftScreen = () => {
  const [overrides, setOverrides] = useState({});

  const grid = useMemo(
    () =>
      MOCK_SHIFT_STAFF.map((person, row) => ({
        ...person,
        cells: MOCK_SHIFT_DAYS.map((day, i) => {
          const key = `${row}-${i}`;
          const base = patternShift(person.group, i);
          const current = overrides[key] ?? base;
          return { key, day, current, changed: current !== base, kind: MOCK_SHIFT_KINDS[current] };
        }),
      })),
    [overrides],
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <span className="rounded-md border border-slate-300 px-2 py-1 text-[10px] text-slate-800">หมุน 3 กะ เปลี่ยนทุกสัปดาห์</span>
        <span className="rounded-md bg-slate-900 px-2 py-1 text-[10px] text-white">ใช้กับทั้งแผนก 42 คน</span>
        <span className="ml-auto flex flex-wrap gap-2">
          {MOCK_SHIFT_KINDS.map((kind) => (
            <span key={kind.code} className="flex items-center gap-1 text-[10px] text-slate-700">
              <span className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-medium ${kind.cell}`}>{kind.code}</span>
              {kind.label}
            </span>
          ))}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="min-w-[520px]">
          <div className="grid items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5" style={{ gridTemplateColumns: '96px repeat(14, minmax(0, 1fr))' }}>
            <span className="text-[10px] font-semibold text-slate-600">พนักงาน</span>
            {MOCK_SHIFT_DAYS.map((day) => (
              <span key={day.n} className={`text-center text-[9px] ${day.name === 'อา' ? 'text-red-800' : 'text-slate-600'}`}>
                {day.name}
                <span className="block text-[10px] font-semibold tabular-nums">{day.n}</span>
              </span>
            ))}
          </div>
          {grid.map((person) => (
            <div
              key={person.name}
              className="grid items-center gap-1 border-b border-slate-100 px-2 py-1 last:border-b-0"
              style={{ gridTemplateColumns: '96px repeat(14, minmax(0, 1fr))' }}
            >
              <span className="truncate text-[10px] font-medium text-slate-900">{person.name}</span>
              {person.cells.map((cell) => (
                <button
                  key={cell.key}
                  type="button"
                  aria-label={`${person.name} วันที่ ${cell.day.n} ${cell.kind.label}`}
                  onClick={() => setOverrides((prev) => ({ ...prev, [cell.key]: (cell.current + 1) % MOCK_SHIFT_KINDS.length }))}
                  className={`h-6 rounded text-[10px] font-medium ${cell.kind.cell} ${cell.changed ? 'ring-2 ring-orange-500' : ''}`}
                >
                  {cell.kind.code}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-slate-600">กดที่ช่องเพื่อสลับกะรายวัน · กรอบส้มคือวันที่ต่างจากรูปแบบ</p>
    </>
  );
};

/** Payroll review: only the people whose pay moved, and where each figure came from. */
const PayrollScreen = () => (
  <>
    <Stepper steps={['เตรียมข้อมูล', 'คำนวณ', 'ตรวจ', 'อนุมัติและปิดงวด', 'จ่ายและยื่น']} current={2} />
    <div className="grid gap-3 md:grid-cols-5">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white md:col-span-2">
        <div className="border-b border-slate-200 px-3 py-2">
          <div className="text-[11px] font-semibold text-slate-900">รายได้เปลี่ยนจากเดือนก่อนเกิน 5%</div>
          <div className="text-[10px] text-slate-600">9 คน จาก 250 · อีก 241 คนอยู่ในเกณฑ์</div>
        </div>
        {MOCK_PAYROLL_PEOPLE.map((person, i) => (
          <div key={person.name} className={`flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-1.5 last:border-b-0 ${i === 0 ? 'bg-blue-50' : ''}`}>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-medium text-slate-900">{person.name}</span>
              <span className="block truncate text-[10px] text-slate-600">{person.why}</span>
            </span>
            <span className={`shrink-0 text-[10px] tabular-nums ${person.tone}`}>{person.delta}</span>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white md:col-span-3">
        <div className="border-b border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-900">อนันต์ ศรีสุข · ที่มาของแต่ละยอด</div>
        {MOCK_PAYROLL_LINES.map((line) => (
          <div key={line.label} className={`border-b border-slate-100 px-3 py-1.5 last:border-b-0 ${line.highlight ? 'bg-blue-50' : ''} ${line.total ? 'bg-slate-50' : ''}`}>
            <div className="flex items-baseline justify-between gap-3">
              <span className={`text-[11px] text-slate-900 ${line.total ? 'font-semibold' : 'font-medium'}`}>{line.label}</span>
              <span className={`shrink-0 text-[11px] tabular-nums text-slate-900 ${line.total ? 'font-semibold' : ''}`}>{line.amount}</span>
            </div>
            {line.source && <div className={`text-[10px] ${line.warn ? 'text-orange-800' : 'text-slate-600'}`}>{line.source}</div>}
            {line.days && (
              <div className="mt-1 space-y-0.5 border-l-2 border-blue-200 pl-2">
                {line.days.map((day) => (
                  <div key={day.date} className="flex justify-between gap-2 text-[10px] tabular-nums text-slate-700">
                    <span>{day.date} · {day.basis}</span>
                    <span className="shrink-0">{day.hours}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </>
);

/** Parallel-run report: our figures beside the customer's own, with the cause of each difference. */
const ProofScreen = () => (
  <>
    <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Figure label="ตรงกันทุกบรรทัด" value="37 คน" note="จาก 42 คน" tone="good" />
      <Figure label="ต่างกัน" value="5 คน" note="พร้อมสาเหตุทุกราย" tone="warn" />
      <Figure label="สาเหตุอยู่ที่ไฟล์เดิม" value="4 คน" note="ฝ่ายบุคคลยืนยันแล้ว" />
      <Figure label="สาเหตุอยู่ที่กฎในระบบ" value="1 คน" note="แก้กฎแล้ว ตรงกัน" />
    </div>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="hidden grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold text-slate-600 md:grid">
        <span className="col-span-3">พนักงาน · รายการ</span>
        <span className="col-span-2 text-right">วิธีเดิมคิด</span>
        <span className="col-span-2 text-right">ระบบคิด</span>
        <span className="col-span-5">สาเหตุ และหลักฐาน</span>
      </div>
      {MOCK_PROOF_ROWS.map((row) => (
        <div key={row.name} className="grid grid-cols-2 gap-x-2 gap-y-0.5 border-b border-slate-100 px-3 py-2 last:border-b-0 md:grid-cols-12">
          <span className="col-span-2 md:col-span-3">
            <span className="block text-[11px] font-medium text-slate-900">{row.name}</span>
            <span className="block text-[10px] text-slate-600">{row.item}</span>
          </span>
          <span className="text-[11px] tabular-nums text-slate-800 md:col-span-2 md:text-right">{row.theirs}</span>
          <span className="text-right text-[11px] font-medium tabular-nums text-slate-900 md:col-span-2">{row.ours}</span>
          <span className="col-span-2 md:col-span-5">
            <span className="block text-[11px] font-medium text-slate-900">{row.cause}</span>
            <span className="block text-[10px] text-slate-600">{row.proof}</span>
          </span>
        </div>
      ))}
    </div>
  </>
);

const SCREENS = { inbox: InboxScreen, import: ImportScreen, shift: ShiftScreen, payroll: PayrollScreen, proof: ProofScreen };

/**
 * One screen of the designed application, drawn inside a browser frame.
 * The screens follow the product design, use sample data, and do not read or
 * write anything. Filters, ticks and shift cells respond so a visitor can feel
 * how little there is to do.
 *
 * @param {{variant?: 'inbox'|'import'|'shift'|'payroll'|'proof'}} props
 * @returns {JSX.Element}
 */
const ProductMock = ({ variant = 'inbox' }) => {
  const Screen = SCREENS[variant] || InboxScreen;
  const active = ACTIVE_MENU[variant] || 'inbox';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_24px_60px_-24px_rgba(16,84,60,0.25)]">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <div className="ml-3 flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-[10px] text-slate-600 ring-1 ring-slate-200">
          <Lock className="h-2.5 w-2.5" aria-hidden="true" /> hrm.บริษัทของคุณ.co.th
        </div>
        <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-[9px] text-slate-700">ข้อมูลตัวอย่าง</span>
      </div>

      <div className="flex">
        <div className="hidden w-32 shrink-0 border-r border-slate-200 bg-white p-2 sm:block">
          <div className="mb-2 flex items-center gap-1.5 px-1.5 py-1">
            <span className="h-4 w-4 rounded bg-emerald-700" />
            <span className="text-[11px] font-semibold text-slate-900">HRM Suite</span>
          </div>
          {MENU.map((item) => (
            <div
              key={item.id}
              className={`mb-0.5 flex items-center justify-between rounded-md px-2 py-1.5 text-[10px] ${
                item.id === active ? 'bg-emerald-50 font-medium text-emerald-900' : 'text-slate-600'
              }`}
            >
              {item.label}
              {item.id === 'inbox' && <span className="rounded-full bg-emerald-700 px-1.5 text-[9px] text-white">14</span>}
            </div>
          ))}
        </div>

        <div className="min-w-0 flex-1 bg-slate-50 p-3 sm:p-4">
          <Screen />
        </div>
      </div>
    </div>
  );
};

export default ProductMock;
