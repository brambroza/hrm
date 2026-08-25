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
-- 0a. Drift helpers.
--
--     The live database does not match schema.sql column for column, and each
--     mismatch previously aborted the whole migration on its own line. Rather
--     than chasing them one at a time, anything optional below is guarded and
--     skipped with a notice, so the tenant work itself always completes.
--
--     Run `tests/schema_drift_report.sql` afterwards to see what was skipped.
-- -----------------------------------------------------------------------------

create or replace function _has_column(p_table text, p_column text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = p_table
       and column_name = p_column
  );
$$;

/**
 * Create an index only when every column it needs exists.
 *
 * @param p_name     index name
 * @param p_table    table to index
 * @param p_columns  index body, e.g. 'organization_id, log_date'
 * @param p_needs    columns that must exist first
 */
create or replace function _try_index(p_name text, p_table text, p_columns text, p_needs text[])
returns void
language plpgsql
as $$
declare
  col text;
begin
  if to_regclass(format('public.%I', p_table)) is null then
    raise notice 'skipped index % — table % does not exist', p_name, p_table;
    return;
  end if;

  foreach col in array p_needs loop
    if not _has_column(p_table, col) then
      raise notice 'skipped index % — %.% does not exist', p_name, p_table, col;
      return;
    end if;
  end loop;

  execute format('create index if not exists %I on %I (%s)', p_name, p_table, p_columns);
end;
$$;

/**
 * Same guard, for unique indexes.
 *
 * @param p_name     index name
 * @param p_table    table to index
 * @param p_columns  index body
 * @param p_needs    columns that must exist first
 */
create or replace function _try_unique_index(p_name text, p_table text, p_columns text, p_needs text[])
returns void
language plpgsql
as $$
declare
  col text;
begin
  if to_regclass(format('public.%I', p_table)) is null then
    raise notice 'skipped unique index % — table % does not exist', p_name, p_table;
    return;
  end if;

  foreach col in array p_needs loop
    if not _has_column(p_table, col) then
      raise notice 'skipped unique index % — %.% does not exist', p_name, p_table, col;
      return;
    end if;
  end loop;

  execute format('create unique index if not exists %I on %I (%s)', p_name, p_table, p_columns);
end;
$$;

-- -----------------------------------------------------------------------------
-- 0. Heal timestamp columns that drifted away from schema.sql.
--
--    The live database does not carry every `created_at` / `updated_at` that
--    schema.sql declares, and the application depends on them: the audit trail
--    takes its timestamp from the `created_at` default, and the dashboard,
--    audit log and payroll screens all order by it. Adding them here is
--    idempotent and leaves existing columns untouched.
--
--    Existing rows get now() as their timestamp, which is wrong but harmless —
--    it only means pre-migration rows all appear to have been created at the
--    moment of the migration.
-- -----------------------------------------------------------------------------

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'organizations', 'departments', 'users', 'roles', 'permissions',
    'role_permissions', 'employees', 'audit_logs', 'shifts', 'shift_assignments',
    'attendance_logs', 'ot_requests', 'holidays', 'week_offs', 'leaves',
    'attendance_policies', 'work_time_calculations', 'face_devices',
    'face_device_logs', 'system_settings', 'system_backups', 'app_integrations',
    'translations', 'payroll_periods', 'allowances_deductions',
    'payroll_calculations', 'payroll_slips'
  ]
  loop
    -- Skip anything the database does not have, so a partially applied
    -- schema.sql fails later with a clear message about the missing table
    -- rather than aborting here.
    if to_regclass(format('public.%I', tbl)) is not null then
      execute format(
        'alter table %I add column if not exists created_at timestamptz not null default now()', tbl);
    end if;
  end loop;

  -- Only the tables schema.sql gives an updated_at.
  foreach tbl in array array[
    'users', 'employees', 'shifts', 'ot_requests', 'leaves',
    'attendance_policies', 'system_settings', 'app_integrations', 'translations',
    'payroll_periods', 'payroll_calculations'
  ]
  loop
    if to_regclass(format('public.%I', tbl)) is not null then
      execute format(
        'alter table %I add column if not exists updated_at timestamptz not null default now()', tbl);
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 0b. Heal structural columns the application cannot work without.
--
--     `payroll_period_id` is missing from the payroll tables in the live
--     database, but services/payroll.js selects it and joins payroll_periods
--     through it — so the payroll screens are already broken there, migration
--     or no migration. Adding it back is safe: existing rows get null, which is
--     exactly the state they are in today.
--
--     Each column is added only where it is absent, so a healthy database is
--     untouched.
-- -----------------------------------------------------------------------------

do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('payroll_calculations', 'payroll_period_id', 'uuid references payroll_periods(id)'),
      ('payroll_slips',        'payroll_period_id', 'uuid references payroll_periods(id)'),
      ('payroll_slips',        'slip_url',          'text'),
      ('employees',            'photo_url',         'text'),
      ('employees',            'work_permit_expiry','date'),
      ('employees',            'other_info',        'jsonb')
    ) as t(table_name, column_name, definition)
  loop
    if to_regclass(format('public.%I', spec.table_name)) is null then
      raise notice 'skipped %.% — table does not exist', spec.table_name, spec.column_name;
      continue;
    end if;

    if _has_column(spec.table_name, spec.column_name) then
      continue;
    end if;

    execute format('alter table %I add column %I %s',
                   spec.table_name, spec.column_name, spec.definition);
    raise notice 'restored missing column %.%', spec.table_name, spec.column_name;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 1. Make sure a default organization exists to backfill into.
-- -----------------------------------------------------------------------------

insert into organizations (name)
select 'Default Organization'
where not exists (select 1 from organizations);

-- One organization is treated as the owner of all pre-existing data.
--
-- Ordering is by id alone rather than by created_at: the live database does not
-- necessarily carry the timestamp columns that schema.sql declares, and a plain
-- SQL function body is validated the moment it is created, so referencing a
-- missing column here aborted the whole migration. Ordering by the primary key
-- is deterministic, which is all this needs.
create or replace function _default_organization_id()
returns uuid
language sql
stable
as $$
  select id from organizations order by id limit 1;
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

-- Each of these inherits its tenant from the employee it belongs to. The list
-- is driven rather than written out so a table missing employee_id in a drifted
-- database is skipped with a notice instead of aborting the migration.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'shift_assignments', 'attendance_logs', 'ot_requests', 'leaves',
    'work_time_calculations', 'payroll_calculations', 'payroll_slips',
    'face_device_logs'
  ]
  loop
    if to_regclass(format('public.%I', tbl)) is null or not _has_column(tbl, 'employee_id') then
      raise notice 'skipped employee backfill for % — table or employee_id missing', tbl;
      continue;
    end if;

    execute format(
      'update %I t set organization_id = e.organization_id from employees e
        where t.employee_id = e.id and t.organization_id is null', tbl);
  end loop;

  if _has_column('audit_logs', 'user_id') then
    update audit_logs t
       set organization_id = u.organization_id
      from users u
     where t.user_id = u.id
       and t.organization_id is null;
  end if;
end $$;

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

select _try_unique_index('departments_org_name_uidx',    'departments',            'organization_id, name',        array['organization_id','name']);
select _try_unique_index('roles_org_name_uidx',          'roles',                  'organization_id, name',        array['organization_id','name']);
select _try_unique_index('translations_org_key_uidx',    'translations',           'organization_id, key',         array['organization_id','key']);
select _try_unique_index('employees_org_code_uidx',      'employees',              'organization_id, employee_id', array['organization_id','employee_id']);
select _try_unique_index('work_time_calc_emp_date_uidx', 'work_time_calculations', 'employee_id, work_date',       array['employee_id','work_date']);

-- role_permissions was unique on (role_id, permission_id); role_id is already
-- org-scoped so that constraint stays correct as-is.

-- -----------------------------------------------------------------------------
-- 6. Tenant-first indexes.
--
--    Every query now filters on organization_id, so it must lead the index.
-- -----------------------------------------------------------------------------

select _try_index('employees_org_status_idx',        'employees',              'organization_id, status',                    array['organization_id', 'status']);
select _try_index('employees_org_dept_idx',          'employees',              'organization_id, department',                array['organization_id', 'department']);
select _try_index('users_org_idx',                   'users',                  'organization_id',                            array['organization_id']);
select _try_index('users_org_role_idx',              'users',                  'organization_id, role',                      array['organization_id', 'role']);
select _try_index('departments_org_idx',             'departments',            'organization_id',                            array['organization_id']);
select _try_index('roles_org_idx',                   'roles',                  'organization_id',                            array['organization_id']);
select _try_index('role_permissions_org_role_idx',   'role_permissions',       'organization_id, role_id',                   array['organization_id', 'role_id']);
select _try_index('audit_logs_org_created_idx',      'audit_logs',             'organization_id, created_at desc',           array['organization_id', 'created_at']);
select _try_index('shifts_org_idx',                  'shifts',                 'organization_id',                            array['organization_id']);
select _try_index('shift_assign_org_emp_idx',        'shift_assignments',      'organization_id, employee_id, start_date',   array['organization_id', 'employee_id', 'start_date']);
select _try_index('attendance_logs_org_date_idx',    'attendance_logs',        'organization_id, log_date',                  array['organization_id', 'log_date']);
select _try_index('attendance_logs_org_emp_date_idx', 'attendance_logs',        'organization_id, employee_id, log_date',     array['organization_id', 'employee_id', 'log_date']);
select _try_index('ot_requests_org_date_idx',        'ot_requests',            'organization_id, request_date',              array['organization_id', 'request_date']);
select _try_index('ot_requests_org_status_idx',      'ot_requests',            'organization_id, status',                    array['organization_id', 'status']);
select _try_index('holidays_org_date_idx',           'holidays',               'organization_id, holiday_date',              array['organization_id', 'holiday_date']);
select _try_index('week_offs_org_idx',               'week_offs',              'organization_id',                            array['organization_id']);
select _try_index('leaves_org_dates_idx',            'leaves',                 'organization_id, start_date, end_date',      array['organization_id', 'start_date', 'end_date']);
select _try_index('leaves_org_status_idx',           'leaves',                 'organization_id, status',                    array['organization_id', 'status']);
select _try_index('attendance_policies_org_idx',     'attendance_policies',    'organization_id',                            array['organization_id']);
select _try_index('work_time_calc_org_date_idx',     'work_time_calculations', 'organization_id, work_date',                 array['organization_id', 'work_date']);
select _try_index('face_devices_org_idx',            'face_devices',           'organization_id',                            array['organization_id']);
select _try_index('face_device_logs_org_time_idx',   'face_device_logs',       'organization_id, event_time desc',           array['organization_id', 'event_time']);
select _try_index('translations_org_idx',            'translations',           'organization_id',                            array['organization_id']);
select _try_index('payroll_periods_org_idx',         'payroll_periods',        'organization_id, start_date desc',           array['organization_id', 'start_date']);
select _try_index('allowances_org_idx',              'allowances_deductions',  'organization_id',                            array['organization_id']);
select _try_index('payroll_calc_org_period_idx',     'payroll_calculations',   'organization_id, payroll_period_id',         array['organization_id', 'payroll_period_id']);
select _try_index('payroll_slips_org_period_idx',    'payroll_slips',          'organization_id, payroll_period_id',         array['organization_id', 'payroll_period_id']);
select _try_index('system_settings_org_idx',         'system_settings',        'organization_id',                            array['organization_id']);
select _try_index('app_integrations_org_idx',        'app_integrations',       'organization_id',                            array['organization_id']);
select _try_index('system_backups_org_idx',          'system_backups',         'organization_id',                            array['organization_id']);

-- Needed by the RLS self-access policies added in 0002.
select _try_index('employees_user_id_idx', 'employees', 'user_id', array['user_id']);

-- -----------------------------------------------------------------------------
-- 7. One settings row per organization.
-- -----------------------------------------------------------------------------

-- Collapse duplicates before adding the constraint, keeping the newest row.
-- Ordering falls back to the primary key where updated_at is absent.
do $$
begin
  if _has_column('system_settings', 'updated_at') then
    delete from system_settings s
     where exists (
       select 1 from system_settings newer
        where newer.organization_id = s.organization_id
          and (newer.updated_at, newer.id) > (s.updated_at, s.id)
     );
  else
    delete from system_settings s
     where exists (
       select 1 from system_settings newer
        where newer.organization_id = s.organization_id
          and newer.id > s.id
     );
  end if;
end $$;

select _try_unique_index('system_settings_org_uidx', 'system_settings', 'organization_id', array['organization_id']);

commit;
