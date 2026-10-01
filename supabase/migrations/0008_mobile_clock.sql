-- =============================================================================
-- 0008_mobile_clock.sql
--
-- Clocking in from a phone, in a browser or inside LINE, within a set
-- distance of a work site.
--
--   1. work_sites        places where punching is allowed, each with a radius
--   2. employees         the LINE account linked to the employee
--   3. clock_punches     every punch as it happened, with position and
--                        distance; never updated, so it is evidence
--   4. attendance_logs   where the punch landed, so existing calculations
--                        keep working unchanged
--
-- Punches are written by the clock-punch Edge Function with the service role
-- after it has verified who is punching and where. Employees cannot insert
-- punches themselves, so a punch always carries a verified position.
--
-- Idempotent: safe to run more than once. Nothing is removed or rewritten.
-- Take a backup first. Run on staging before production.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Work sites
-- -----------------------------------------------------------------------------

create table if not exists public.work_sites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  latitude        double precision not null,
  longitude       double precision not null,
  radius_m        integer not null default 150,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint work_sites_name_check      check (length(trim(name)) between 1 and 120),
  constraint work_sites_latitude_check  check (latitude between -90 and 90),
  constraint work_sites_longitude_check check (longitude between -180 and 180),
  constraint work_sites_radius_check    check (radius_m between 30 and 5000)
);

comment on table public.work_sites is 'Places where employees may clock in from a phone, each with the allowed distance from its centre.';
comment on column public.work_sites.radius_m is 'Allowed distance from the centre in metres, 30 to 5000.';

create index if not exists work_sites_org_idx on public.work_sites (organization_id);

alter table public.work_sites enable row level security;
alter table public.work_sites force row level security;

-- Any employee may read the sites of their own organization: the phone
-- screen shows the nearest site and the distance before the button is pressed.
drop policy if exists work_sites_select on public.work_sites;
create policy work_sites_select on public.work_sites
  for select to authenticated
  using (organization_id = app.current_org_id());

drop policy if exists work_sites_insert on public.work_sites;
create policy work_sites_insert on public.work_sites
  for insert to authenticated
  with check (organization_id = app.current_org_id() and app.has_permission('time_attendance', 'add'));

drop policy if exists work_sites_update on public.work_sites;
create policy work_sites_update on public.work_sites
  for update to authenticated
  using (organization_id = app.current_org_id() and app.has_permission('time_attendance', 'edit'))
  with check (organization_id = app.current_org_id());

drop policy if exists work_sites_delete on public.work_sites;
create policy work_sites_delete on public.work_sites
  for delete to authenticated
  using (organization_id = app.current_org_id() and app.has_permission('time_attendance', 'delete'));

drop trigger if exists set_organization_id on public.work_sites;
create trigger set_organization_id
  before insert on public.work_sites
  for each row execute function app.set_organization_id();

-- -----------------------------------------------------------------------------
-- 2. The LINE account of an employee
-- -----------------------------------------------------------------------------

alter table public.employees add column if not exists line_user_id text;
alter table public.employees add column if not exists line_linked_at timestamptz;

comment on column public.employees.line_user_id is 'LINE user id (from LINE Login) of the employee, set when they link their account from the clock screen.';

-- One LINE account belongs to one employee.
create unique index if not exists employees_line_user_id_key
  on public.employees (line_user_id)
  where line_user_id is not null;

-- -----------------------------------------------------------------------------
-- 3. Raw punches
-- -----------------------------------------------------------------------------

create table if not exists public.clock_punches (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id     uuid not null references public.employees(id) on delete cascade,
  attendance_log_id uuid references public.attendance_logs(id) on delete set null,
  kind            text not null,
  punched_at      timestamptz not null default now(),
  source          text not null,
  latitude        double precision,
  longitude       double precision,
  accuracy_m      integer,
  work_site_id    uuid references public.work_sites(id) on delete set null,
  distance_m      integer,
  within_radius   boolean not null default false,
  line_user_id    text,
  user_agent      text,
  created_at      timestamptz not null default now(),
  constraint clock_punches_kind_check   check (kind in ('in', 'out')),
  constraint clock_punches_source_check check (source in ('mobile', 'line'))
);

comment on table public.clock_punches is 'Every punch from a phone as it happened. Rows are never updated or deleted by the application.';

create index if not exists clock_punches_employee_time_idx on public.clock_punches (employee_id, punched_at desc);
create index if not exists clock_punches_org_time_idx on public.clock_punches (organization_id, punched_at desc);

alter table public.clock_punches enable row level security;
alter table public.clock_punches force row level security;

-- Employees see their own punches; HR with attendance permission sees all in
-- the organization. Nobody but the service role writes.
drop policy if exists clock_punches_select on public.clock_punches;
create policy clock_punches_select on public.clock_punches
  for select to authenticated
  using (
    organization_id = app.current_org_id()
    and (employee_id = app.current_employee_id() or app.has_permission('time_attendance', 'view'))
  );

-- -----------------------------------------------------------------------------
-- 4. Where the punch landed
-- -----------------------------------------------------------------------------

alter table public.attendance_logs add column if not exists check_in_punch_id  uuid references public.clock_punches(id) on delete set null;
alter table public.attendance_logs add column if not exists check_out_punch_id uuid references public.clock_punches(id) on delete set null;

comment on column public.attendance_logs.check_in_punch_id  is 'The phone punch that set check_in, when it came from a phone.';
comment on column public.attendance_logs.check_out_punch_id is 'The phone punch that set check_out, when it came from a phone.';

-- An employee may read their own attendance rows on the clock screen.
drop policy if exists attendance_logs_select_self on public.attendance_logs;
create policy attendance_logs_select_self on public.attendance_logs
  for select to authenticated
  using (organization_id = app.current_org_id() and employee_id = app.current_employee_id());

commit;
