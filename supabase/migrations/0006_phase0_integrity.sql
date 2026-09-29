-- =============================================================================
-- 0006_phase0_integrity.sql
--
-- Phase 0: make the database enforce the rules the screens only suggested.
--
--   1. Closed payroll periods are locked.
--   2. One payroll calculation per employee per period.
--   3. Leave and OT: decision note, date sanity, nobody decides their own
--      request.
--   4. Audit trail written by triggers, so it no longer depends on each screen
--      remembering to call it.
--   5. User roles are limited to the roles that exist.
--
-- Idempotent: safe to run more than once.
-- Take a backup first. Run on staging before production.
--
-- BEFORE RUNNING, check for rows that would violate the new rules:
--   psql "$DATABASE_URL" -f supabase/tests/phase0_preflight.sql
-- Steps 2 and 5 stop with an error if such rows exist; nothing is deleted or
-- rewritten silently except the role casing fix described in step 5.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Closed payroll periods are locked
-- -----------------------------------------------------------------------------

/**
 * True when a payroll period is closed. Accepts any casing, and the legacy
 * value 'locked', to match normalizeStatus() in the application.
 */
create or replace function app.is_period_closed(p_status text)
returns boolean
language sql
immutable
as $$
  select lower(trim(coalesce(p_status, ''))) in ('closed', 'locked');
$$;

/**
 * Refuses any change to a closed payroll period. The only way a period leaves
 * the closed state is a deliberate reopen by the service role.
 */
create or replace function app.guard_closed_period()
returns trigger
language plpgsql
as $$
begin
  if app.is_period_closed(old.status) and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'งวดการจ่ายนี้ปิดแล้ว แก้ไขหรือลบไม่ได้'
      using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_closed_period on public.payroll_periods;
create trigger guard_closed_period
  before update or delete on public.payroll_periods
  for each row execute function app.guard_closed_period();

/**
 * Refuses to add, change or remove a calculation that belongs to a closed
 * period.
 */
create or replace function app.guard_closed_period_rows()
returns trigger
language plpgsql
as $$
declare
  v_period_id uuid;
  v_status text;
begin
  if coalesce(auth.role(), '') = 'service_role' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    v_period_id := old.payroll_period_id;
  else
    v_period_id := new.payroll_period_id;
  end if;

  select status into v_status from public.payroll_periods where id = v_period_id;

  if app.is_period_closed(v_status) then
    raise exception 'งวดการจ่ายนี้ปิดแล้ว แก้ไขผลการคำนวณไม่ได้'
      using errcode = 'P0001';
  end if;

  -- Moving a row out of a closed period is a change to that period too.
  if tg_op = 'UPDATE' and old.payroll_period_id is distinct from new.payroll_period_id then
    select status into v_status from public.payroll_periods where id = old.payroll_period_id;
    if app.is_period_closed(v_status) then
      raise exception 'งวดการจ่ายนี้ปิดแล้ว แก้ไขผลการคำนวณไม่ได้'
        using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists guard_closed_period_rows on public.payroll_calculations;
create trigger guard_closed_period_rows
  before insert or update or delete on public.payroll_calculations
  for each row execute function app.guard_closed_period_rows();

-- A period cannot end before it starts. NOT VALID: existing rows are left
-- alone, new and changed rows are checked.
alter table public.payroll_periods
  drop constraint if exists payroll_periods_dates_check;
alter table public.payroll_periods
  add constraint payroll_periods_dates_check
  check (end_date >= start_date) not valid;

-- -----------------------------------------------------------------------------
-- 2. One calculation per employee per period
-- -----------------------------------------------------------------------------

do $$
declare
  v_duplicates integer;
begin
  select count(*) into v_duplicates
    from (
      select employee_id, payroll_period_id
        from public.payroll_calculations
       group by employee_id, payroll_period_id
      having count(*) > 1
    ) d;

  if v_duplicates > 0 then
    raise exception
      'พบผลการคำนวณซ้ำ % คู่ (พนักงาน, งวด) กรุณาตรวจและลบรายการซ้ำก่อนรัน migration นี้', v_duplicates;
  end if;
end $$;

create unique index if not exists payroll_calculations_employee_period_key
  on public.payroll_calculations (employee_id, payroll_period_id);

-- -----------------------------------------------------------------------------
-- 3. Leave and OT requests
-- -----------------------------------------------------------------------------

alter table public.leaves      add column if not exists decision_note text;
alter table public.ot_requests add column if not exists decision_note text;

alter table public.leaves drop constraint if exists leaves_dates_check;
alter table public.leaves
  add constraint leaves_dates_check check (end_date >= start_date) not valid;

alter table public.leaves drop constraint if exists leaves_half_day_check;
alter table public.leaves
  add constraint leaves_half_day_check
  check (not coalesce(is_half_day, false) or start_date = end_date) not valid;

alter table public.leaves drop constraint if exists leaves_decision_note_length;
alter table public.leaves
  add constraint leaves_decision_note_length check (char_length(decision_note) <= 500);

alter table public.ot_requests drop constraint if exists ot_requests_decision_note_length;
alter table public.ot_requests
  add constraint ot_requests_decision_note_length check (char_length(decision_note) <= 500);

alter table public.ot_requests drop constraint if exists ot_requests_minutes_check;
alter table public.ot_requests
  add constraint ot_requests_minutes_check check (minutes is null or minutes >= 0) not valid;

/**
 * Nobody approves or rejects their own request, whatever their permissions.
 * Also stamps who decided and when, from the session rather than from values
 * the browser sent.
 */
create or replace function app.guard_request_decision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status
     and lower(coalesce(new.status, '')) in ('approved', 'rejected') then

    if coalesce(auth.role(), '') <> 'service_role' then
      if new.employee_id = app.current_employee_id() then
        raise exception 'อนุมัติหรือไม่อนุมัติคำขอของตัวเองไม่ได้'
          using errcode = 'P0001';
      end if;

      new.approved_by := auth.uid();
      new.approved_at := now();
    end if;

    if lower(new.status) = 'rejected'
       and char_length(trim(coalesce(new.decision_note, ''))) < 3 then
      raise exception 'กรุณาระบุเหตุผลที่ไม่อนุมัติ'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_request_decision on public.leaves;
create trigger guard_request_decision
  before update on public.leaves
  for each row execute function app.guard_request_decision();

drop trigger if exists guard_request_decision on public.ot_requests;
create trigger guard_request_decision
  before update on public.ot_requests
  for each row execute function app.guard_request_decision();

-- -----------------------------------------------------------------------------
-- 4. Audit trail by trigger
--
--    The application wrote audit rows by hand after some actions and not
--    others; payroll wrote none. These triggers record every insert, update
--    and delete on the tables that matter. Application-written rows for the
--    same change can be removed from the screens once this is live.
-- -----------------------------------------------------------------------------

/**
 * Writes one audit row for the change that fired the trigger.
 * An update that changes nothing writes nothing.
 */
create or replace function app.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_org uuid;
  v_id  uuid;
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    if v_old = v_new then
      return new;
    end if;
  else
    v_old := to_jsonb(old);
  end if;

  v_org := coalesce((v_new ->> 'organization_id')::uuid, (v_old ->> 'organization_id')::uuid);
  v_id  := coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid);

  insert into public.audit_logs
    (organization_id, user_id, action, table_name, record_id, old_value, new_value)
  values
    (v_org, auth.uid(), tg_op, tg_table_name, v_id, v_old, v_new);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function app.write_audit_log() from public, anon, authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'employees',
    'users',
    'payroll_periods',
    'payroll_calculations',
    'allowances_deductions',
    'leaves',
    'ot_requests',
    'attendance_logs',
    'shifts',
    'shift_assignments',
    'attendance_policies',
    'system_settings',
    'role_permissions'
  ]
  loop
    if to_regclass('public.' || v_table) is not null then
      execute format('drop trigger if exists audit_row_change on public.%I', v_table);
      execute format(
        'create trigger audit_row_change after insert or update or delete on public.%I '
        'for each row execute function app.write_audit_log()',
        v_table
      );
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 5. User roles
--
--    The user form wrote 'Admin', 'HR' and similar. Those match no role, so
--    the users had no permissions. Casing is corrected here; a role that does
--    not exist at all (for example 'Accountant') is reported, not guessed.
-- -----------------------------------------------------------------------------

update public.users
   set role = lower(trim(role))
 where role is not null
   and role <> lower(trim(role))
   and lower(trim(role)) in ('admin', 'hr', 'manager', 'supervisor', 'employee');

do $$
declare
  v_unknown text;
begin
  select string_agg(distinct coalesce(role, '(null)'), ', ') into v_unknown
    from public.users
   where role is null
      or role not in ('admin', 'hr', 'manager', 'supervisor', 'employee');

  if v_unknown is not null then
    raise exception
      'พบผู้ใช้ที่มีบทบาทซึ่งไม่มีในระบบ: %  กรุณากำหนดบทบาทที่ถูกต้องให้ผู้ใช้เหล่านี้ก่อนรัน migration นี้', v_unknown;
  end if;
end $$;

alter table public.users drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check
  check (role in ('admin', 'hr', 'manager', 'supervisor', 'employee'));

commit;
