alter table if exists employees
  add column if not exists name_th text,
  add column if not exists name_en text,
  add column if not exists department text,
  add column if not exists position text;

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

alter table if exists attendance_logs
  add column if not exists late_minutes int,
  add column if not exists ot_minutes int,
  add column if not exists missing_punch boolean default false,
  add column if not exists status text default 'normal',
  add column if not exists check_in_morning timestamptz,
  add column if not exists check_out_morning timestamptz,
  add column if not exists check_in_afternoon timestamptz,
  add column if not exists check_out_afternoon timestamptz,
  add column if not exists ot_in timestamptz,
  add column if not exists ot_out timestamptz;

alter table if exists leaves
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists status text default 'pending',
  add column if not exists attachment_url text;

alter table if exists attendance_policies
  add column if not exists late_grace_minutes int default 5,
  add column if not exists late_threshold_minutes int default 5,
  add column if not exists absent_by_late_minutes int default 30,
  add column if not exists ot_method text default 'scan',
  add column if not exists ot_rounding text default 'none',
  add column if not exists missing_scan_action text default 'notify_hr';

alter table if exists shifts
  add column if not exists scan_policy text default '2',
  add column if not exists ot_scan_enabled boolean default false;

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
