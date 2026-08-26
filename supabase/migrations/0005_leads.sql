-- =============================================================================
-- 0005_leads.sql
--
-- Registration of interest from the public landing page.
--
-- A visitor who wants a call back fills in their organization, headcount,
-- address and contact details. The form is public, so:
--   * `anon` and `authenticated` may INSERT, and nothing else;
--   * nobody can read the table through the API — leads are reviewed in the
--     Supabase dashboard (or by a future admin page with its own policy);
--   * CHECK constraints bound every field so the open endpoint cannot be used
--     to store arbitrary blobs.
--
-- Requires 0002_rls.sql (RLS conventions only; no app.* functions are used).
-- =============================================================================

begin;

create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  organization_name text not null check (char_length(organization_name) between 2 and 200),
  employee_count    integer not null check (employee_count between 1 and 100000),
  address           text not null check (char_length(address) between 5 and 1000),
  contact_name      text not null check (char_length(contact_name) between 2 and 200),
  phone             text not null check (phone ~ '^\+?[0-9]{8,15}$'),
  email             text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  note              text check (note is null or char_length(note) <= 2000),
  source            text not null default 'landing' check (char_length(source) <= 50),
  status            text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'closed')),
  created_at        timestamptz not null default now()
);

comment on table public.leads is 'Call-back requests submitted from the public landing page.';

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_email_idx on public.leads (lower(email));

alter table public.leads enable row level security;

-- Insert-only for the public form. No select/update/delete policy exists, so
-- those are denied for anon and authenticated; service_role bypasses RLS.
drop policy if exists leads_insert_public on public.leads;
create policy leads_insert_public on public.leads
  for insert to anon, authenticated
  with check (status = 'new');

revoke all on public.leads from anon, authenticated;
grant insert on public.leads to anon, authenticated;

commit;
