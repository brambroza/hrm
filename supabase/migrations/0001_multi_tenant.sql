-- =============================================================================
-- 0001_multi_tenant.sql
--
-- Turns the single-company schema into a real multi-tenant one.
--
-- Before this migration only `users` and `employees` carried `organization_id`,
-- so every other table (shifts, attendance, leaves, payroll, ...) was shared by
-- all tenants. This adds the tenant key everywhere, rescopes the global unique
-- constraints that made two companies collide, and backfills existing rows.
--
-- Run order: 0001 -> 0002 (RLS) -> 0003 (org provisioning).
-- Safe to re-run: every statement is idempotent.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Make sure a default organization exists to backfill into.
-- -----------------------------------------------------------------------------

insert into organizations (name)
select 'Default Organization'
where not exists (select 1 from organizations);

-- The oldest organization is treated as the owner of all pre-existing data.
create or replace function _default_organization_id()
returns uuid
language sql
stable
as $$
  select id from organizations order by created_at, id limit 1;
$$;

-- -----------------------------------------------------------------------------
-- 2. Add organization_id to every tenant-scoped table.
--
--    `permissions` is deliberately excluded: it is a global catalogue of
--    module/action pairs that is identical for every tenant. `organizations`
--    is the tenant itself.
-- -----------------------------------------------------------------------------

alter table departments            add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table roles                  add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table role_permissions       add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table audit_logs             add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table shifts                 add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table shift_assignments      add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table attendance_logs        add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table ot_requests            add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table holidays               add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table week_offs              add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table leaves                 add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table attendance_policies    add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table work_time_calculations add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table face_devices           add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table face_device_logs       add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table system_backups         add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table app_integrations       add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table translations           add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table payroll_periods        add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table allowances_deductions  add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table payroll_calculations   add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table payroll_slips          add column if not exists organization_id uuid references organizations(id) on delete cascade;

-- `system_settings` already had the column but under a different name.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'system_settings' and column_name = 'org_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'system_settings' and column_name = 'organization_id'
  ) then
    alter table system_settings rename column org_id to organization_id;
  end if;
end $$;

alter table system_settings add column if not exists organization_id uuid references organizations(id) on delete cascade;

-- -----------------------------------------------------------------------------
-- 3. Backfill.
--
--    Tables that hang off an employee inherit that employee's organization, so
--    they stay correct even if the database already holds more than one tenant.
--    Standalone tables fall back to the default organization.
-- -----------------------------------------------------------------------------

update shift_assignments      t set organization_id = e.organization_id from employees e where t.employee_id = e.id and t.organization_id is null;
update attendance_logs        t set organization_id = e.organization_id from employees e where t.employee_id = e.id and t.organization_id is null;
update ot_requests            t set organization_id = e.organization_id from employees e where t.employee_id = e.id and t.organization_id is null;
update leaves                 t set organization_id = e.organization_id from employees e where t.employee_id = e.id and t.organization_id is null;
update work_time_calculations t set organization_id = e.organization_id from employees e where t.employee_id = e.id and t.organization_id is null;
update payroll_calculations   t set organization_id = e.organization_id from employees e where t.employee_id = e.id and t.organization_id is null;
update payroll_slips          t set organization_id = e.organization_id from employees e where t.employee_id = e.id and t.organization_id is null;
update face_device_logs       t set organization_id = e.organization_id from employees e where t.employee_id = e.id and t.organization_id is null;
update audit_logs             t set organization_id = u.organization_id from users     u where t.user_id     = u.id and t.organization_id is null;

do $$
declare
  default_org uuid := _default_organization_id();
begin
  update users                  set organization_id = default_org where organization_id is null;
  update employees              set organization_id = default_org where organization_id is null;
  update departments            set organization_id = default_org where organization_id is null;
  update roles                  set organization_id = default_org where organization_id is null;
  update audit_logs             set organization_id = default_org where organization_id is null;
  update shifts                 set organization_id = default_org where organization_id is null;
  update shift_assignments      set organization_id = default_org where organization_id is null;
  update attendance_logs        set organization_id = default_org where organization_id is null;
  update ot_requests            set organization_id = default_org where organization_id is null;
  update holidays               set organization_id = default_org where organization_id is null;
  update week_offs              set organization_id = default_org where organization_id is null;
  update leaves                 set organization_id = default_org where organization_id is null;
  update attendance_policies    set organization_id = default_org where organization_id is null;
  update work_time_calculations set organization_id = default_org where organization_id is null;
  update face_devices           set organization_id = default_org where organization_id is null;
  update face_device_logs       set organization_id = default_org where organization_id is null;
  update system_backups         set organization_id = default_org where organization_id is null;
  update system_settings        set organization_id = default_org where organization_id is null;
  update app_integrations       set organization_id = default_org where organization_id is null;
  update translations           set organization_id = default_org where organization_id is null;
  update payroll_periods        set organization_id = default_org where organization_id is null;
  update allowances_deductions  set organization_id = default_org where organization_id is null;
  update payroll_calculations   set organization_id = default_org where organization_id is null;
  update payroll_slips          set organization_id = default_org where organization_id is null;
end $$;

-- role_permissions inherits from its role.
update role_permissions rp
   set organization_id = r.organization_id
  from roles r
 where rp.role_id = r.id
   and rp.organization_id is null;

-- -----------------------------------------------------------------------------
-- 4. Enforce NOT NULL now that everything is backfilled.
--
--    `users.organization_id` stays nullable on purpose: a freshly signed-up
--    account exists for a moment before its organization is provisioned.
--    `audit_logs.organization_id` stays nullable so a failed login attempt with
--    no known tenant can still be recorded.
-- -----------------------------------------------------------------------------

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'employees', 'departments', 'roles', 'role_permissions', 'shifts',
    'shift_assignments', 'attendance_logs', 'ot_requests', 'holidays',
    'week_offs', 'leaves', 'attendance_policies', 'work_time_calculations',
    'face_devices', 'system_backups', 'system_settings', 'app_integrations',
    'translations', 'payroll_periods', 'allowances_deductions',
    'payroll_calculations', 'payroll_slips'
  ]
  loop
    execute format('alter table %I alter column organization_id set not null', tbl);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 5. Rescope the global unique constraints.
--
--    These were the constraints that made a second tenant impossible: company B
--    could not create a department named "บัญชี" because company A already had
--    one, and employee codes collided across companies.
-- -----------------------------------------------------------------------------

alter table departments  drop constraint if exists departments_name_key;
alter table roles        drop constraint if exists roles_name_key;
alter table translations drop constraint if exists translations_key_key;
alter table employees    drop constraint if exists employees_employee_id_key;
alter table work_time_calculations drop constraint if exists work_time_calculations_employee_id_work_date_key;

create unique index if not exists departments_org_name_uidx  on departments  (organization_id, name);
create unique index if not exists roles_org_name_uidx        on roles        (organization_id, name);
create unique index if not exists translations_org_key_uidx  on translations (organization_id, key);
create unique index if not exists employees_org_code_uidx    on employees    (organization_id, employee_id);
create unique index if not exists work_time_calc_emp_date_uidx on work_time_calculations (employee_id, work_date);

-- role_permissions was unique on (role_id, permission_id); role_id is already
-- org-scoped so that constraint stays correct as-is.

-- -----------------------------------------------------------------------------
-- 6. Tenant-first indexes.
--
--    Every query now filters on organization_id, so it must lead the index.
-- -----------------------------------------------------------------------------

create index if not exists employees_org_status_idx        on employees             (organization_id, status);
create index if not exists employees_org_dept_idx          on employees             (organization_id, department);
create index if not exists users_org_idx                   on users                 (organization_id);
create index if not exists users_org_role_idx              on users                 (organization_id, role);
create index if not exists departments_org_idx             on departments           (organization_id);
create index if not exists roles_org_idx                   on roles                 (organization_id);
create index if not exists role_permissions_org_role_idx   on role_permissions      (organization_id, role_id);
create index if not exists audit_logs_org_created_idx      on audit_logs            (organization_id, created_at desc);
create index if not exists shifts_org_idx                  on shifts                (organization_id);
create index if not exists shift_assign_org_emp_idx        on shift_assignments     (organization_id, employee_id, start_date);
create index if not exists attendance_logs_org_date_idx    on attendance_logs       (organization_id, log_date);
create index if not exists attendance_logs_org_emp_date_idx on attendance_logs      (organization_id, employee_id, log_date);
create index if not exists ot_requests_org_date_idx        on ot_requests           (organization_id, request_date);
create index if not exists ot_requests_org_status_idx      on ot_requests           (organization_id, status);
create index if not exists holidays_org_date_idx           on holidays              (organization_id, holiday_date);
create index if not exists week_offs_org_idx               on week_offs             (organization_id);
create index if not exists leaves_org_dates_idx            on leaves                (organization_id, start_date, end_date);
create index if not exists leaves_org_status_idx           on leaves                (organization_id, status);
create index if not exists attendance_policies_org_idx     on attendance_policies   (organization_id);
create index if not exists work_time_calc_org_date_idx     on work_time_calculations (organization_id, work_date);
create index if not exists face_devices_org_idx            on face_devices          (organization_id);
create index if not exists face_device_logs_org_time_idx   on face_device_logs      (organization_id, event_time desc);
create index if not exists translations_org_idx            on translations          (organization_id);
create index if not exists payroll_periods_org_idx         on payroll_periods       (organization_id, start_date desc);
create index if not exists allowances_org_idx              on allowances_deductions (organization_id);
create index if not exists payroll_calc_org_period_idx     on payroll_calculations  (organization_id, payroll_period_id);
create index if not exists payroll_slips_org_period_idx    on payroll_slips         (organization_id, payroll_period_id);
create index if not exists system_settings_org_idx         on system_settings       (organization_id);
create index if not exists app_integrations_org_idx        on app_integrations      (organization_id);
create index if not exists system_backups_org_idx          on system_backups        (organization_id);

-- Needed by the RLS self-access policies added in 0002.
create index if not exists employees_user_id_idx on employees (user_id);

-- -----------------------------------------------------------------------------
-- 7. One settings row per organization.
-- -----------------------------------------------------------------------------

-- Collapse duplicates before adding the constraint, keeping the newest row.
delete from system_settings s
 where exists (
   select 1 from system_settings newer
    where newer.organization_id = s.organization_id
      and (newer.updated_at, newer.id) > (s.updated_at, s.id)
 );

create unique index if not exists system_settings_org_uidx on system_settings (organization_id);

commit;
