# Database

## Run order

| File | Purpose |
|---|---|
| `schema.sql` | Baseline tables. Run once on an empty database. |
| `seed.sql` | Legacy single-tenant seed. **Superseded by `migrations/0003`** — do not run on a new database; `app.provision_organization()` seeds roles per tenant instead. |
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

## Tests

`tests/rls_tenant_isolation.sql` builds two organizations and asserts that
neither can see the other's rows. Run it against a scratch database — it writes
test data and rolls back at the end.
