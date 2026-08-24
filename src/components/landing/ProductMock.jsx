import React from 'react';
import { Users, Clock, Wallet, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * Small building block: a labelled KPI tile inside the mock UI.
 * @param {{label: string, value: string, delta?: string, icon: React.ElementType, tone: string}} props
 */
const MockTile = ({ label, value, delta, icon: Icon, tone }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-slate-500">{label}</span>
      <Icon className={`h-3.5 w-3.5 ${tone}`} />
    </div>
    <div className="mt-1.5 text-lg font-semibold text-slate-800">{value}</div>
    {delta && <div className="text-[10px] text-emerald-600">{delta}</div>}
  </div>
);

/** Fake bar chart drawn with divs so the mock needs no chart library. */
const MockChart = () => {
  const bars = [42, 58, 35, 72, 64, 88, 51, 76, 60, 94, 70, 82];
  return (
    <div className="flex h-24 items-end gap-1.5">
      {bars.map((h, i) => (
        <div
          key={i}
          className="mock-bar flex-1 rounded-t bg-gradient-to-t from-emerald-200 to-emerald-400"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
};

/** Fake table rows shared by the attendance and payroll mocks. */
const MockRows = ({ rows }) => (
  <div className="space-y-1.5">
    {rows.map((r, i) => (
      <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <div className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-emerald-200 to-teal-200" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] text-slate-700">{r.name}</div>
          <div className="text-[10px] text-slate-400">{r.sub}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${r.tone}`}>{r.tag}</span>
      </div>
    ))}
  </div>
);

/**
 * Stylised in-app screen used across the landing page.
 * Pure presentation — no real data is read or written.
 * @param {{variant?: 'dashboard'|'attendance'|'payroll'}} props
 */
const ProductMock = ({ variant = 'dashboard' }) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-24px_rgba(16,84,60,0.25)]">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <div className="ml-3 rounded-md bg-white px-3 py-1 text-[10px] text-slate-400 ring-1 ring-slate-200">
          hrm.company.co.th/{variant}
        </div>
      </div>

      <div className="flex">
        {/* sidebar */}
        <div className="hidden w-32 shrink-0 border-r border-slate-200 bg-slate-50/70 p-3 sm:block">
          {['แดชบอร์ด', 'พนักงาน', 'เวลาเข้า-ออก', 'OT', 'การลา', 'เงินเดือน', 'รายงาน'].map((m, i) => (
            <div
              key={m}
              className={`mb-1 rounded-md px-2 py-1.5 text-[10px] ${
                i === 0 ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'
              }`}
            >
              {m}
            </div>
          ))}
        </div>

        {/* body */}
        <div className="min-w-0 flex-1 bg-slate-50/40 p-4">
          {variant === 'dashboard' && (
            <>
              <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                <MockTile label="พนักงานทั้งหมด" value="248" delta="+6 เดือนนี้" icon={Users} tone="text-emerald-500" />
                <MockTile label="มาทำงานวันนี้" value="231" delta="93.1%" icon={CheckCircle2} tone="text-teal-500" />
                <MockTile label="ชั่วโมง OT เดือนนี้" value="1,284" icon={Clock} tone="text-lime-600" />
                <MockTile label="ยอดจ่ายรอบล่าสุด" value="4.82 ล." icon={Wallet} tone="text-emerald-600" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-600">ชั่วโมงทำงานรายเดือน</span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                    <TrendingUp className="h-3 w-3" /> +12.4%
                  </span>
                </div>
                <MockChart />
              </div>
            </>
          )}

          {variant === 'attendance' && (
            <>
              <div className="mb-3 grid grid-cols-3 gap-2">
                <MockTile label="มาสาย" value="7" icon={AlertTriangle} tone="text-amber-500" />
                <MockTile label="ขาดงาน" value="2" icon={AlertTriangle} tone="text-rose-400" />
                <MockTile label="ลาป่วย" value="4" icon={CheckCircle2} tone="text-teal-500" />
              </div>
              <MockRows
                rows={[
                  { name: 'สมชาย ใจดี', sub: 'ฝ่ายผลิต · กะเช้า 08:00-17:00', tag: 'ตรงเวลา', tone: 'bg-emerald-100 text-emerald-700' },
                  { name: 'วิภา ศรีสุข', sub: 'ฝ่ายบัญชี · เข้า 09:14', tag: 'สาย 14 น.', tone: 'bg-amber-100 text-amber-700' },
                  { name: 'ปรีชา มั่นคง', sub: 'ฝ่ายผลิต · OT 3 ชม.', tag: 'OT 1.5x', tone: 'bg-teal-100 text-teal-700' },
                  { name: 'นภา แจ่มใส', sub: 'ฝ่ายขาย · ลาพักร้อน', tag: 'อนุมัติแล้ว', tone: 'bg-lime-100 text-lime-700' },
                ]}
              />
            </>
          )}

          {variant === 'payroll' && (
            <>
              <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <div>
                  <div className="text-[11px] text-slate-700">รอบจ่าย ก.ย. 2569</div>
                  <div className="text-[10px] text-slate-400">248 คน · ประมวลผลแล้ว</div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] text-emerald-700">พร้อมออกสลิป</span>
              </div>
              <MockRows
                rows={[
                  { name: 'สมชาย ใจดี', sub: 'ฐาน 18,000 + OT 2,250 − ปกส. 750', tag: '฿19,500', tone: 'bg-slate-100 text-slate-700' },
                  { name: 'วิภา ศรีสุข', sub: 'ฐาน 32,000 − ภาษี 1,120 − ปกส. 750', tag: '฿30,130', tone: 'bg-slate-100 text-slate-700' },
                  { name: 'ปรีชา มั่นคง', sub: 'ฐาน 16,500 + OT 3,712 − ปกส. 750', tag: '฿19,462', tone: 'bg-slate-100 text-slate-700' },
                  { name: 'นภา แจ่มใส', sub: 'ฐาน 25,000 + คอมมิชชัน 8,400', tag: '฿32,650', tone: 'bg-slate-100 text-slate-700' },
                ]}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductMock;
