-- =============================================================================
-- phase0_integrity.sql
--
-- Proves the rules added by migrations/0006_phase0_integrity.sql hold at the
-- database, whatever the browser sends.
--
-- Everything runs inside a transaction that is rolled back, so no test data
-- survives. Run against a scratch or staging database, never production:
--
--   psql "$DATABASE_URL" -f supabase/tests/phase0_integrity.sql
--
-- Any failed assertion aborts with an exception; "ALL PHASE 0 INTEGRITY TESTS
-- PASSED" at the end means every check held.
-- =============================================================================

begin;

set local role postgres;

create temporary table t_ids (key text primary key, id uuid) on commit drop;
grant select on t_ids to authenticated;

do $$
declare
  org uuid;
  hr_user  uuid := '00000000-0000-4000-8000-0000000000a1';
  emp_user uuid := '00000000-0000-4000-8000-0000000000a2';
  hr_emp uuid;
  emp uuid;
  open_period uuid;
  closed_period uuid;
  closed_calc uuid;
  hr_leave uuid;
  emp_leave uuid;
  emp_leave_2 uuid;
begin
  insert into organizations (name) values ('Phase 0 Test Org') returning id into org;
  perform app.provision_organization(org);

  insert into auth.users (id, email, instance_id, aud, role)
  values (hr_user,  'hr@test.local',  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
         (emp_user, 'emp@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  on conflict (id) do nothing;

  insert into users (id, organization_id, email, full_name, role)
  -- Admin, so every refusal below comes from the new rules and not from a
  -- missing permission.
  values (hr_user,  org, 'hr@test.local',  'Admin',    'admin'),
         (emp_user, org, 'emp@test.local', 'Employee', 'employee');

  insert into employees (organization_id, user_id, employee_id, name, name_th, salary)
  values (org, hr_user, 'EMP-001', 'HR', 'เอชอาร์', 40000) returning id into hr_emp;
  insert into employees (organization_id, user_id, employee_id, name, name_th, salary)
  values (org, emp_user, 'EMP-002', 'Employee', 'พนักงาน', 22500) returning id into emp;

  insert into payroll_periods (organization_id, name, start_date, end_date, status)
  values (org, 'Open', '2026-10-01', '2026-10-31', 'open') returning id into open_period;
  insert into payroll_periods (organization_id, name, start_date, end_date, status)
  values (org, 'Closed', '2026-09-01', '2026-09-30', 'open') returning id into closed_period;

  insert into payroll_calculations (organization_id, employee_id, payroll_period_id, basic_salary, total_income, total_deductions, net_salary, status)
  values (org, emp, closed_period, 22500, 22500, 0, 22500, 'PENDING') returning id into closed_calc;

  -- Stored the way the application writes it: lowercase.
  update payroll_periods set status = 'closed' where id = closed_period;

  insert into leaves (organization_id, employee_id, leave_type, start_date, end_date, status)
  values (org, hr_emp, 'annual', '2026-10-05', '2026-10-05', 'pending') returning id into hr_leave;
  insert into leaves (organization_id, employee_id, leave_type, start_date, end_date, status)
  values (org, emp, 'annual', '2026-10-06', '2026-10-06', 'pending') returning id into emp_leave;
  insert into leaves (organization_id, employee_id, leave_type, start_date, end_date, status)
  values (org, emp, 'sick', '2026-10-08', '2026-10-08', 'pending') returning id into emp_leave_2;

  insert into t_ids values
    ('org', org), ('hr_emp', hr_emp), ('emp', emp),
    ('open_period', open_period), ('closed_period', closed_period), ('closed_calc', closed_calc),
    ('hr_leave', hr_leave), ('emp_leave', emp_leave), ('emp_leave_2', emp_leave_2);
end $$;

/**
 * Runs a statement and asserts that it is refused.
 * @param p_label  what is being checked
 * @param p_sql    the statement that must fail
 */
create function pg_temp.must_fail(p_label text, p_sql text) returns void
language plpgsql as $$
declare
  v_rows integer;
begin
  begin
    execute p_sql;
    get diagnostics v_rows = row_count;
  exception when others then
    -- A missing table privilege would make every check pass for the wrong reason.
    if sqlstate = '42501' and sqlerrm like 'permission denied for%' then
      raise exception 'FAILED: % hit a missing privilege, the rule was not exercised (%)', p_label, sqlerrm;
    end if;
    raise notice 'ok   % (%)', p_label, sqlerrm;
    return;
  end;
  if v_rows = 0 then
    raise exception 'FAILED: % touched no rows, the rule was not exercised', p_label;
  end if;
  raise exception 'FAILED: % was allowed', p_label;
end $$;

-- -----------------------------------------------------------------------------
-- As an administrator
-- -----------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}';


-- 1. Closed periods are locked, including for an administrator.
select pg_temp.must_fail('rename a closed period',
  format($q$update payroll_periods set name = 'x' where id = %L$q$, (select id from t_ids where key = 'closed_period')));
select pg_temp.must_fail('reopen a closed period',
  format($q$update payroll_periods set status = 'open' where id = %L$q$, (select id from t_ids where key = 'closed_period')));

-- 3. Nobody decides their own request.
select pg_temp.must_fail('approve own leave',
  format($q$update leaves set status = 'approved' where id = %L$q$, (select id from t_ids where key = 'hr_leave')));

-- 3. A rejection needs a reason.
select pg_temp.must_fail('reject without a reason',
  format($q$update leaves set status = 'rejected' where id = %L$q$, (select id from t_ids where key = 'emp_leave')));

-- 3. Approving someone else works, and the stamp comes from the session.
do $$
declare
  v_row leaves%rowtype;
begin
  update leaves
     set status = 'approved',
         approved_by = '00000000-0000-4000-8000-0000000000a2' -- a forged approver
   where id = (select id from t_ids where key = 'emp_leave')
  returning * into v_row;

  if v_row.status is distinct from 'approved' then
    raise exception 'FAILED: the approver could not approve an employee''s leave';
  end if;
  if v_row.approved_by is distinct from '00000000-0000-4000-8000-0000000000a1'::uuid then
    raise exception 'FAILED: approved_by was taken from the request, not the session';
  end if;
  if v_row.approved_at is null then
    raise exception 'FAILED: approved_at was not stamped';
  end if;
  raise notice 'ok   approve another employee''s leave, stamped from the session';
end $$;

do $$
declare
  v_row leaves%rowtype;
begin
  update leaves
     set status = 'rejected', decision_note = 'เอกสารแนบไม่ครบ'
   where id = (select id from t_ids where key = 'emp_leave_2')
  returning * into v_row;

  if v_row.status is distinct from 'rejected' then
    raise exception 'FAILED: the approver could not reject with a reason';
  end if;
  raise notice 'ok   reject with a reason';
end $$;

-- -----------------------------------------------------------------------------
-- As an employee with no module permissions
-- -----------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}';

do $$
declare
  v_count integer;
  v_id uuid;
begin
  -- Self-service: sees own leave only.
  select count(*) into v_count from leaves;
  if v_count <> 2 then
    raise exception 'FAILED: employee sees % leave rows, expected their own 2', v_count;
  end if;

  -- Self-service: files own leave without leave.add.
  insert into leaves (employee_id, leave_type, start_date, end_date, status)
  values ((select id from t_ids where key = 'emp'), 'personal', '2026-10-12', '2026-10-12', 'pending')
  returning id into v_id;
  if v_id is null then
    raise exception 'FAILED: employee could not file their own leave';
  end if;

  raise notice 'ok   employee reads and files only their own leave';
end $$;

select pg_temp.must_fail('employee files leave for someone else',
  format($q$insert into leaves (employee_id, leave_type, start_date, end_date, status)
            values (%L, 'annual', '2026-10-13', '2026-10-13', 'pending')$q$,
         (select id from t_ids where key = 'hr_emp')));

select pg_temp.must_fail('leave ending before it starts',
  format($q$insert into leaves (employee_id, leave_type, start_date, end_date, status)
            values (%L, 'annual', '2026-10-15', '2026-10-14', 'pending')$q$,
         (select id from t_ids where key = 'emp')));

select pg_temp.must_fail('half-day leave across two days',
  format($q$insert into leaves (employee_id, leave_type, start_date, end_date, is_half_day, status)
            values (%L, 'annual', '2026-10-15', '2026-10-16', true, 'pending')$q$,
         (select id from t_ids where key = 'emp')));

-- -----------------------------------------------------------------------------
-- As the table owner: rules that do not depend on who is asking
-- -----------------------------------------------------------------------------
reset role;
set local role postgres;
set local request.jwt.claims = '';


select pg_temp.must_fail('delete a closed period',
  format($q$delete from payroll_periods where id = %L$q$, (select id from t_ids where key = 'closed_period')));

select pg_temp.must_fail('change a calculation in a closed period',
  format($q$update payroll_calculations set net_salary = 1 where id = %L$q$, (select id from t_ids where key = 'closed_calc')));

select pg_temp.must_fail('delete a calculation in a closed period',
  format($q$delete from payroll_calculations where id = %L$q$, (select id from t_ids where key = 'closed_calc')));

select pg_temp.must_fail('add a calculation to a closed period',
  format($q$insert into payroll_calculations (organization_id, employee_id, payroll_period_id, basic_salary, total_income, total_deductions, net_salary)
            values (%L, %L, %L, 1, 1, 0, 1)$q$,
         (select id from t_ids where key = 'org'),
         (select id from t_ids where key = 'hr_emp'),
         (select id from t_ids where key = 'closed_period')));

select pg_temp.must_fail('period ending before it starts',
  format($q$insert into payroll_periods (organization_id, name, start_date, end_date, status)
            values (%L, 'bad', '2026-11-30', '2026-11-01', 'draft')$q$,
         (select id from t_ids where key = 'org')));

-- 2. One calculation per employee per period.
insert into payroll_calculations (organization_id, employee_id, payroll_period_id, basic_salary, total_income, total_deductions, net_salary)
select (select id from t_ids where key = 'org'),
       (select id from t_ids where key = 'emp'),
       (select id from t_ids where key = 'open_period'),
       22500, 22500, 0, 22500;

select pg_temp.must_fail('second calculation for the same employee and period',
  format($q$insert into payroll_calculations (organization_id, employee_id, payroll_period_id, basic_salary, total_income, total_deductions, net_salary)
            values (%L, %L, %L, 1, 1, 0, 1)$q$,
         (select id from t_ids where key = 'org'),
         (select id from t_ids where key = 'emp'),
         (select id from t_ids where key = 'open_period')));

-- 5. Roles.
select pg_temp.must_fail('capitalised role',
  $q$update users set role = 'Admin' where id = '00000000-0000-4000-8000-0000000000a1'$q$);
select pg_temp.must_fail('role that does not exist',
  $q$update users set role = 'accountant' where id = '00000000-0000-4000-8000-0000000000a1'$q$);

-- 4. Audit trail.
do $$
declare
  v_before integer;
  v_after integer;
  v_row audit_logs%rowtype;
  v_emp uuid := (select id from t_ids where key = 'emp');
begin
  select count(*) into v_before from audit_logs where table_name = 'employees' and record_id = v_emp;

  update employees set salary = 23000 where id = v_emp;
  select count(*) into v_after from audit_logs where table_name = 'employees' and record_id = v_emp;
  if v_after <> v_before + 1 then
    raise exception 'FAILED: salary change wrote % audit rows, expected 1', v_after - v_before;
  end if;

  select * into v_row from audit_logs
   where table_name = 'employees' and record_id = v_emp
   order by created_at desc, id desc limit 1;
  if v_row.action <> 'UPDATE'
     or (v_row.old_value ->> 'salary')::numeric <> 22500
     or (v_row.new_value ->> 'salary')::numeric <> 23000 then
    raise exception 'FAILED: audit row does not hold the old and new salary';
  end if;
  if v_row.organization_id is distinct from (select id from t_ids where key = 'org') then
    raise exception 'FAILED: audit row is not attributed to the organization';
  end if;

  -- An update that changes nothing writes nothing.
  update employees set salary = 23000 where id = v_emp;
  select count(*) into v_before from audit_logs where table_name = 'employees' and record_id = v_emp;
  if v_before <> v_after then
    raise exception 'FAILED: a no-op update wrote an audit row';
  end if;

  select count(*) into v_after from audit_logs where table_name = 'payroll_calculations';
  if v_after < 2 then
    raise exception 'FAILED: payroll calculations are not audited';
  end if;

  raise notice 'ok   audit trail records changes, skips no-ops, covers payroll';
end $$;

select 'ALL PHASE 0 INTEGRITY TESTS PASSED' as result;

rollback;
