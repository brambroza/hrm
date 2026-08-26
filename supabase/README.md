# Database

## Run order

| File | Purpose |
|---|---|
| `schema.sql` | Baseline tables. Run once on an empty database. |
| `seed.sql` | Legacy single-tenant seed. **Superseded by `migrations/0003`** — do not run on a new database. 0003 carries the full permission catalogue and provisions roles per tenant through `app.provision_organization()`. |
| `alter.sql` | Historical patches folded into `schema.sql`. Kept for reference only. |
| `migrations/0001_multi_tenant.sql` | Adds `organization_id` everywhere, rescopes unique constraints, backfills. |
| `migrations/0002_rls.sql` | Enables Row Level Security and the access policies. |
| `migrations/0003_org_provisioning.sql` | Permission catalogue, role templates, per-tenant provisioning, tenant auto-fill triggers. |

Migrations run in numeric order and each is idempotent, so re-running one is safe.

```bash
supabase db push                                   # with the Supabase CLI
# or, against a connection string:
psql "$DATABASE_URL" -f migrations/0001_multi_tenant.sql
psql "$DATABASE_URL" -f migrations/0002_rls.sql
psql "$DATABASE_URL" -f migrations/0003_org_provisioning.sql
```

Take a backup before the first run: `0001` sets `NOT NULL` and drops the old
global unique constraints, which cannot be undone by re-running it.

## Access model

Every table is protected by RLS. Three helper functions in the `app` schema
carry the rules:

- `app.current_org_id()` — the tenant of the authenticated user.
- `app.current_employee_id()` — the employee record linked to that user, if any.
- `app.has_permission(module, action)` — whether their role grants an action.

A row is reachable only inside its own organization. Seeing other people's
records requires the matching module permission; an employee reaches their own
attendance, leave, OT and payslips without any permission grant, which is what
the self-service screens rely on.

`service_role` bypasses RLS. Edge Functions that must cross those boundaries —
payroll calculation, user creation — run under it. Nothing in the browser
bundle should ever hold that key.

## Onboarding a new tenant

```sql
insert into organizations (name, tax_id) values ('บริษัท ตัวอย่าง จำกัด', '0105500000000')
returning id;

select app.provision_organization('<the returned id>');
```

This copies the five default roles, their grants, a default attendance policy
and a settings row into that tenant. It is idempotent, so call it again after
adding new permissions to the catalogue to backfill the missing grants.

## Schema drift

The live database does not match `schema.sql` column for column. Missing pieces
found so far: `organizations.created_at`, `system_settings.updated_at`,
`audit_logs.created_at`, and `payroll_period_id` on both payroll tables.

Each of those used to abort the whole migration on its own line, so `0001` now
handles drift instead of assuming a perfect schema:

- **Step 0** restores the `created_at` / `updated_at` columns the application
  orders by.
- **Step 0b** restores structural columns the application cannot work without.
  `payroll_period_id` is the important one — `services/payroll.js` selects it and
  joins `payroll_periods` through it, so the payroll screens were already broken
  before any migration ran.
- **Everything optional** — indexes, unique indexes, employee-derived backfills —
  is guarded by `_has_column()` and skipped with a `NOTICE` rather than failing.

Run `tests/schema_drift_report.sql` afterwards to see what is still missing. It
is read-only and safe on production:

```bash
psql "$DATABASE_URL" -f supabase/tests/schema_drift_report.sql
```

It reports four things: columns `schema.sql` declares that the database lacks,
indexes `0001` could not create, tables without RLS (must be empty), and the
per-tenant role and grant counts.

## Tests

`tests/rls_tenant_isolation.sql` builds two organizations and asserts that
neither can see the other's rows. Run it against a scratch database — it writes
test data and rolls back at the end.

The whole chain has been exercised against a local PostgreSQL 16 cluster, on two
databases: one built cleanly from `schema.sql`, and one deliberately damaged to
match the drift found in the live database (three timestamp columns and
`payroll_period_id` on both payroll tables removed). Both run 0001-0004, pass
the isolation test, and run all four migrations a second time without changing
anything. On the clean database nothing is skipped; on the damaged one the
missing columns are restored and the drift report comes back empty.

Expected state afterwards: RLS enabled on all 29 public tables, 102 policies in
`public` plus 4 in `storage`, a 60-row permission catalogue, and per tenant
admin 60 grants, hr 44, manager 35, supervisor 15, employee 1.

## Leads (0005)

`0005_leads.sql` adds `public.leads` for the call-back form at `/register`.
The table is insert-only for `anon`/`authenticated`; review submissions in the
Supabase dashboard (Table Editor → leads) or with `service_role`.
