-- =============================================================================
-- 0003_org_provisioning.sql
--
-- Roles became org-scoped in 0001, so every new tenant needs its own copy of
-- the five default roles and their grants. Previously roles were global, which
-- meant one customer editing the "hr" role would have changed it for everyone.
--
-- This migration:
--   1. completes the permission catalogue so the RLS policies in 0002 have a
--      permission to check for every action they gate;
--   2. stores the default role set as templates;
--   3. adds app.provision_organization() to stamp those templates onto a tenant;
--   4. auto-fills organization_id on insert so application code does not have
--      to thread the tenant key through every call.
--
-- Requires 0001 and 0002.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. The permission catalogue.
--
--    This is the full list, not just the additions. The catalogue used to live
--    only in seed.sql, which is no longer run on a new database — leaving it
--    there meant a freshly created database ended up with an almost empty
--    catalogue, and the role templates below silently granted nothing because
--    they join against it.
--
--    The last five rows are new: 0002 gates deletes on <module>.delete and
--    inserts on <module>.add, and where the catalogue had no such row the
--    action was permanently denied, admins included.
-- -----------------------------------------------------------------------------

insert into permissions (module, name, description) values
  ('dashboard', 'view', 'View dashboard'),
  ('settings', 'view', 'View settings'),
  ('employee', 'view', 'View employees'),
  ('employee', 'add', 'Add employees'),
  ('employee', 'edit', 'Edit employees'),
  ('employee', 'delete', 'Deactivate employees'),
  ('employee', 'export', 'Export employees'),
  ('time_attendance', 'view', 'View attendance'),
  ('time_attendance', 'add', 'Add attendance'),
  ('time_attendance', 'edit', 'Edit attendance'),
  ('time_attendance', 'delete', 'Delete attendance'),
  ('time_attendance', 'export', 'Export attendance'),
  ('time_attendance', 'calculate', 'Calculate attendance'),
  ('attendance_policy', 'view', 'View attendance policy'),
  ('attendance_policy', 'edit', 'Edit attendance policy'),
  ('ot_request', 'view', 'View OT requests'),
  ('ot_request', 'add', 'Add OT requests'),
  ('ot_request', 'edit', 'Approve OT requests'),
  ('leave', 'view', 'View leave'),
  ('leave', 'add', 'Add leave'),
  ('leave', 'edit', 'Edit leave'),
  ('department', 'view', 'View departments'),
  ('department', 'add', 'Add departments'),
  ('department', 'edit', 'Edit departments'),
  ('department', 'delete', 'Delete departments'),
  ('reports', 'view', 'View reports'),
  ('reports', 'export', 'Export reports'),
  ('payroll', 'view', 'View payroll'),
  ('payroll', 'add', 'Add payroll'),
  ('payroll', 'edit', 'Edit payroll'),
  ('payroll', 'delete', 'Delete payroll'),
  ('payroll', 'export', 'Export payroll'),
  ('payroll', 'calculate', 'Calculate payroll'),
  ('user_management', 'view', 'View users'),
  ('user_management', 'add', 'Add users'),
  ('user_management', 'edit', 'Edit users'),
  ('user_management', 'delete', 'Delete users'),
  ('audit_log', 'view', 'View audit logs'),
  ('audit_log', 'export', 'Export audit logs'),
  ('translate', 'view', 'View translations'),
  ('translate', 'add', 'Add translations'),
  ('translate', 'edit', 'Edit translations'),
  ('translate', 'delete', 'Delete translations'),
  ('system_settings', 'view', 'View system settings'),
  ('system_settings', 'edit', 'Edit system settings'),
  ('backup_recovery', 'view', 'View backups'),
  ('backup_recovery', 'add', 'Create backups'),
  ('backup_recovery', 'edit', 'Edit backups'),
  ('backup_recovery', 'delete', 'Delete backups'),
  ('integrations', 'view', 'View integrations'),
  ('integrations', 'add', 'Add integrations'),
  ('integrations', 'edit', 'Edit integrations'),
  ('integrations', 'delete', 'Delete integrations'),
  ('company_settings', 'view', 'View company settings'),
  ('company_settings', 'edit', 'Edit company settings'),
  -- Added for the policies in 0002.
  ('leave',             'delete', 'Delete leave requests'),
  ('ot_request',        'delete', 'Delete OT requests'),
  ('attendance_policy', 'add',    'Add attendance policy'),
  ('attendance_policy', 'delete', 'Delete attendance policy'),
  ('system_settings',   'add',    'Create system settings')
on conflict (module, name) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Role templates.
--
--    `employee` deliberately holds almost nothing: an employee reaches their
--    own leave, OT, attendance and payslips through the self-access clauses in
--    0002, not through a permission grant. Giving the role `leave.view` would
--    expose the whole company's leave records instead of just their own.
-- -----------------------------------------------------------------------------

create table if not exists role_templates (
  name text primary key,
  description text
);

create table if not exists role_permission_templates (
  role_name text not null references role_templates(name) on delete cascade,
  module text not null,
  action text not null,
  primary key (role_name, module, action)
);

alter table role_templates            enable row level security;
alter table role_permission_templates enable row level security;
-- No policy: templates are server-side seed data, reachable only via the
-- service role and the SECURITY DEFINER provisioning function below.

insert into role_templates (name, description) values
  ('admin',      'Full access'),
  ('manager',    'Management access'),
  ('hr',         'HR operations access'),
  ('supervisor', 'Team supervisor access'),
  ('employee',   'Employee self access')
on conflict (name) do nothing;

-- admin: everything in the catalogue.
insert into role_permission_templates (role_name, module, action)
select 'admin', p.module, p.name from permissions p
on conflict do nothing;

insert into role_permission_templates (role_name, module, action) values
  ('manager','dashboard','view'),
  ('manager','settings','view'),
  ('manager','employee','view'), ('manager','employee','add'), ('manager','employee','edit'), ('manager','employee','export'),
  ('manager','time_attendance','view'), ('manager','time_attendance','add'), ('manager','time_attendance','edit'),
  ('manager','time_attendance','export'), ('manager','time_attendance','calculate'),
  ('manager','attendance_policy','view'), ('manager','attendance_policy','edit'),
  ('manager','ot_request','view'), ('manager','ot_request','add'), ('manager','ot_request','edit'),
  ('manager','leave','view'), ('manager','leave','add'), ('manager','leave','edit'),
  ('manager','department','view'), ('manager','department','add'), ('manager','department','edit'), ('manager','department','delete'),
  ('manager','reports','view'), ('manager','reports','export'),
  ('manager','payroll','view'), ('manager','payroll','calculate'), ('manager','payroll','export'),
  ('manager','user_management','view'),
  ('manager','audit_log','view'), ('manager','audit_log','export'),
  ('manager','system_settings','view'),
  ('manager','backup_recovery','view'),
  ('manager','integrations','view'),
  ('manager','company_settings','view'),

  ('hr','dashboard','view'),
  ('hr','settings','view'),
  ('hr','employee','view'), ('hr','employee','add'), ('hr','employee','edit'), ('hr','employee','export'),
  ('hr','time_attendance','view'), ('hr','time_attendance','add'), ('hr','time_attendance','edit'),
  ('hr','time_attendance','export'), ('hr','time_attendance','calculate'),
  ('hr','attendance_policy','view'), ('hr','attendance_policy','add'), ('hr','attendance_policy','edit'),
  ('hr','ot_request','view'), ('hr','ot_request','add'), ('hr','ot_request','edit'), ('hr','ot_request','delete'),
  ('hr','leave','view'), ('hr','leave','add'), ('hr','leave','edit'), ('hr','leave','delete'),
  ('hr','department','view'), ('hr','department','add'), ('hr','department','edit'),
  ('hr','reports','view'), ('hr','reports','export'),
  ('hr','payroll','view'), ('hr','payroll','calculate'), ('hr','payroll','export'),
  ('hr','user_management','view'), ('hr','user_management','add'), ('hr','user_management','edit'),
  ('hr','audit_log','view'), ('hr','audit_log','export'),
  ('hr','translate','view'), ('hr','translate','add'), ('hr','translate','edit'),
  ('hr','system_settings','view'), ('hr','system_settings','edit'),
  ('hr','backup_recovery','view'),
  ('hr','integrations','view'),
  ('hr','company_settings','view'), ('hr','company_settings','edit'),

  ('supervisor','dashboard','view'),
  ('supervisor','settings','view'),
  ('supervisor','employee','view'),
  ('supervisor','time_attendance','view'), ('supervisor','time_attendance','add'), ('supervisor','time_attendance','calculate'),
  ('supervisor','attendance_policy','view'),
  ('supervisor','ot_request','view'), ('supervisor','ot_request','add'), ('supervisor','ot_request','edit'),
  ('supervisor','leave','view'), ('supervisor','leave','edit'),
  ('supervisor','department','view'),
  ('supervisor','reports','view'),
  ('supervisor','audit_log','view'),

  ('employee','dashboard','view')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 3. Provisioning.
-- -----------------------------------------------------------------------------

/**
 * Give an organization its own copy of the default roles and grants.
 *
 * Idempotent, so it is safe to call again after new permissions are added to
 * the catalogue — existing rows are left untouched and only the missing grants
 * are inserted.
 *
 * @param p_org_id  the organization to provision
 */
create or replace function app.provision_organization(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into roles (organization_id, name, description)
  select p_org_id, t.name, t.description
    from role_templates t
  on conflict do nothing;

  insert into role_permissions (organization_id, role_id, permission_id)
  select p_org_id, r.id, p.id
    from role_permission_templates t
    join roles r
      on r.name = t.role_name
     and r.organization_id = p_org_id
    join permissions p
      on p.module = t.module
     and p.name = t.action
  on conflict (role_id, permission_id) do nothing;

  insert into attendance_policies (
    organization_id, name, late_grace_minutes, late_threshold_minutes,
    absent_by_late_minutes, ot_method, ot_rounding, missing_scan_action
  )
  select p_org_id, 'Default Policy', 5, 5, 30, 'scan', 'none', 'notify_hr'
  where not exists (
    select 1 from attendance_policies where organization_id = p_org_id
  );

  insert into system_settings (organization_id)
  select p_org_id
  where not exists (
    select 1 from system_settings where organization_id = p_org_id
  );
end;
$$;

revoke all on function app.provision_organization(uuid) from public, anon, authenticated;

-- Provision every organization that already exists, including the default one
-- that 0001 backfilled into.
do $$
declare
  org record;
begin
  for org in select id from organizations loop
    perform app.provision_organization(org.id);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Auto-fill organization_id on insert.
--
--    The React services insert rows without a tenant key. Rather than touching
--    every call site, the tenant of the authenticated user is stamped on when
--    the column is left null. An explicit value is still honoured, and the RLS
--    WITH CHECK clauses in 0002 reject anything pointing at another tenant.
-- -----------------------------------------------------------------------------

create or replace function app.set_organization_id()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.organization_id is null then
    new.organization_id := app.current_org_id();
  end if;
  return new;
end;
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'employees', 'departments', 'audit_logs', 'shifts', 'shift_assignments',
    'attendance_logs', 'ot_requests', 'holidays', 'week_offs', 'leaves',
    'attendance_policies', 'work_time_calculations', 'face_devices',
    'face_device_logs', 'system_backups', 'system_settings', 'app_integrations',
    'translations', 'payroll_periods', 'allowances_deductions',
    'payroll_calculations', 'payroll_slips'
  ]
  loop
    execute format('drop trigger if exists set_organization_id on public.%I', tbl);
    execute format(
      'create trigger set_organization_id before insert on public.%I
       for each row execute function app.set_organization_id()', tbl);
  end loop;
end $$;

commit;
