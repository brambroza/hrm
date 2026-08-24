-- =============================================================================
-- 0002_rls.sql
--
-- Enables Row Level Security on every table.
--
-- Before this migration the database had no policies at all: the browser held
-- an anon key and could read or write any row in any table, so the RBAC in the
-- React app was decoration. Anyone who opened DevTools could dump every
-- salary and national ID in the system.
--
-- The model enforced here:
--   * a row is only visible inside its own organization;
--   * seeing other people's rows requires the matching module permission;
--   * an employee can always see (and file) their own records without any
--     permission grant — that is what the self-service app relies on.
--
-- Requires 0001_multi_tenant.sql. Run 0003 afterwards to seed per-org roles.
-- =============================================================================

begin;

create schema if not exists app;

-- -----------------------------------------------------------------------------
-- 1. Helper functions.
--
--    All of them are SECURITY DEFINER so they can read `users` / `employees`
--    without tripping the very policies they are used by. They are STABLE so
--    PostgreSQL evaluates them once per statement instead of once per row.
-- -----------------------------------------------------------------------------

/**
 * The organization of the currently authenticated user.
 * Returns null for an anonymous request, which makes every policy fail closed.
 */
create or replace function app.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select organization_id from public.users where id = auth.uid();
$$;

/**
 * The employee record linked to the current user, if any.
 * Users such as an outsourced HR admin may have no employee row; they then get
 * access purely through permissions.
 */
create or replace function app.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.employees where user_id = auth.uid();
$$;

/**
 * True when the current user's role grants <module>.<action> inside their own
 * organization.
 *
 * @param p_module  permission module, e.g. 'payroll'
 * @param p_action  permission name, e.g. 'edit'
 */
create or replace function app.has_permission(p_module text, p_action text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.users u
      join public.roles r
        on r.name = u.role
       and r.organization_id = u.organization_id
      join public.role_permissions rp
        on rp.role_id = r.id
      join public.permissions p
        on p.id = rp.permission_id
     where u.id = auth.uid()
       and p.module = p_module
       and p.name = p_action
  );
$$;

revoke all on function app.current_org_id()     from public, anon;
revoke all on function app.current_employee_id() from public, anon;
revoke all on function app.has_permission(text, text) from public, anon;
grant execute on function app.current_org_id()     to authenticated;
grant execute on function app.current_employee_id() to authenticated;
grant execute on function app.has_permission(text, text) to authenticated;
grant usage on schema app to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Enable RLS everywhere.
--
--    Enabling with no policy denies everything, so the policies below are what
--    opens each table back up. `service_role` (used by Edge Functions) bypasses
--    RLS by design and is unaffected.
-- -----------------------------------------------------------------------------

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'organizations', 'users', 'employees', 'departments', 'roles', 'permissions',
    'role_permissions', 'audit_logs', 'shifts', 'shift_assignments',
    'attendance_logs', 'ot_requests', 'holidays', 'week_offs', 'leaves',
    'attendance_policies', 'work_time_calculations', 'face_devices',
    'face_device_logs', 'system_settings', 'system_backups', 'app_integrations',
    'translations', 'payroll_periods', 'allowances_deductions',
    'payroll_calculations', 'payroll_slips'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('alter table public.%I force row level security', tbl);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Generic policies for admin-managed, org-scoped tables.
--
--    These tables hold company configuration rather than personal records, so
--    access is purely permission based.
-- -----------------------------------------------------------------------------

do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('departments',           'department'),
      ('shifts',                'time_attendance'),
      ('shift_assignments',     'time_attendance'),
      ('holidays',              'time_attendance'),
      ('week_offs',             'time_attendance'),
      ('attendance_policies',   'attendance_policy'),
      ('face_devices',          'integrations'),
      ('face_device_logs',      'integrations'),
      ('app_integrations',      'integrations'),
      ('system_backups',        'backup_recovery'),
      ('system_settings',       'system_settings'),
      ('translations',          'translate'),
      ('payroll_periods',       'payroll'),
      ('allowances_deductions', 'payroll'),
      ('roles',                 'user_management'),
      ('role_permissions',      'user_management')
    ) as t(table_name, module)
  loop
    execute format('drop policy if exists %I on public.%I', spec.table_name || '_select', spec.table_name);
    execute format('drop policy if exists %I on public.%I', spec.table_name || '_insert', spec.table_name);
    execute format('drop policy if exists %I on public.%I', spec.table_name || '_update', spec.table_name);
    execute format('drop policy if exists %I on public.%I', spec.table_name || '_delete', spec.table_name);

    execute format($f$
      create policy %I on public.%I for select to authenticated
      using (organization_id = app.current_org_id() and app.has_permission(%L, 'view'))
    $f$, spec.table_name || '_select', spec.table_name, spec.module);

    execute format($f$
      create policy %I on public.%I for insert to authenticated
      with check (organization_id = app.current_org_id() and app.has_permission(%L, 'add'))
    $f$, spec.table_name || '_insert', spec.table_name, spec.module);

    execute format($f$
      create policy %I on public.%I for update to authenticated
      using (organization_id = app.current_org_id() and app.has_permission(%L, 'edit'))
      with check (organization_id = app.current_org_id())
    $f$, spec.table_name || '_update', spec.table_name, spec.module);

    execute format($f$
      create policy %I on public.%I for delete to authenticated
      using (organization_id = app.current_org_id() and app.has_permission(%L, 'delete'))
    $f$, spec.table_name || '_delete', spec.table_name, spec.module);
  end loop;
end $$;

-- Roles and permissions are read by AuthContext on every login, before any
-- permission is known. Reading the catalogue must therefore stay open to any
-- authenticated user; only writing is gated above.
drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles
  for select to authenticated
  using (organization_id = app.current_org_id());

drop policy if exists role_permissions_select on public.role_permissions;
create policy role_permissions_select on public.role_permissions
  for select to authenticated
  using (organization_id = app.current_org_id());

drop policy if exists permissions_select on public.permissions;
create policy permissions_select on public.permissions
  for select to authenticated
  using (true);

-- Company settings are readable by everyone in the org (the payslip header and
-- the app title come from here) but writable only with company_settings.edit.
drop policy if exists system_settings_select on public.system_settings;
create policy system_settings_select on public.system_settings
  for select to authenticated
  using (organization_id = app.current_org_id());

drop policy if exists translations_select on public.translations;
create policy translations_select on public.translations
  for select to authenticated
  using (organization_id = app.current_org_id());

drop policy if exists holidays_select on public.holidays;
create policy holidays_select on public.holidays
  for select to authenticated
  using (organization_id = app.current_org_id());

drop policy if exists shifts_select on public.shifts;
create policy shifts_select on public.shifts
  for select to authenticated
  using (organization_id = app.current_org_id());

-- -----------------------------------------------------------------------------
-- 4. organizations
-- -----------------------------------------------------------------------------

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated
  using (id = app.current_org_id());

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
  for update to authenticated
  using (id = app.current_org_id() and app.has_permission('company_settings', 'edit'))
  with check (id = app.current_org_id());

-- Creating an organization happens during signup, which runs server-side
-- through an Edge Function with the service role. No policy is granted here on
-- purpose.

-- -----------------------------------------------------------------------------
-- 5. users
-- -----------------------------------------------------------------------------

drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or (organization_id = app.current_org_id() and app.has_permission('user_management', 'view'))
  );

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- A user must not be able to promote themselves or move to another tenant.
    and role = (select role from public.users where id = auth.uid())
    and organization_id is not distinct from app.current_org_id()
  );

drop policy if exists users_update_admin on public.users;
create policy users_update_admin on public.users
  for update to authenticated
  using (organization_id = app.current_org_id() and app.has_permission('user_management', 'edit'))
  with check (organization_id = app.current_org_id());

-- Inserting into `users` is done by the create-user Edge Function, which also
-- creates the matching auth.users row. Deletion is a soft delete via status.

-- -----------------------------------------------------------------------------
-- 6. employees
--
--    An employee always sees their own record. Seeing colleagues requires
--    employee.view.
-- -----------------------------------------------------------------------------

drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees
  for select to authenticated
  using (
    organization_id = app.current_org_id()
    and (user_id = auth.uid() or app.has_permission('employee', 'view'))
  );

drop policy if exists employees_insert on public.employees;
create policy employees_insert on public.employees
  for insert to authenticated
  with check (organization_id = app.current_org_id() and app.has_permission('employee', 'add'));

drop policy if exists employees_update on public.employees;
create policy employees_update on public.employees
  for update to authenticated
  using (organization_id = app.current_org_id() and app.has_permission('employee', 'edit'))
  with check (organization_id = app.current_org_id());

drop policy if exists employees_delete on public.employees;
create policy employees_delete on public.employees
  for delete to authenticated
  using (organization_id = app.current_org_id() and app.has_permission('employee', 'delete'));

-- -----------------------------------------------------------------------------
-- 7. Personal records: attendance, leave, OT, payroll.
--
--    Read: own row always, everyone else's only with <module>.view.
--    Write: HR writes anything; an employee may only file their own request and
--    only while it is still pending, so nobody can approve their own leave or
--    edit it after approval.
-- -----------------------------------------------------------------------------

do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('attendance_logs',        'time_attendance'),
      ('work_time_calculations', 'time_attendance'),
      ('payroll_calculations',   'payroll'),
      ('payroll_slips',          'payroll')
    ) as t(table_name, module)
  loop
    execute format('drop policy if exists %I on public.%I', spec.table_name || '_select', spec.table_name);
    execute format('drop policy if exists %I on public.%I', spec.table_name || '_insert', spec.table_name);
    execute format('drop policy if exists %I on public.%I', spec.table_name || '_update', spec.table_name);
    execute format('drop policy if exists %I on public.%I', spec.table_name || '_delete', spec.table_name);

    execute format($f$
      create policy %I on public.%I for select to authenticated
      using (
        organization_id = app.current_org_id()
        and (employee_id = app.current_employee_id() or app.has_permission(%L, 'view'))
      )
    $f$, spec.table_name || '_select', spec.table_name, spec.module);

    execute format($f$
      create policy %I on public.%I for insert to authenticated
      with check (organization_id = app.current_org_id() and app.has_permission(%L, 'add'))
    $f$, spec.table_name || '_insert', spec.table_name, spec.module);

    execute format($f$
      create policy %I on public.%I for update to authenticated
      using (organization_id = app.current_org_id() and app.has_permission(%L, 'edit'))
      with check (organization_id = app.current_org_id())
    $f$, spec.table_name || '_update', spec.table_name, spec.module);

    execute format($f$
      create policy %I on public.%I for delete to authenticated
      using (organization_id = app.current_org_id() and app.has_permission(%L, 'delete'))
    $f$, spec.table_name || '_delete', spec.table_name, spec.module);
  end loop;
end $$;

-- Payroll calculation is written by the calculate-payroll Edge Function under
-- the service role, so no insert policy is granted to end users beyond the
-- permission-gated one above.

-- Leave and OT requests additionally allow self-service filing.
do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('leaves',      'leave'),
      ('ot_requests', 'ot_request')
    ) as t(table_name, module)
  loop
    execute format('drop policy if exists %I on public.%I', spec.table_name || '_select', spec.table_name);
    execute format('drop policy if exists %I on public.%I', spec.table_name || '_insert', spec.table_name);
    execute format('drop policy if exists %I on public.%I', spec.table_name || '_update', spec.table_name);
    execute format('drop policy if exists %I on public.%I', spec.table_name || '_self_update', spec.table_name);
    execute format('drop policy if exists %I on public.%I', spec.table_name || '_delete', spec.table_name);

    execute format($f$
      create policy %I on public.%I for select to authenticated
      using (
        organization_id = app.current_org_id()
        and (employee_id = app.current_employee_id() or app.has_permission(%L, 'view'))
      )
    $f$, spec.table_name || '_select', spec.table_name, spec.module);

    -- Filing for yourself needs no permission; filing on behalf of someone else does.
    execute format($f$
      create policy %I on public.%I for insert to authenticated
      with check (
        organization_id = app.current_org_id()
        and (
          (employee_id = app.current_employee_id() and status = 'pending' and approved_by is null)
          or app.has_permission(%L, 'add')
        )
      )
    $f$, spec.table_name || '_insert', spec.table_name, spec.module);

    -- An approver edits anything; the requester may only amend their own row
    -- while it is still pending, and it must stay pending afterwards.
    execute format($f$
      create policy %I on public.%I for update to authenticated
      using (organization_id = app.current_org_id() and app.has_permission(%L, 'edit'))
      with check (organization_id = app.current_org_id())
    $f$, spec.table_name || '_update', spec.table_name, spec.module);

    execute format($f$
      create policy %I on public.%I for update to authenticated
      using (
        organization_id = app.current_org_id()
        and employee_id = app.current_employee_id()
        and status = 'pending'
      )
      with check (
        organization_id = app.current_org_id()
        and employee_id = app.current_employee_id()
        and status = 'pending'
        and approved_by is null
      )
    $f$, spec.table_name || '_self_update', spec.table_name);

    execute format($f$
      create policy %I on public.%I for delete to authenticated
      using (
        organization_id = app.current_org_id()
        and (
          (employee_id = app.current_employee_id() and status = 'pending')
          or app.has_permission(%L, 'delete')
        )
      )
    $f$, spec.table_name || '_delete', spec.table_name, spec.module);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 8. audit_logs
--
--    Append-only: anyone may write their own trail, only audit_log.view may
--    read it, and nobody may rewrite or erase history from the client.
-- -----------------------------------------------------------------------------

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (organization_id = app.current_org_id() and app.has_permission('audit_log', 'view'));

drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
  for insert to authenticated
  with check (organization_id = app.current_org_id() and user_id = auth.uid());

commit;
