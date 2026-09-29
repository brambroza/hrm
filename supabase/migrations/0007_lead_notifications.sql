-- =============================================================================
-- 0007_lead_notifications.sql
--
-- Lets the notify-lead Edge Function record that the sales mailbox has been
-- told about a registration, so one registration produces one email however
-- many times the function is called.
--
-- Adds two columns to public.leads. Nothing is removed or rewritten.
-- Idempotent: safe to run more than once. Requires 0005_leads.sql.
-- =============================================================================

begin;

alter table public.leads add column if not exists notified_at timestamptz;
alter table public.leads add column if not exists notify_attempts integer not null default 0;

comment on column public.leads.notified_at is 'When the notification email was accepted by the mail provider; null until then.';
comment on column public.leads.notify_attempts is 'How many times sending was attempted, to stop endless retries.';

-- The public form still may only insert, and may not claim a lead was notified.
drop policy if exists leads_insert_public on public.leads;
create policy leads_insert_public on public.leads
  for insert to anon, authenticated
  with check (status = 'new' and notified_at is null and notify_attempts = 0);

commit;
