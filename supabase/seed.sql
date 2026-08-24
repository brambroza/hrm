insert into roles (name, description) values
  ('admin', 'Full access'),
  ('manager', 'Management access'),
  ('hr', 'HR operations access'),
  ('supervisor', 'Team supervisor access'),
  ('employee', 'Employee self access')
on conflict (name) do nothing;

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
  ('company_settings', 'edit', 'Edit company settings')
on conflict (module, name) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on true
where r.name = 'admin'
on conflict (role_id, permission_id) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on (p.module, p.name) in (
  ('dashboard','view'),
  ('settings','view'),
  ('employee','view'), ('employee','add'), ('employee','edit'), ('employee','export'),
  ('time_attendance','view'), ('time_attendance','add'), ('time_attendance','edit'), ('time_attendance','export'),
  ('time_attendance','calculate'),
  ('attendance_policy','view'), ('attendance_policy','edit'),
  ('ot_request','view'), ('ot_request','add'), ('ot_request','edit'),
  ('leave','view'), ('leave','add'), ('leave','edit'),
  ('department','view'), ('department','add'), ('department','edit'), ('department','delete'),
  ('reports','view'), ('reports','export'),
  ('payroll','view'), ('payroll','calculate'), ('payroll','export'),
  ('user_management','view'),
  ('audit_log','view'), ('audit_log','export'),
  ('system_settings','view'),
  ('backup_recovery','view'),
  ('integrations','view'),
  ('company_settings','view')
)
where r.name = 'manager'
on conflict (role_id, permission_id) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on (p.module, p.name) in (
  ('dashboard','view'),
  ('settings','view'),
  ('employee','view'), ('employee','add'), ('employee','edit'), ('employee','export'),
  ('time_attendance','view'), ('time_attendance','add'), ('time_attendance','edit'), ('time_attendance','export'),
  ('time_attendance','calculate'),
  ('attendance_policy','view'), ('attendance_policy','edit'),
  ('ot_request','view'), ('ot_request','add'), ('ot_request','edit'),
  ('leave','view'), ('leave','add'), ('leave','edit'),
  ('department','view'), ('department','add'), ('department','edit'),
  ('reports','view'), ('reports','export'),
  ('payroll','view'), ('payroll','calculate'), ('payroll','export'),
  ('user_management','view'), ('user_management','add'), ('user_management','edit'),
  ('audit_log','view'), ('audit_log','export'),
  ('translate','view'), ('translate','add'), ('translate','edit'),
  ('system_settings','view'), ('system_settings','edit'),
  ('backup_recovery','view'),
  ('integrations','view'),
  ('company_settings','view'), ('company_settings','edit')
)
where r.name = 'hr'
on conflict (role_id, permission_id) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on (p.module, p.name) in (
  ('dashboard','view'),
  ('settings','view'),
  ('employee','view'),
  ('time_attendance','view'), ('time_attendance','add'), ('time_attendance','calculate'),
  ('attendance_policy','view'),
  ('ot_request','view'), ('ot_request','add'),
  ('leave','view'), ('leave','add'),
  ('department','view'),
  ('reports','view'),
  ('audit_log','view')
)
where r.name = 'supervisor'
on conflict (role_id, permission_id) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on (p.module, p.name) in (
  ('dashboard','view'),
  ('leave','view'), ('leave','add')
)
where r.name = 'employee'
on conflict (role_id, permission_id) do nothing;

insert into attendance_policies (
  name,
  late_grace_minutes,
  late_threshold_minutes,
  absent_by_late_minutes,
  ot_method,
  ot_rounding,
  missing_scan_action
) values (
  'Default Policy',
  5,
  5,
  30,
  'scan',
  'none',
  'notify_hr'
)
on conflict do nothing;
