-- =============================================================================
-- 0004_employee_photo_storage.sql
--
-- Storage for employee photos.
--
-- The Add Employee form used to ask for a "Photo URL", which meant the photo had
-- to be hosted somewhere else first — in practice nobody filled it in. The form
-- now uploads the picture directly, so it needs a bucket with the same tenant
-- boundary the tables have.
--
-- Objects are keyed as `<organization_id>/<uuid>.<ext>`, and every policy below
-- compares the first path segment against the caller's organization. A tenant
-- can therefore neither read nor overwrite another tenant's staff photos.
--
-- Requires 0002_rls.sql for app.current_org_id() and app.has_permission().
-- =============================================================================

begin;

-- Public read is enabled so <img src> works without signing every URL. The file
-- names are random UUIDs, so an object is unguessable, but treat this as
-- "unlisted" rather than "private": switch the bucket to private and move the
-- app to createSignedUrl() if photos are ever considered sensitive.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'employee-photos',
  'employee-photos',
  true,
  5242880,  -- 5 MB, comfortably above the ~60 KB the client produces
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/**
 * The organization that owns an object, taken from the first path segment.
 * Returns null when the path is not a UUID folder, which fails every policy.
 */
create or replace function app.storage_object_org(object_name text)
returns uuid
language plpgsql
immutable
as $$
begin
  return (storage.foldername(object_name))[1]::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- Policies
-- -----------------------------------------------------------------------------

drop policy if exists employee_photos_read on storage.objects;
create policy employee_photos_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'employee-photos'
    and app.storage_object_org(name) = app.current_org_id()
  );

-- Uploading is part of creating or editing an employee, so it takes the same
-- permission as the table write rather than being open to anyone signed in.
drop policy if exists employee_photos_insert on storage.objects;
create policy employee_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'employee-photos'
    and app.storage_object_org(name) = app.current_org_id()
    and (app.has_permission('employee', 'add') or app.has_permission('employee', 'edit'))
  );

drop policy if exists employee_photos_update on storage.objects;
create policy employee_photos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'employee-photos'
    and app.storage_object_org(name) = app.current_org_id()
    and app.has_permission('employee', 'edit')
  )
  with check (
    bucket_id = 'employee-photos'
    and app.storage_object_org(name) = app.current_org_id()
  );

-- Replacing a photo deletes the one it replaced, which is an edit rather than a
-- deletion of the employee, so employee.edit is enough here.
drop policy if exists employee_photos_delete on storage.objects;
create policy employee_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'employee-photos'
    and app.storage_object_org(name) = app.current_org_id()
    and (app.has_permission('employee', 'add') or app.has_permission('employee', 'edit'))
  );

commit;
