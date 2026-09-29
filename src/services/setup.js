import { supabase } from '@/lib/customSupabaseClient';

/**
 * Read every record the guided setup works with.
 * @param {string} organizationId - The user's organization.
 * @returns {Promise<object>} Records in the shape of SetupRecords.
 * @throws {Error} When any read fails; a partial picture would produce a wrong plan.
 */
export const loadSetupRecords = async (organizationId) => {
  if (!organizationId) throw new Error('ไม่พบองค์กรของผู้ใช้');

  const [organization, settings, shifts, weekOffs, policy, holidays, departments] = await Promise.all([
    supabase.from('organizations').select('id, name, tax_id, address, phone, email').eq('id', organizationId).maybeSingle(),
    supabase
      .from('system_settings')
      .select('id, working_days, work_start_time, work_end_time, lunch_break_start, lunch_break_end, payroll_date, payment_method, default_bank')
      .eq('organization_id', organizationId)
      .maybeSingle(),
    supabase.from('shifts').select('id, shift_name').order('created_at'),
    supabase.from('week_offs').select('id, weekday, department, employee_group').order('weekday'),
    supabase
      .from('attendance_policies')
      .select('id, late_grace_minutes, absent_by_late_minutes, ot_method, ot_rounding')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from('holidays').select('id, holiday_date, name, department, employee_group').order('holiday_date'),
    supabase.from('departments').select('id, name').order('name'),
  ]);

  const failed = [organization, settings, shifts, weekOffs, policy, holidays, departments].find((result) => result.error);
  if (failed) throw failed.error;

  return {
    organization: organization.data,
    settings: settings.data,
    shifts: shifts.data || [],
    weekOffs: weekOffs.data || [],
    policy: policy.data,
    holidays: holidays.data || [],
    departments: departments.data || [],
  };
};

/**
 * Insert or update one row and make sure it really was written.
 * A write filtered out by row level security returns no error and no row.
 * @param {string} table - Table name.
 * @param {string|null} id - Row to update, or null to insert.
 * @param {object} values - Column values.
 * @returns {Promise<void>}
 * @throws {Error} When the write fails or touches no row.
 */
const saveRow = async (table, id, values) => {
  const query = id
    ? supabase.from(table).update(values).eq('id', id)
    : supabase.from(table).insert([values]);
  const { data, error } = await query.select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('ไม่มีสิทธิ์บันทึกส่วนนี้');
};

/**
 * Remove rows by id.
 * @param {string} table - Table name.
 * @param {string[]} ids - Rows to remove.
 * @returns {Promise<void>}
 * @throws {Error} When the removal fails or removes fewer rows than asked.
 */
const removeRows = async (table, ids) => {
  if (ids.length === 0) return;
  const { data, error } = await supabase.from(table).delete().in('id', ids).select('id');
  if (error) throw error;
  if ((data || []).length !== ids.length) throw new Error('ไม่มีสิทธิ์ลบบางรายการ');
};

/**
 * Add rows.
 * @param {string} table - Table name.
 * @param {object[]} rows - Rows to add.
 * @returns {Promise<void>}
 * @throws {Error} When the insert fails or adds fewer rows than asked.
 */
const addRows = async (table, rows) => {
  if (rows.length === 0) return;
  const { data, error } = await supabase.from(table).insert(rows).select('id');
  if (error) throw error;
  if ((data || []).length !== rows.length) throw new Error('ไม่มีสิทธิ์เพิ่มบางรายการ');
};

/**
 * Apply a setup plan, section by section.
 *
 * The browser cannot wrap these writes in one transaction, so each section is
 * attempted on its own and reported on its own. Every section is safe to
 * repeat: saving again after a failure redoes only what is still different.
 *
 * @param {object} plan - A plan from buildSetupPlan.
 * @returns {Promise<Array<{section: string, ok: boolean, message?: string}>>} One entry per section, in order.
 */
export const applySetupPlan = async (plan) => {
  const sections = [
    ['company', async () => {
      if (!plan.organization.id) throw new Error('ไม่พบองค์กรของผู้ใช้');
      await saveRow('organizations', plan.organization.id, plan.organization.values);
    }],
    ['settings', () => saveRow('system_settings', plan.settings.id, plan.settings.values)],
    ['shift', () => saveRow('shifts', plan.shift.id, plan.shift.values)],
    ['weekOffs', async () => {
      await removeRows('week_offs', plan.weekOffs.removeIds);
      await addRows('week_offs', plan.weekOffs.add.map((weekday) => ({ weekday })));
    }],
    ['policy', () => saveRow('attendance_policies', plan.policy.id, plan.policy.values)],
    ['holidays', async () => {
      await removeRows('holidays', plan.holidays.removeIds);
      for (const holiday of plan.holidays.update) {
        await saveRow('holidays', holiday.id, { name: holiday.name });
      }
      await addRows('holidays', plan.holidays.add.map((holiday) => ({ ...holiday, holiday_type: 'public', is_working_day: false })));
    }],
    ['departments', () => addRows('departments', plan.departments.add.map((name) => ({ name })))],
  ];

  const results = [];
  for (const [section, run] of sections) {
    try {
      await run();
      results.push({ section, ok: true });
    } catch (error) {
      results.push({ section, ok: false, message: error?.message || String(error) });
    }
  }
  return results;
};
