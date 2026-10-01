import React from 'react';
import { AlertTriangle, CheckCircle2, LocateFixed, Loader2, LogIn, MapPin, Navigation, RefreshCw } from 'lucide-react';
import { BrandMark } from '@/components/BrandLogo';
import { formatDistance } from '@/lib/clock/geofence';
import { PUNCH_LABELS } from '@/lib/clock/punch';
import { formatBangkokTime } from '@/lib/thaiTime';

/** What the screen says about each geofence verdict. */
const VERDICT_TEXT = {
  inside: { tone: 'good', text: 'อยู่ในรัศมี ลงเวลาได้' },
  outside: { tone: 'bad', text: 'อยู่นอกรัศมี' },
  imprecise: { tone: 'warn', text: 'สัญญาณ GPS ไม่แม่นยำพอ ลองใหม่ในที่โล่ง' },
  no_sites: { tone: 'warn', text: 'บริษัทยังไม่ได้ตั้งจุดลงเวลา' },
  no_position: { tone: 'warn', text: 'ยังไม่ทราบตำแหน่ง' },
};

const TONES = {
  good: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  bad: 'border-red-200 bg-red-50 text-red-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
};

/**
 * A box with an icon and a sentence.
 * @param {{ tone: 'good'|'bad'|'warn', children: React.ReactNode }} props - Colour and content.
 * @returns {JSX.Element} The box.
 */
const Notice = ({ tone, children }) => {
  const Icon = tone === 'good' ? CheckCircle2 : AlertTriangle;
  return (
    <div role="status" className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${TONES[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
};

/**
 * The clock-in screen as seen on a phone. Pure: everything comes in as props.
 *
 * @param {object} props - State of the screen.
 * @param {'loading'|'link'|'login'|'ready'} props.stage - Which screen to show.
 * @param {'line'|'mobile'} props.source - Where the user came from.
 * @param {{code: string, name: string}|null} props.employee - Who is punching.
 * @param {{latitude: number, longitude: number, accuracy?: number}|null} props.position - Where the phone is.
 * @param {string|null} props.positionError - Why there is no position.
 * @param {boolean} props.locating - Whether a position is being read.
 * @param {import('@/lib/clock/geofence').GeofenceResult|null} props.geofence - Verdict for the position.
 * @param {import('@/lib/clock/punch').PunchPlan|null} props.plan - What the next punch does.
 * @param {{kind: string, at: string, site: string|null}|null} props.result - The last successful punch.
 * @param {string|null} props.error - The last failure.
 * @param {boolean} props.busy - Whether a punch is being sent.
 * @param {Array<{id: string, log_date: string, check_in?: string|null, check_out?: string|null}>} props.days - Recent attendance rows.
 * @param {{employeeCode: string, nationalId: string}} props.linkForm - Values of the link form.
 * @param {string} props.now - Current time, ISO.
 * @param {string} [props.loginPath] - Where to sign in when there is no session.
 * @param {boolean} [props.embedded] - True when shown inside another page, such as the landing page's phone.
 * @returns {JSX.Element} The screen.
 */
const ClockView = ({
  stage, source, employee, position, positionError, locating, geofence, plan, result, error, busy, days, linkForm, now, loginPath = '/login', embedded = false,
  onLocate, onPunch, onLinkField, onLink,
}) => {
  const verdict = geofence ? VERDICT_TEXT[geofence.verdict] : null;
  const canPunch = stage === 'ready' && geofence?.verdict === 'inside' && plan && !plan.refusal && !busy;
  const kind = plan?.kind || 'in';

  return (
    <div className={`mx-auto flex w-full max-w-md flex-col bg-slate-50 text-slate-900 ${embedded ? '' : 'min-h-screen'}`}>
      <header className="flex items-center gap-2 px-5 pt-5">
        <BrandMark size={32} />
        <div className="leading-tight">
          <p className="font-semibold">ลงเวลาทำงาน</p>
          {employee && <p className="text-xs text-slate-500">{employee.code} · {employee.name}</p>}
        </div>
        {source === 'line' && <span className="ml-auto rounded-full bg-[#06c755]/10 px-2.5 py-1 text-[11px] font-medium text-[#06c755]">ผ่าน LINE</span>}
      </header>

      <main className="flex flex-1 flex-col gap-4 px-5 py-5">
        {stage === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> กำลังเตรียมหน้าจอ
          </p>
        )}

        {stage === 'login' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h1 className="text-lg font-semibold">เข้าสู่ระบบก่อนลงเวลา</h1>
            <p className="mt-1 text-sm text-slate-600">ใช้บัญชีที่ฝ่ายบุคคลออกให้ หรือเปิดหน้านี้จากเมนูใน LINE ของบริษัท</p>
            <a href={loginPath} className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white">
              <LogIn className="h-4 w-4" aria-hidden="true" /> เข้าสู่ระบบ
            </a>
          </section>
        )}

        {stage === 'link' && (
          <form
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              onLink();
            }}
          >
            <h1 className="text-lg font-semibold">ผูกบัญชี LINE กับพนักงาน</h1>
            <p className="mt-1 text-sm text-slate-600">ทำครั้งเดียว ครั้งต่อไปเปิดแล้วลงเวลาได้ทันที</p>
            <label className="mt-4 block text-sm font-medium" htmlFor="clock-code">รหัสพนักงาน</label>
            <input
              id="clock-code"
              className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-base"
              autoComplete="off"
              maxLength={40}
              value={linkForm.employeeCode}
              onChange={(event) => onLinkField('employeeCode', event.target.value)}
            />
            <label className="mt-3 block text-sm font-medium" htmlFor="clock-id">เลขประจำตัวประชาชน 13 หลัก</label>
            <input
              id="clock-id"
              className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-base tabular-nums"
              inputMode="numeric"
              autoComplete="off"
              maxLength={17}
              value={linkForm.nationalId}
              onChange={(event) => onLinkField('nationalId', event.target.value)}
            />
            {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="mt-4 h-11 w-full rounded-xl bg-emerald-600 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? 'กำลังตรวจสอบ' : 'ผูกบัญชี'}
            </button>
          </form>
        )}

        {stage === 'ready' && (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{formatBangkokTime(now, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">{formatBangkokTime(now, { hour: '2-digit', minute: '2-digit' })}</p>

              <div className="mt-4 flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                {locating && <span className="text-slate-600">กำลังหาตำแหน่ง</span>}
                {!locating && positionError && <span className="text-red-700">{positionError}</span>}
                {!locating && !positionError && geofence?.site && (
                  <span>
                    <span className="font-medium">{geofence.site.name}</span>
                    <span className="text-slate-600"> · ห่าง {formatDistance(geofence.distance_m)} จากรัศมี {formatDistance(geofence.site.radius_m)}</span>
                    {position?.accuracy ? <span className="text-slate-500"> · แม่นยำ ±{Math.round(position.accuracy)} ม.</span> : null}
                  </span>
                )}
                {!locating && !positionError && !geofence?.site && <span className="text-slate-600">{verdict?.text || 'ยังไม่ทราบตำแหน่ง'}</span>}
              </div>

              {verdict && geofence?.site && (
                <div className="mt-3">
                  <Notice tone={verdict.tone}>
                    {verdict.text}
                    {geofence.verdict === 'outside' && ` เกินมา ${formatDistance(geofence.overshoot_m)}`}
                  </Notice>
                </div>
              )}
              {plan?.refusal && <div className="mt-3"><Notice tone="warn">{plan.refusal}</Notice></div>}

              <button
                type="button"
                onClick={onPunch}
                disabled={!canPunch}
                className={`mt-5 flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-white shadow-lg transition-colors disabled:opacity-40 ${
                  kind === 'in' ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-slate-900 shadow-slate-900/30'
                }`}
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Navigation className="h-5 w-5" aria-hidden="true" />}
                {PUNCH_LABELS[kind]}
              </button>

              <button
                type="button"
                onClick={onLocate}
                disabled={locating}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-700"
              >
                {locating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-4 w-4" aria-hidden="true" />}
                หาตำแหน่งใหม่
              </button>
            </section>

            {result && (
              <Notice tone="good">
                {PUNCH_LABELS[result.kind]}แล้ว {formatBangkokTime(result.at, { hour: '2-digit', minute: '2-digit' })} น.{result.site ? ` ที่ ${result.site}` : ''}
              </Notice>
            )}
            {error && <Notice tone="bad">{error}</Notice>}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <RefreshCw className="h-4 w-4 text-slate-400" aria-hidden="true" /> ลงเวลาล่าสุด
              </h2>
              {days.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">ยังไม่มีรายการ</p>
              ) : (
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {days.map((day) => (
                    <li key={day.id} className="flex items-center justify-between py-2 tabular-nums">
                      <span className="text-slate-600">{formatBangkokTime(`${day.log_date}T00:00:00+07:00`, { day: 'numeric', month: 'short' })}</span>
                      <span>
                        เข้า {day.check_in ? formatBangkokTime(day.check_in, { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        <span className="text-slate-400"> · </span>
                        ออก {day.check_out ? formatBangkokTime(day.check_out, { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="px-5 pb-6 text-center text-[11px] text-slate-400">ตำแหน่งถูกบันทึกเฉพาะตอนกดลงเวลา</footer>
    </div>
  );
};

export default ClockView;
