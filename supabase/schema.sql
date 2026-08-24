create extension if not exists "pgcrypto";

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_id text,
  address text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key,
  organization_id uuid references organizations(id),
  email text,
  full_name text,
  role text default 'employee',
  status text default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (module, name)
);

create table if not exists role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  organization_id uuid references organizations(id),
  employee_id text not null unique,
  name text not null,
  name_th text not null,
  name_en text,
  national_id text,
  passport_number text,
  work_permit_number text,
  work_permit_expiry date,
  nationality text,
  photo_url text,
  department text,
  position text,
  employment_type text,
  branch text,
  start_date date,
  end_date date,
  salary numeric(12,2),
  phone text,
  email text,
  status text not null default 'active',
  role text default 'employee',
  other_info jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employees_department_idx on employees (department);
create index if not exists employees_status_idx on employees (status);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  action text not null,
  table_name text not null,
  record_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  shift_name text not null,
  shift_type text not null default 'Fixed',
  start_time time not null,
  end_time time not null,
  break_minutes int not null default 0,
  late_tolerance_minutes int not null default 0,
  early_leave_tolerance_minutes int not null default 0,
  cross_day_shift boolean not null default false,
  scan_policy text not null default '2',
  ot_scan_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shift_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  shift_id uuid not null references shifts(id) on delete cascade,
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now()
);

create table if not exists attendance_logs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  log_date date not null,
  check_in timestamptz,
  check_out timestamptz,
  check_in_morning timestamptz,
  check_out_morning timestamptz,
  check_in_afternoon timestamptz,
  check_out_afternoon timestamptz,
  ot_in timestamptz,
  ot_out timestamptz,
  hours_worked numeric(6,2),
  late_minutes int,
  ot_minutes int,
  missing_punch boolean default false,
  status text default 'normal',
  source text default 'manual',
  device_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists ot_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  request_date date not null,
  start_time time not null,
  end_time time not null,
  minutes int not null default 0,
  reason text,
  status text not null default 'pending',
  approved_by uuid references users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists attendance_logs_employee_date_idx on attendance_logs (employee_id, log_date);

create table if not exists holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null,
  name text not null,
  holiday_type text default 'public',
  department text,
  employee_group text,
  is_working_day boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists week_offs (
  id uuid primary key default gen_random_uuid(),
  department text,
  employee_group text,
  weekday int not null,
  created_at timestamptz not null default now()
);

create table if not exists leaves (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  is_half_day boolean not null default false,
  reason text,
  attachment_url text,
  status text not null default 'pending',
  approved_by uuid references users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists attendance_policies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  late_grace_minutes int not null default 5,
  late_threshold_minutes int not null default 5,
  absent_by_late_minutes int not null default 30,
  ot_method text not null default 'scan',
  ot_rounding text not null default 'none',
  missing_scan_action text not null default 'notify_hr',
  shift_id uuid references shifts(id),
  department text,
  employee_group text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists work_time_calculations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  work_date date not null,
  work_hours numeric(6,2),
  late_minutes int,
  ot_minutes int,
  absent boolean not null default false,
  absent_by_late boolean not null default false,
  missing_punch boolean not null default false,
  leave_status text,
  holiday_status text,
  created_at timestamptz not null default now(),
  unique (employee_id, work_date)
);

create table if not exists face_devices (
  id uuid primary key default gen_random_uuid(),
  device_code text not null,
  name text,
  location text,
  ip_address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists face_device_logs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references face_devices(id),
  employee_code text,
  employee_id uuid references employees(id),
  event_time timestamptz not null,
  event_type text,
  location text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists system_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id),
  notification_email boolean default true,
  notification_sms boolean default false,
  notification_in_app boolean default true,
  working_days text[],
  work_start_time text,
  work_end_time text,
  lunch_break_start text,
  lunch_break_end text,
  payroll_date int,
  payment_method text,
  default_bank text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists system_backups (
  id uuid primary key default gen_random_uuid(),
  backup_name text not null,
  backup_type text,
  status text,
  size_mb numeric(10,2),
  created_at timestamptz not null default now()
);

create table if not exists app_integrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text,
  status text,
  config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists translations (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  th text,
  en text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key)
);

create table if not exists payroll_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists allowances_deductions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  amount numeric(12,2),
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists payroll_calculations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  payroll_period_id uuid references payroll_periods(id),
  basic_salary numeric(12,2),
  total_income numeric(12,2),
  total_deductions numeric(12,2),
  net_salary numeric(12,2),
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payroll_slips (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  payroll_period_id uuid references payroll_periods(id),
  slip_url text,
  created_at timestamptz not null default now()
);
