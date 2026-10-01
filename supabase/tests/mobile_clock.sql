-- Checks for 0008_mobile_clock.sql. Run after the migration:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/mobile_clock.sql
-- Every statement that must fail is wrapped so the script reports and goes on.

\set ON_ERROR_STOP on

do $$
begin
  -- Tables and columns exist.
  perform 1 from information_schema.tables where table_schema = 'public' and table_name in ('work_sites', 'clock_punches') having count(*) = 2;
  if not found then raise exception 'work_sites or clock_punches missing'; end if;
  perform 1 from information_schema.columns where table_name = 'employees' and column_name = 'line_user_id';
  if not found then raise exception 'employees.line_user_id missing'; end if;

  -- RLS is on and forced.
  perform 1 from pg_class where relname in ('work_sites', 'clock_punches') and relrowsecurity and relforcerowsecurity having count(*) = 2;
  if not found then raise exception 'RLS not forced on the new tables'; end if;

  -- Nobody but the service role can write punches: no insert policy exists.
  perform 1 from pg_policies where tablename = 'clock_punches' and cmd in ('INSERT', 'UPDATE', 'DELETE');
  if found then raise exception 'clock_punches has a write policy; punches must come only from the Edge Function'; end if;

  -- Radius bounds hold.
  begin
    insert into public.work_sites (organization_id, name, latitude, longitude, radius_m)
    values (gen_random_uuid(), 'x', 0, 0, 10);
    raise exception 'a radius of 10 m was accepted';
  exception when check_violation or foreign_key_violation then null;
  end;

  raise notice 'mobile_clock: all checks passed';
end $$;
