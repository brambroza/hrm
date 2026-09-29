/**
 * create-user — creates a login and its application user row.
 *
 * The browser cannot do this: creating an auth user needs the service role key,
 * and `public.users` has no INSERT policy on purpose. The function checks that
 * the caller holds `user_management.add` in their own organization, then
 * creates the auth user and the `users` row inside that same organization.
 *
 * Deploy: supabase functions deploy create-user
 * Required secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const ROLES = ['admin', 'hr', 'manager', 'supervisor', 'employee'];
const STATUSES = ['active', 'inactive'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIN_PASSWORD_LENGTH = 8;

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateUserInput {
  full_name: string;
  email: string;
  password: string;
  role: string;
  status: string;
  employee_id: string | null;
}

/**
 * Build a JSON response.
 * @param status - HTTP status code.
 * @param body - Payload to serialise.
 * @returns The response with CORS headers.
 */
const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/**
 * Validate and normalise the request body.
 * @param body - Parsed JSON from the request.
 * @returns The cleaned input, or a message describing the first problem.
 */
export const parseInput = (body: unknown): { input: CreateUserInput } | { error: string } => {
  if (!body || typeof body !== 'object') return { error: 'รูปแบบข้อมูลไม่ถูกต้อง' };
  const raw = body as Record<string, unknown>;

  const fullName = typeof raw.full_name === 'string' ? raw.full_name.trim() : '';
  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  const password = typeof raw.password === 'string' ? raw.password : '';
  const role = typeof raw.role === 'string' ? raw.role.trim().toLowerCase() : '';
  const status = typeof raw.status === 'string' ? raw.status.trim().toLowerCase() : 'active';
  const employeeId = typeof raw.employee_id === 'string' && raw.employee_id !== 'none' ? raw.employee_id : null;

  if (fullName.length < 1 || fullName.length > 200) return { error: 'กรุณาระบุชื่อ-สกุล' };
  if (!EMAIL.test(email) || email.length > 254) return { error: 'อีเมลไม่ถูกต้อง' };
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 72) {
    return { error: `รหัสผ่านต้องยาว ${MIN_PASSWORD_LENGTH} ถึง 72 ตัวอักษร` };
  }
  if (!ROLES.includes(role)) return { error: 'บทบาทไม่ถูกต้อง' };
  if (!STATUSES.includes(status)) return { error: 'สถานะไม่ถูกต้อง' };
  if (employeeId !== null && !UUID.test(employeeId)) return { error: 'รหัสพนักงานไม่ถูกต้อง' };

  return { input: { full_name: fullName, email, password, role, status, employee_id: employeeId } };
};

/**
 * Whether a user's role grants user_management.add in their organization.
 * @param admin - Service-role client.
 * @param organizationId - The caller's organization.
 * @param role - The caller's role name.
 * @returns True when the grant exists.
 */
const canAddUsers = async (admin: SupabaseClient, organizationId: string, role: string): Promise<boolean> => {
  const { data: roleRow } = await admin
    .from('roles')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('name', role)
    .maybeSingle();
  if (!roleRow) return false;

  const { data: grants } = await admin
    .from('role_permissions')
    .select('permissions!inner(module, name)')
    .eq('role_id', roleRow.id)
    .eq('permissions.module', 'user_management')
    .eq('permissions.name', 'add');

  return (grants?.length ?? 0) > 0;
};

/**
 * Handle one create-user request.
 * @param request - Incoming HTTP request.
 * @returns JSON response with the new user, or an error message.
 */
export const handler = async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json(500, { error: 'Function is not configured' });

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json(401, { error: 'กรุณาเข้าสู่ระบบ' });

  // Identify the caller with their own token, never with the service key.
  const asCaller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: callerAuth, error: callerError } = await asCaller.auth.getUser();
  if (callerError || !callerAuth?.user) return json(401, { error: 'กรุณาเข้าสู่ระบบ' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: caller } = await admin
    .from('users')
    .select('organization_id, role, status')
    .eq('id', callerAuth.user.id)
    .maybeSingle();

  if (!caller?.organization_id || caller.status !== 'active') return json(403, { error: 'ไม่มีสิทธิ์เพิ่มผู้ใช้' });
  if (!(await canAddUsers(admin, caller.organization_id, caller.role))) {
    return json(403, { error: 'ไม่มีสิทธิ์เพิ่มผู้ใช้' });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'รูปแบบข้อมูลไม่ถูกต้อง' });
  }

  const parsed = parseInput(body);
  if ('error' in parsed) return json(400, { error: parsed.error });
  const { input } = parsed;

  // Only an admin may create another admin.
  if (input.role === 'admin' && caller.role !== 'admin') {
    return json(403, { error: 'เฉพาะผู้ดูแลระบบเท่านั้นที่เพิ่มผู้ดูแลระบบได้' });
  }

  if (input.employee_id) {
    const { data: employee } = await admin
      .from('employees')
      .select('id, user_id')
      .eq('id', input.employee_id)
      .eq('organization_id', caller.organization_id)
      .maybeSingle();
    if (!employee) return json(400, { error: 'ไม่พบพนักงานที่เลือก' });
    if (employee.user_id) return json(409, { error: 'พนักงานคนนี้มีบัญชีผู้ใช้แล้ว' });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name },
  });
  if (createError || !created?.user) {
    const duplicate = /already|registered|exists/i.test(createError?.message ?? '');
    return json(duplicate ? 409 : 400, { error: duplicate ? 'อีเมลนี้มีผู้ใช้แล้ว' : 'สร้างบัญชีไม่สำเร็จ' });
  }

  const userId = created.user.id;

  const { data: userRow, error: insertError } = await admin
    .from('users')
    .insert({
      id: userId,
      organization_id: caller.organization_id,
      email: input.email,
      full_name: input.full_name,
      role: input.role,
      status: input.status,
    })
    .select('id, organization_id, email, full_name, role, status, created_at')
    .single();

  if (insertError || !userRow) {
    // Do not leave a login behind that has no application user.
    await admin.auth.admin.deleteUser(userId);
    return json(500, { error: 'บันทึกผู้ใช้ไม่สำเร็จ' });
  }

  if (input.employee_id) {
    const { error: linkError } = await admin
      .from('employees')
      .update({ user_id: userId })
      .eq('id', input.employee_id)
      .eq('organization_id', caller.organization_id);
    if (linkError) {
      return json(201, { user: userRow, warning: 'สร้างผู้ใช้แล้ว แต่ผูกกับพนักงานไม่สำเร็จ' });
    }
  }

  await admin.from('audit_logs').insert({
    organization_id: caller.organization_id,
    user_id: callerAuth.user.id,
    action: 'INSERT',
    table_name: 'users',
    record_id: userId,
    old_value: null,
    new_value: userRow,
  });

  return json(201, { user: userRow });
};

if (import.meta.main) {
  Deno.serve(handler);
}
