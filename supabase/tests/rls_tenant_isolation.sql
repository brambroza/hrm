-- =============================================================================
-- rls_tenant_isolation.sql
--
-- Proves that the policies in 0002_rls.sql actually separate tenants, rather
-- than the application merely hiding buttons.
--
-- Builds two organizations with one employee each, then queries as a user of
-- org A and asserts that nothing belonging to org B is reachable — including
-- the case that matters most, the payroll table.
--
-- Everything runs inside a transaction that is rolled back, so no test data
-- survives. Run against a scratch or staging database, never production:
--
--   psql "$DATABASE_URL" -f supabase/tests/rls_tenant_isolation.sql
--
-- Any failed assertion aborts with an exception; "ALL TENANT ISOLATION TESTS
-- PASSED" at the end means every check held.
-- =============================================================================

begin;

set local role postgres;

-- -----------------------------------------------------------------------------
-- Fixtures
-- -----------------------------------------------------------------------------

do $$
declare
  org_a uuid;
  org_b uuid;
  user_a uuid := '00000000-0000-4000-8000-00000000000a';
  user_b uuid := '00000000-0000-4000-8000-00000000000b';
  emp_a uuid;
  emp_b uuid;
  period_a uuid;
  period_b uuid;
begin
  insert into organizations (name) values ('Test Org A') returning id into org_a;
  insert into organizations (name) values ('Test Org B') returning id into org_b;

  perform app.provision_organization(org_a);
  perform app.provision_organization(org_b);

  -- auth.users rows are required by the foreign key on public.users.
  insert into auth.users (id, email, instance_id, aud, role)
  values (user_a, 'a@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
         (user_b, 'b@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  on conflict (id) do nothing;

  -- Both are HR in their own company, so neither is short of permissions.
  -- Anything they cannot see is the tenant boundary at work, not a missing grant.
  insert into users (id, organization_id, email, full_name, role)
  values (user_a, org_a, 'a@test.local', 'HR A', 'hr'),
         (user_b, org_b, 'b@test.local', 'HR B', 'hr');

  insert into employees (organization_id, user_id, employee_id, name, name_th, salary)
  values (org_a, user_a, 'EMP-001', 'Employee A', 'พนักงาน เอ', 30000)
  returning id into emp_a;

  insert into employees (organization_id, user_id, employee_id, name, name_th, salary)
  values (org_b, user_b, 'EMP-001', 'Employee B', 'พนักงาน บี', 90000)
  returning id into emp_b;

  -- Same employee code in both companies: this insert fails if the old global
  -- unique constraint on employees.employee_id was not rescoped by 0001.

  insert into departments (organization_id, name) values (org_a, 'บัญชี'), (org_b, 'บัญชี');
  -- Likewise for department names.

  insert into payroll_periods (organization_id, name, start_date, end_date)
  values (org_a, 'Jan A', '2026-01-01', '2026-01-31') returning id into period_a;
  insert into payroll_periods (organization_id, name, start_date, end_date)
  values (org_b, 'Jan B', '2026-01-01', '2026-01-31') returning id into period_b;

  insert into payroll_calculations (organization_id, employee_id, payroll_period_id, basic_salary, net_salary)
  values (org_a, emp_a, period_a, 30000, 28500),
         (org_b, emp_b, period_b, 90000, 84000);

  insert into leaves (organization_id, employee_id, leave_type, start_date, end_date)
  values (org_a, emp_a, 'annual', '2026-02-02', '2026-02-03'),
         (org_b, emp_b, 'annual', '2026-02-02', '2026-02-03');

  insert into attendance_logs (organization_id, employee_id, log_date)
  values (org_a, emp_a, '2026-01-05'),
         (org_b, emp_b, '2026-01-05');

  create temp table test_ctx (org_a uuid, org_b uuid, emp_a uuid, emp_b uuid, user_a uuid, user_b uuid);
  insert into test_ctx values (org_a, org_b, emp_a, emp_b, user_a, user_b);
end $$;

-- -----------------------------------------------------------------------------
-- Act as HR of org A.
-- -----------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';

do $$
declare
  ctx test_ctx%rowtype;
  n int;
  v numeric;
begin
  select * into ctx from test_ctx;

  -- The helper functions must resolve to org A.
  if app.current_org_id() is distinct from ctx.org_a then
    raise exception 'FAIL: current_org_id() returned %, expected org A (%)', app.current_org_id(), ctx.org_a;
  end if;

  if app.current_employee_id() is distinct from ctx.emp_a then
    raise exception 'FAIL: current_employee_id() returned %, expected %', app.current_employee_id(), ctx.emp_a;
  end if;

  -- Employees: exactly one visible, and it is A's.
  select count(*) into n from employees;
  if n <> 1 then
    raise exception 'FAIL: employees visible = %, expected 1', n;
  end if;

  select count(*) into n from employees where organization_id = ctx.org_b;
  if n <> 0 then
    raise exception 'FAIL: % employees of org B are visible to org A', n;
  end if;

  -- Payroll is the row that must never leak.
  select count(*) into n from payroll_calculations where organization_id = ctx.org_b;
  if n <> 0 then
    raise exception 'FAIL: % payroll rows of org B are visible to org A', n;
  end if;

  select max(basic_salary) into v from payroll_calculations;
  if v is distinct from 30000 then
    raise exception 'FAIL: highest visible salary is %, expected only org A''s 30000', v;
  end if;

  -- The remaining tenant-scoped tables.
  select count(*) into n from leaves           where organization_id = ctx.org_b; if n <> 0 then raise exception 'FAIL: org B leaves visible (%)', n; end if;
  select count(*) into n from attendance_logs  where organization_id = ctx.org_b; if n <> 0 then raise exception 'FAIL: org B attendance visible (%)', n; end if;
  select count(*) into n from departments      where organization_id = ctx.org_b; if n <> 0 then raise exception 'FAIL: org B departments visible (%)', n; end if;
  select count(*) into n from payroll_periods  where organization_id = ctx.org_b; if n <> 0 then raise exception 'FAIL: org B payroll periods visible (%)', n; end if;
  select count(*) into n from roles            where organization_id = ctx.org_b; if n <> 0 then raise exception 'FAIL: org B roles visible (%)', n; end if;
  select count(*) into n from users            where organization_id = ctx.org_b; if n <> 0 then raise exception 'FAIL: org B users visible (%)', n; end if;
  select count(*) into n from organizations    where id              = ctx.org_b; if n <> 0 then raise exception 'FAIL: org B itself visible (%)', n; end if;

  raise notice 'PASS: org A sees nothing belonging to org B';
end $$;

-- Writing across the boundary must fail too, not just reading.
do $$
declare
  ctx test_ctx%rowtype;
  n int;
begin
  select * into ctx from test_ctx;

  -- An update aimed at org B matches no visible row, so it changes nothing.
  update employees set salary = 1 where organization_id = ctx.org_b;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL: org A updated % rows belonging to org B', n;
  end if;

  delete from payroll_calculations where organization_id = ctx.org_b;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL: org A deleted % payroll rows belonging to org B', n;
  end if;

  -- Inserting a row stamped with another tenant must be rejected outright.
  begin
    insert into departments (organization_id, name) values (ctx.org_b, 'ลักลอบ');
    raise exception 'FAIL: org A inserted a department into org B';
  exception
    when insufficient_privilege then
      null; -- expected: the WITH CHECK clause refused it
  end;

  raise notice 'PASS: org A cannot write into org B';
end $$;

-- -----------------------------------------------------------------------------
-- Act as a plain employee: own rows only, no colleagues.
-- -----------------------------------------------------------------------------

set local role postgres;
update users set role = 'employee' where id = '00000000-0000-4000-8000-00000000000a';

do $$
declare
  ctx test_ctx%rowtype;
  org_a uuid;
  emp2 uuid;
begin
  select * into ctx from test_ctx;
  org_a := ctx.org_a;

  insert into employees (organization_id, employee_id, name, name_th, salary)
  values (org_a, 'EMP-002', 'Colleague', 'เพื่อนร่วมงาน', 55000)
  returning id into emp2;

  insert into leaves (organization_id, employee_id, leave_type, start_date, end_date)
  values (org_a, emp2, 'annual', '2026-03-01', '2026-03-02');
end $$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';

do $$
declare
  n int;
begin
  -- The employee role holds no employee.view grant, so only the self row shows.
  select count(*) into n from employees;
  if n <> 1 then
    raise exception 'FAIL: employee sees % employee rows, expected only their own', n;
  end if;

  select count(*) into n from leaves;
  if n <> 1 then
    raise exception 'FAIL: employee sees % leave rows, expected only their own', n;
  end if;

  raise notice 'PASS: employee sees only their own records';
end $$;

do $$ begin raise notice 'ALL TENANT ISOLATION TESTS PASSED'; end $$;

rollback;
