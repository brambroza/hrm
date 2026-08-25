-- =============================================================================
-- schema_drift_report.sql
--
-- Read-only. Lists where the live database disagrees with schema.sql.
--
-- The live database turned out to be missing columns that schema.sql declares
-- (`organizations.created_at`, `payroll_calculations.payroll_period_id`, ...),
-- and each one aborted the migration on its own line. 0001 now skips whatever
-- is missing and says so, but the drift is still worth seeing: an index that
-- was skipped is a query that will be slow, and a missing foreign key is a
-- feature that will not work.
--
-- Run it after the migrations:
--
--   psql "$DATABASE_URL" -f supabase/tests/schema_drift_report.sql
--
-- Nothing is written and nothing is locked, so it is safe on production.
-- =============================================================================

\pset border 2

-- -----------------------------------------------------------------------------
-- 1. Columns schema.sql declares that the database does not have.
-- -----------------------------------------------------------------------------

with expected(table_name, column_name) as (values
  ('organizations', 'id'), ('organizations', 'name'), ('organizations', 'tax_id'),
  ('organizations', 'address'), ('organizations', 'phone'), ('organizations', 'email'),
  ('organizations', 'created_at'),

  ('departments', 'id'), ('departments', 'name'), ('departments', 'description'),
  ('departments', 'created_at'), ('departments', 'organization_id'),

  ('users', 'id'), ('users', 'organization_id'), ('users', 'email'),
  ('users', 'full_name'), ('users', 'role'), ('users', 'status'),
  ('users', 'created_at'), ('users', 'updated_at'),

  ('roles', 'id'), ('roles', 'name'), ('roles', 'description'),
  ('roles', 'created_at'), ('roles', 'organization_id'),

  ('permissions', 'id'), ('permissions', 'module'), ('permissions', 'name'),
  ('permissions', 'description'), ('permissions', 'created_at'),

  ('role_permissions', 'id'), ('role_permissions', 'role_id'),
  ('role_permissions', 'permission_id'), ('role_permissions', 'created_at'),
  ('role_permissions', 'organization_id'),

  ('employees', 'id'), ('employees', 'user_id'), ('employees', 'organization_id'),
  ('employees', 'employee_id'), ('employees', 'name'), ('employees', 'name_th'),
  ('employees', 'name_en'), ('employees', 'national_id'), ('employees', 'passport_number'),
  ('employees', 'work_permit_number'), ('employees', 'work_permit_expiry'),
  ('employees', 'nationality'), ('employees', 'photo_url'), ('employees', 'department'),
  ('employees', 'position'), ('employees', 'employment_type'), ('employees', 'branch'),
  ('employees', 'start_date'), ('employees', 'end_date'), ('employees', 'salary'),
  ('employees', 'phone'), ('employees', 'email'), ('employees', 'status'),
  ('employees', 'role'), ('employees', 'other_info'), ('employees', 'created_at'),
  ('employees', 'updated_at'),

  ('audit_logs', 'id'), ('audit_logs', 'user_id'), ('audit_logs', 'action'),
  ('audit_logs', 'table_name'), ('audit_logs', 'record_id'), ('audit_logs', 'old_value'),
  ('audit_logs', 'new_value'), ('audit_logs', 'created_at'), ('audit_logs', 'organization_id'),

  ('shifts', 'id'), ('shifts', 'shift_name'), ('shifts', 'shift_type'),
  ('shifts', 'start_time'), ('shifts', 'end_time'), ('shifts', 'break_minutes'),
  ('shifts', 'late_tolerance_minutes'), ('shifts', 'early_leave_tolerance_minutes'),
  ('shifts', 'cross_day_shift'), ('shifts', 'scan_policy'), ('shifts', 'ot_scan_enabled'),
  ('shifts', 'created_at'), ('shifts', 'updated_at'), ('shifts', 'organization_id'),

  ('shift_assignments', 'id'), ('shift_assignments', 'employee_id'),
  ('shift_assignments', 'shift_id'), ('shift_assignments', 'start_date'),
  ('shift_assignments', 'end_date'), ('shift_assignments', 'created_at'),
  ('shift_assignments', 'organization_id'),

  ('attendance_logs', 'id'), ('attendance_logs', 'employee_id'), ('attendance_logs', 'log_date'),
  ('attendance_logs', 'check_in'), ('attendance_logs', 'check_out'),
  ('attendance_logs', 'check_in_morning'), ('attendance_logs', 'check_out_morning'),
  ('attendance_logs', 'check_in_afternoon'), ('attendance_logs', 'check_out_afternoon'),
  ('attendance_logs', 'ot_in'), ('attendance_logs', 'ot_out'),
  ('attendance_logs', 'hours_worked'), ('attendance_logs', 'late_minutes'),
  ('attendance_logs', 'ot_minutes'), ('attendance_logs', 'missing_punch'),
  ('attendance_logs', 'status'), ('attendance_logs', 'source'), ('attendance_logs', 'device_id'),
  ('attendance_logs', 'created_at'), ('attendance_logs', 'organization_id'),

  ('ot_requests', 'id'), ('ot_requests', 'employee_id'), ('ot_requests', 'request_date'),
  ('ot_requests', 'start_time'), ('ot_requests', 'end_time'), ('ot_requests', 'minutes'),
  ('ot_requests', 'reason'), ('ot_requests', 'status'), ('ot_requests', 'approved_by'),
  ('ot_requests', 'approved_at'), ('ot_requests', 'created_at'), ('ot_requests', 'updated_at'),
  ('ot_requests', 'organization_id'),

  ('holidays', 'id'), ('holidays', 'holiday_date'), ('holidays', 'name'),
  ('holidays', 'holiday_type'), ('holidays', 'department'), ('holidays', 'employee_group'),
  ('holidays', 'is_working_day'), ('holidays', 'created_at'), ('holidays', 'organization_id'),

  ('week_offs', 'id'), ('week_offs', 'department'), ('week_offs', 'employee_group'),
  ('week_offs', 'weekday'), ('week_offs', 'created_at'), ('week_offs', 'organization_id'),

  ('leaves', 'id'), ('leaves', 'employee_id'), ('leaves', 'leave_type'),
  ('leaves', 'start_date'), ('leaves', 'end_date'), ('leaves', 'is_half_day'),
  ('leaves', 'reason'), ('leaves', 'attachment_url'), ('leaves', 'status'),
  ('leaves', 'approved_by'), ('leaves', 'approved_at'), ('leaves', 'created_at'),
  ('leaves', 'updated_at'), ('leaves', 'organization_id'),

  ('attendance_policies', 'id'), ('attendance_policies', 'name'),
  ('attendance_policies', 'late_grace_minutes'), ('attendance_policies', 'late_threshold_minutes'),
  ('attendance_policies', 'absent_by_late_minutes'), ('attendance_policies', 'ot_method'),
  ('attendance_policies', 'ot_rounding'), ('attendance_policies', 'missing_scan_action'),
  ('attendance_policies', 'shift_id'), ('attendance_policies', 'department'),
  ('attendance_policies', 'employee_group'), ('attendance_policies', 'created_at'),
  ('attendance_policies', 'updated_at'), ('attendance_policies', 'organization_id'),

  ('work_time_calculations', 'id'), ('work_time_calculations', 'employee_id'),
  ('work_time_calculations', 'work_date'), ('work_time_calculations', 'work_hours'),
  ('work_time_calculations', 'late_minutes'), ('work_time_calculations', 'ot_minutes'),
  ('work_time_calculations', 'absent'), ('work_time_calculations', 'absent_by_late'),
  ('work_time_calculations', 'missing_punch'), ('work_time_calculations', 'leave_status'),
  ('work_time_calculations', 'holiday_status'), ('work_time_calculations', 'created_at'),
  ('work_time_calculations', 'organization_id'),

  ('face_devices', 'id'), ('face_devices', 'device_code'), ('face_devices', 'name'),
  ('face_devices', 'location'), ('face_devices', 'ip_address'), ('face_devices', 'is_active'),
  ('face_devices', 'created_at'), ('face_devices', 'organization_id'),

  ('face_device_logs', 'id'), ('face_device_logs', 'device_id'),
  ('face_device_logs', 'employee_code'), ('face_device_logs', 'employee_id'),
  ('face_device_logs', 'event_time'), ('face_device_logs', 'event_type'),
  ('face_device_logs', 'location'), ('face_device_logs', 'raw_payload'),
  ('face_device_logs', 'created_at'), ('face_device_logs', 'organization_id'),

  ('system_settings', 'id'), ('system_settings', 'organization_id'),
  ('system_settings', 'notification_email'), ('system_settings', 'notification_sms'),
  ('system_settings', 'notification_in_app'), ('system_settings', 'working_days'),
  ('system_settings', 'work_start_time'), ('system_settings', 'work_end_time'),
  ('system_settings', 'lunch_break_start'), ('system_settings', 'lunch_break_end'),
  ('system_settings', 'payroll_date'), ('system_settings', 'payment_method'),
  ('system_settings', 'default_bank'), ('system_settings', 'created_at'),
  ('system_settings', 'updated_at'),

  ('system_backups', 'id'), ('system_backups', 'backup_name'), ('system_backups', 'backup_type'),
  ('system_backups', 'status'), ('system_backups', 'size_mb'), ('system_backups', 'created_at'),
  ('system_backups', 'organization_id'),

  ('app_integrations', 'id'), ('app_integrations', 'name'), ('app_integrations', 'provider'),
  ('app_integrations', 'status'), ('app_integrations', 'config'),
  ('app_integrations', 'created_at'), ('app_integrations', 'updated_at'),
  ('app_integrations', 'organization_id'),

  ('translations', 'id'), ('translations', 'key'), ('translations', 'th'),
  ('translations', 'en'), ('translations', 'category'), ('translations', 'created_at'),
  ('translations', 'updated_at'), ('translations', 'organization_id'),

  ('payroll_periods', 'id'), ('payroll_periods', 'name'), ('payroll_periods', 'start_date'),
  ('payroll_periods', 'end_date'), ('payroll_periods', 'status'),
  ('payroll_periods', 'created_at'), ('payroll_periods', 'updated_at'),
  ('payroll_periods', 'organization_id'),

  ('allowances_deductions', 'id'), ('allowances_deductions', 'name'),
  ('allowances_deductions', 'type'), ('allowances_deductions', 'amount'),
  ('allowances_deductions', 'is_recurring'), ('allowances_deductions', 'created_at'),
  ('allowances_deductions', 'organization_id'),

  ('payroll_calculations', 'id'), ('payroll_calculations', 'employee_id'),
  ('payroll_calculations', 'payroll_period_id'), ('payroll_calculations', 'basic_salary'),
  ('payroll_calculations', 'total_income'), ('payroll_calculations', 'total_deductions'),
  ('payroll_calculations', 'net_salary'), ('payroll_calculations', 'status'),
  ('payroll_calculations', 'created_at'), ('payroll_calculations', 'updated_at'),
  ('payroll_calculations', 'organization_id'),

  ('payroll_slips', 'id'), ('payroll_slips', 'employee_id'),
  ('payroll_slips', 'payroll_period_id'), ('payroll_slips', 'slip_url'),
  ('payroll_slips', 'created_at'), ('payroll_slips', 'organization_id')
)
select
  e.table_name,
  e.column_name as missing_column,
  case when to_regclass(format('public.%I', e.table_name)) is null
       then 'TABLE MISSING'
       else 'column missing'
  end as problem
  from expected e
 where not exists (
   select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = e.table_name
      and c.column_name = e.column_name
 )
 order by 3 desc, 1, 2;

-- -----------------------------------------------------------------------------
-- 2. Indexes 0001 wanted to create but could not.
-- -----------------------------------------------------------------------------

with wanted(index_name) as (values
  ('employees_org_status_idx'), ('employees_org_dept_idx'), ('users_org_idx'),
  ('users_org_role_idx'), ('departments_org_idx'), ('roles_org_idx'),
  ('role_permissions_org_role_idx'), ('audit_logs_org_created_idx'), ('shifts_org_idx'),
  ('shift_assign_org_emp_idx'), ('attendance_logs_org_date_idx'),
  ('attendance_logs_org_emp_date_idx'), ('ot_requests_org_date_idx'),
  ('ot_requests_org_status_idx'), ('holidays_org_date_idx'), ('week_offs_org_idx'),
  ('leaves_org_dates_idx'), ('leaves_org_status_idx'), ('attendance_policies_org_idx'),
  ('work_time_calc_org_date_idx'), ('face_devices_org_idx'), ('face_device_logs_org_time_idx'),
  ('translations_org_idx'), ('payroll_periods_org_idx'), ('allowances_org_idx'),
  ('payroll_calc_org_period_idx'), ('payroll_slips_org_period_idx'),
  ('system_settings_org_idx'), ('app_integrations_org_idx'), ('system_backups_org_idx'),
  ('employees_user_id_idx'), ('departments_org_name_uidx'), ('roles_org_name_uidx'),
  ('translations_org_key_uidx'), ('employees_org_code_uidx'),
  ('work_time_calc_emp_date_uidx'), ('system_settings_org_uidx')
)
select w.index_name as not_created
  from wanted w
 where not exists (
   select 1 from pg_indexes i
    where i.schemaname = 'public' and i.indexname = w.index_name
 )
 order by 1;

-- -----------------------------------------------------------------------------
-- 3. Tables without Row Level Security. This list must be empty.
-- -----------------------------------------------------------------------------

select tablename as rls_not_enabled
  from pg_tables
 where schemaname = 'public'
   and tablename not in ('role_templates', 'role_permission_templates')
   and not rowsecurity
 order by 1;

-- -----------------------------------------------------------------------------
-- 4. Provisioning summary. Every organization should show the same counts.
-- -----------------------------------------------------------------------------

select
  o.name as organization,
  (select count(*) from roles r where r.organization_id = o.id) as roles,
  (select count(*) from role_permissions rp where rp.organization_id = o.id) as grants,
  (select count(*) from employees e where e.organization_id = o.id) as employees
  from organizations o
 order by o.name;
