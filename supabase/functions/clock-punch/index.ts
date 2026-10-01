/**
 * clock-punch — records a clock-in or clock-out from a phone.
 *
 * The phone screen runs in a browser (signed in to the app) or inside LINE
 * (LIFF, signed in to LINE). Either way the position is checked here, on the
 * server, against the organization's work sites, and the punch is written
 * with the service role. Employees cannot write punches themselves.
 *
 * Who is punching:
 *   - App user:  Authorization: Bearer <Supabase access token>
 *   - LINE user: body.lineIdToken, verified with LINE for our channel
 *
 * Actions (body.action):
 *   status  what the screen needs: employee, sites, today's rows
 *   punch   record a punch at body.position
 *   link    LINE only: tie this LINE account to an employee by
 *           body.employeeCode + body.nationalId
 *
 * Deploy:   supabase functions deploy clock-punch --no-verify-jwt
 * Secrets:  LINE_CHANNEL_ID   the LINE Login channel id (public id, not the secret)
 *           ALLOWED_ORIGIN    the site address, for CORS
 *
 * --no-verify-jwt is needed because LINE users carry no Supabase JWT; the
 * function verifies identity itself for both kinds of caller.
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { bangkokDate, decidePunch, lineUserFromVerification, parseRequest, type ParsedRequest } from './logic.ts';
import type { WorkSite } from '../_shared/geofence.ts';
import type { AttendanceDay } from '../_shared/punch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

interface Employee {
  id: string;
  organization_id: string;
  employee_id: string;
  name: string;
  name_th: string | null;
  status: string;
  line_user_id: string | null;
}

const EMPLOYEE_COLUMNS = 'id, organization_id, employee_id, name, name_th, status, line_user_id';

/**
 * Verify a LINE ID token with LINE.
 * @param idToken - Token from liff.getIDToken().
 * @param channelId - Our channel id.
 * @returns The LINE user id, or null when the token is not ours or expired.
 */
const verifyLineToken = async (idToken: string, channelId: string): Promise<string | null> => {
  const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });
  if (!response.ok) return null;
  return lineUserFromVerification(await response.json(), channelId, new Date());
};

/**
 * Work out who is calling.
 * @returns The employee, or for an unlinked LINE user their LINE id, or an error.
 */
const identify = async (
  admin: SupabaseClient,
  request: Request,
  parsed: ParsedRequest,
  channelId: string | undefined,
): Promise<{ employee: Employee | null; lineUserId: string | null; source: 'mobile' | 'line'; error?: string }> => {
  if (parsed.lineIdToken) {
    if (!channelId) return { employee: null, lineUserId: null, source: 'line', error: 'ยังไม่ได้ตั้งค่า LINE' };
    const lineUserId = await verifyLineToken(parsed.lineIdToken, channelId);
    if (!lineUserId) return { employee: null, lineUserId: null, source: 'line', error: 'ยืนยันตัวตนกับ LINE ไม่สำเร็จ' };
    const { data } = await admin.from('employees').select(EMPLOYEE_COLUMNS).eq('line_user_id', lineUserId).maybeSingle();
    return { employee: (data as Employee | null) ?? null, lineUserId, source: 'line' };
  }

  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return { employee: null, lineUserId: null, source: 'mobile', error: 'กรุณาเข้าสู่ระบบ' };
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData.user) return { employee: null, lineUserId: null, source: 'mobile', error: 'กรุณาเข้าสู่ระบบ' };
  const { data } = await admin.from('employees').select(EMPLOYEE_COLUMNS).eq('user_id', userData.user.id).maybeSingle();
  if (!data) return { employee: null, lineUserId: null, source: 'mobile', error: 'บัญชีนี้ยังไม่ได้ผูกกับพนักงาน กรุณาติดต่อฝ่ายบุคคล' };
  return { employee: data as Employee, lineUserId: null, source: 'mobile' };
};

const recentDays = async (admin: SupabaseClient, employeeId: string, today: string): Promise<AttendanceDay[]> => {
  const since = new Date(`${today}T00:00:00+07:00`);
  since.setUTCDate(since.getUTCDate() - 2);
  const { data } = await admin
    .from('attendance_logs')
    .select('id, log_date, check_in, check_out')
    .eq('employee_id', employeeId)
    .gte('log_date', bangkokDate(since))
    .order('log_date', { ascending: false });
  return (data as AttendanceDay[] | null) ?? [];
};

const activeSites = async (admin: SupabaseClient, organizationId: string): Promise<WorkSite[]> => {
  const { data } = await admin
    .from('work_sites')
    .select('id, name, latitude, longitude, radius_m, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true);
  return (data as WorkSite[] | null) ?? [];
};

/**
 * Handle one request.
 * @param request - Incoming HTTP request.
 * @returns JSON for the screen.
 */
export const handler = async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const channelId = Deno.env.get('LINE_CHANNEL_ID');
  if (!url || !serviceKey) return json(500, { error: 'Function is not configured' });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'คำขอไม่ถูกต้อง' });
  }
  const parsed = parseRequest(body);
  if (!parsed.ok) return json(400, { error: parsed.error });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const who = await identify(admin, request, parsed.request, channelId);
  if (who.error) return json(401, { error: who.error });

  const now = new Date();
  const today = bangkokDate(now);

  // A LINE user we do not know yet may only link.
  if (!who.employee) {
    if (parsed.request.action === 'link' && who.lineUserId) {
      const { data: match } = await admin
        .from('employees')
        .select(EMPLOYEE_COLUMNS)
        .eq('employee_id', parsed.request.employeeCode)
        .eq('national_id', parsed.request.nationalId)
        .eq('status', 'active')
        .maybeSingle();
      // Same answer for a wrong code, a wrong id or an already linked employee, so nothing can be probed.
      if (!match || (match as Employee).line_user_id) return json(403, { error: 'ข้อมูลไม่ตรงกับพนักงานที่ยังไม่ได้ผูกบัญชี' });
      const { error } = await admin
        .from('employees')
        .update({ line_user_id: who.lineUserId, line_linked_at: now.toISOString() })
        .eq('id', (match as Employee).id)
        .is('line_user_id', null);
      if (error) return json(409, { error: 'ผูกบัญชีไม่สำเร็จ ลองใหม่อีกครั้ง' });
      return json(200, { linked: true });
    }
    return json(200, { linked: false });
  }

  const employee = who.employee;
  if (employee.status !== 'active') return json(403, { error: 'บัญชีพนักงานนี้ไม่ได้ใช้งานแล้ว' });
  if (parsed.request.action === 'link') return json(200, { linked: true });

  const [sites, days] = await Promise.all([activeSites(admin, employee.organization_id), recentDays(admin, employee.id, today)]);
  const summary = {
    linked: true,
    employee: { code: employee.employee_id, name: employee.name_th || employee.name },
    sites: sites.map((site) => ({ id: site.id, name: site.name, latitude: site.latitude, longitude: site.longitude, radius_m: site.radius_m })),
    days,
    serverTime: now.toISOString(),
  };
  if (parsed.request.action === 'status') return json(200, summary);

  const decision = decidePunch(parsed.request.position as NonNullable<ParsedRequest['position']>, sites, days, now, today);
  const punchRow = {
    organization_id: employee.organization_id,
    employee_id: employee.id,
    kind: decision.plan.kind,
    punched_at: now.toISOString(),
    source: who.source,
    latitude: parsed.request.position?.latitude,
    longitude: parsed.request.position?.longitude,
    accuracy_m: parsed.request.position?.accuracy ?? null,
    work_site_id: decision.geofence.site?.id ?? null,
    distance_m: decision.geofence.distance_m,
    within_radius: decision.geofence.verdict === 'inside',
    line_user_id: who.lineUserId,
    user_agent: (request.headers.get('User-Agent') || '').slice(0, 300),
  };

  if (!decision.allowed) {
    // A refused attempt is still recorded: HR can see who tried from where.
    await admin.from('clock_punches').insert(punchRow);
    return json(422, { error: decision.reason, geofence: decision.geofence, kind: decision.plan.kind });
  }

  const { data: punch, error: punchError } = await admin.from('clock_punches').insert(punchRow).select('id').single();
  if (punchError || !punch) return json(500, { error: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง' });

  if (decision.plan.kind === 'in') {
    const { error } = await admin.from('attendance_logs').insert({
      organization_id: employee.organization_id,
      employee_id: employee.id,
      log_date: today,
      check_in: now.toISOString(),
      source: who.source,
      check_in_punch_id: punch.id,
    });
    if (error) return json(500, { error: 'บันทึกเวลาเข้าไม่สำเร็จ ลองใหม่อีกครั้ง' });
  } else if (decision.plan.target) {
    const { error } = await admin
      .from('attendance_logs')
      .update({ check_out: now.toISOString(), check_out_punch_id: punch.id })
      .eq('id', decision.plan.target.id)
      .is('check_out', null);
    if (error) return json(500, { error: 'บันทึกเวลาออกไม่สำเร็จ ลองใหม่อีกครั้ง' });
  }

  return json(200, {
    recorded: true,
    kind: decision.plan.kind,
    at: now.toISOString(),
    site: decision.geofence.site?.name ?? null,
    distance_m: decision.geofence.distance_m,
  });
};

if (import.meta.main) {
  Deno.serve(handler);
}
