# Database

## Initial schema

**`schema.sql`** is the full initial schema for a fresh database. It includes everything that used to be applied via migrations (enums, tables, indexes, triggers, seed data for locations and approval config).

### Using the initial schema only

1. **Fresh install**: Run `schema.sql` against an empty database (e.g. in Supabase SQL editor or `psql`).
2. **Optional**: Remove the `migrations/` folder if you no longer need incremental migrations.
3. **Storage**: If you use Supabase Storage for report media, run the commented block at the end of `schema.sql` to enable RLS and policies for the `reports` bucket.

### Seed data

- **`seed.sql`** – Sample users, venues, and hierarchy (idempotent). Update it to use `first_name` / `last_name` and current columns; it was written for an older schema.
- **`seed-locations.ts`** – Script to seed locations if needed.

### Legacy audit trigger (fix for "action_type" NOT NULL error)

If you see **"null value in column \"action_type\" of relation \"audit_logs\" violates not-null constraint"** when a global director (or any approver) approves a report, the database likely still has an old trigger on `event_approvals` that inserts into `audit_logs` without `action_type`. Run once:

```bash
# In Supabase SQL editor or psql, run:
# db/drop_legacy_audit_trigger.sql
```

Audit logging is done in application code (`audit.service.ts`) with the correct `action_type`.

### Verification OTP "change" action (password change)

If **password change** OTP fails with a check constraint or "invalid input value for enum" error, the `verification_otps` table may still only allow `action IN ('approve', 'reject', 'create')`. Run:

```bash
# In Supabase SQL editor or psql:
# Paste contents of db/migrations/add_verification_otp_change_action.sql
```

Or run the migration file with `psql -d your_database -f db/migrations/add_verification_otp_change_action.sql`.

### Schema changes (existing databases)

If you already have the schema applied and add new columns later, run the corresponding SQL. For example, after adding `deleted_at` for venue soft delete:

```sql
ALTER TABLE venues ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_venues_deleted_at ON venues(deleted_at) WHERE deleted_at IS NULL;
```

### Notes

- Application tables do not use Row Level Security; authorization is handled in the backend.
- Reports no longer have `summary` or `net_profit`; use `db/drop_reports_summary_net_profit.sql` on existing DBs to drop those columns.
- Events, venues, and DJs require a unique `short_id` on insert; the app generates these when creating records.
