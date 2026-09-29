-- =============================================================================
-- phase0_preflight.sql
--
-- Read-only. Run before migrations/0006_phase0_integrity.sql to see which rows
-- would stop it, and which rows the NOT VALID constraints leave untouched.
-- Safe on production: it changes nothing.
--
--   psql "$DATABASE_URL" -f supabase/tests/phase0_preflight.sql
-- =============================================================================

\echo '1. Duplicate payroll calculations (blocks 0006 step 2)'
select employee_id, payroll_period_id, count(*) as copies
  from public.payroll_calculations
 group by employee_id, payroll_period_id
having count(*) > 1;

\echo '2. Users whose role does not exist (blocks 0006 step 5)'
select id, email, role
  from public.users
 where role is null
    or lower(trim(role)) not in ('admin', 'hr', 'manager', 'supervisor', 'employee');

\echo '3. Users whose role casing will be corrected by 0006 step 5'
select id, email, role, lower(trim(role)) as becomes
  from public.users
 where role is not null
   and role <> lower(trim(role))
   and lower(trim(role)) in ('admin', 'hr', 'manager', 'supervisor', 'employee');

\echo '4. Payroll periods that end before they start (left in place, reported only)'
select id, name, start_date, end_date
  from public.payroll_periods
 where end_date < start_date;

\echo '5. Leave requests that end before they start, or half-day over several days'
select id, employee_id, start_date, end_date, is_half_day
  from public.leaves
 where end_date < start_date
    or (coalesce(is_half_day, false) and start_date <> end_date);

\echo '6. Attendance stored without a time zone offset'
\echo '   Manual entries made before the Phase 0 fix were read as UTC, so they'
\echo '   sit 7 hours late. Rows whose check-in falls outside 04:00-23:59 Thai'
\echo '   time on their own log_date are listed for review. Nothing is changed.'
select id, employee_id, log_date, check_in, check_out, source
  from public.attendance_logs
 where check_in is not null
   and (check_in at time zone 'Asia/Bangkok')::date <> log_date
 order by log_date desc
 limit 200;

\echo '7. Closed payroll periods that will become locked'
select id, name, status
  from public.payroll_periods
 where lower(trim(coalesce(status, ''))) in ('closed', 'locked');
