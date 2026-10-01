/**
 * @file The decisions of clock-punch, with no I/O, so they can be tested.
 */
import { evaluatePosition, isLatitude, isLongitude, type GeofenceResult, type Position, type WorkSite } from '../_shared/geofence.ts';
import { planPunch, type AttendanceDay, type PunchPlan } from '../_shared/punch.ts';

export type Action = 'status' | 'punch' | 'link';

export interface ParsedRequest {
  action: Action;
  position: Position | null;
  lineIdToken: string | null;
  employeeCode: string;
  nationalId: string;
}

/** How long a punch may be queued on a phone before it is too old to accept. */
export const MAX_SKEW_MINUTES = 10;

const text = (value: unknown, max: number): string => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/**
 * Read and check the request body. Unknown fields are ignored; wrong ones
 * make the whole request invalid.
 * @param body - Parsed JSON body.
 * @returns The request, or a reason it is invalid.
 */
export const parseRequest = (body: unknown): { ok: true; request: ParsedRequest } | { ok: false; error: string } => {
  if (!body || typeof body !== 'object') return { ok: false, error: 'คำขอไม่ถูกต้อง' };
  const b = body as Record<string, unknown>;
  const action = b.action;
  if (action !== 'status' && action !== 'punch' && action !== 'link') return { ok: false, error: 'คำขอไม่ถูกต้อง' };

  let position: Position | null = null;
  if (b.position !== undefined && b.position !== null) {
    const p = b.position as Record<string, unknown>;
    if (!isLatitude(p.latitude) || !isLongitude(p.longitude)) return { ok: false, error: 'พิกัดไม่ถูกต้อง' };
    const accuracy = typeof p.accuracy === 'number' && Number.isFinite(p.accuracy) && p.accuracy >= 0 ? Math.round(p.accuracy) : null;
    position = { latitude: p.latitude, longitude: p.longitude, accuracy };
  }

  const lineIdToken = text(b.lineIdToken, 4096) || null;
  const employeeCode = text(b.employeeCode, 40);
  const nationalId = text(b.nationalId, 20).replace(/[\s-]/g, '');

  if (action === 'punch' && !position) return { ok: false, error: 'ต้องเปิดตำแหน่งที่ตั้งก่อนลงเวลา' };
  if (action === 'link') {
    if (!lineIdToken) return { ok: false, error: 'ผูกบัญชีได้เฉพาะจาก LINE' };
    if (!employeeCode) return { ok: false, error: 'กรุณากรอกรหัสพนักงาน' };
    if (!/^\d{13}$/.test(nationalId)) return { ok: false, error: 'เลขประจำตัวประชาชนต้องมี 13 หลัก' };
  }

  return { ok: true, request: { action, position, lineIdToken, employeeCode, nationalId } };
};

/**
 * Whether a LINE ID token verification response names the channel we expect.
 * @param payload - Body returned by LINE's verify endpoint.
 * @param channelId - Our LINE Login channel id.
 * @param now - The current time.
 * @returns The LINE user id when the token is good, otherwise null.
 */
export const lineUserFromVerification = (payload: unknown, channelId: string, now: Date): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  if (p.aud !== channelId) return null;
  if (typeof p.exp !== 'number' || p.exp * 1000 < now.getTime()) return null;
  return typeof p.sub === 'string' && p.sub.length > 0 ? p.sub : null;
};

export interface PunchDecision {
  allowed: boolean;
  reason?: string;
  geofence: GeofenceResult;
  plan: PunchPlan;
}

/** What the screen says for each verdict that stops a punch. */
export const VERDICT_MESSAGES: Record<string, string> = {
  no_sites: 'บริษัทยังไม่ได้ตั้งจุดลงเวลา กรุณาติดต่อฝ่ายบุคคล',
  no_position: 'ต้องเปิดตำแหน่งที่ตั้งก่อนลงเวลา',
  imprecise: 'สัญญาณ GPS ไม่แม่นยำพอ ลองใหม่ในที่โล่ง',
  outside: 'อยู่นอกรัศมีของจุดลงเวลา',
};

/**
 * Decide a punch from a verified position and the employee's recent days.
 * @param position - Where the phone is.
 * @param sites - The organization's work sites.
 * @param days - Recent attendance rows of the employee.
 * @param now - The moment of the punch.
 * @param today - Today's date in Bangkok, `YYYY-MM-DD`.
 * @returns Whether to record it, and the figures to record.
 */
export const decidePunch = (position: Position, sites: WorkSite[], days: AttendanceDay[], now: Date, today: string): PunchDecision => {
  const geofence = evaluatePosition(position, sites);
  const plan = planPunch(days, now.toISOString(), today);
  if (geofence.verdict !== 'inside') {
    const detail = geofence.verdict === 'outside' && geofence.site ? ` ${geofence.site.name} เกินมา ${geofence.overshoot_m} ม.` : '';
    return { allowed: false, reason: VERDICT_MESSAGES[geofence.verdict] + detail, geofence, plan };
  }
  if (plan.refusal) return { allowed: false, reason: plan.refusal, geofence, plan };
  return { allowed: true, geofence, plan };
};

/**
 * Today's date in Bangkok.
 * @param now - The current time.
 * @returns `YYYY-MM-DD`.
 */
export const bangkokDate = (now: Date): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
