---
description: Database schema patterns, Supabase integration, RLS policies, and data access conventions for the hierarchical event management system
alwaysApply: true
---

# Database & Data Access Patterns

## Database Technology

- **Primary Database:** PostgreSQL via Supabase
- **Storage:** Supabase Storage for avatars and report media
- **Auth:** Supabase Auth with magic link authentication

## Naming Conventions

### Tables
- Use lowercase with underscores: `users`, `events`, `event_versions`
- Use descriptive names
- Avoid abbreviations

### Columns
- Use lowercase with underscores: `created_at`, `parent_id`
- Use consistent naming:
  - Primary keys: `id` (UUID)
  - Foreign keys: `[table]_id` (e.g., `user_id`, `event_id`)
  - Timestamps: `created_at`, `updated_at`
  - Soft delete: `is_active` (boolean)
  - JSON data: `[name]_data` or `[name]_prefs` (e.g., `template_data`, `notification_prefs`)

### Enums
- Use singular form
- Use lowercase with underscores
- Group related values:
  - `role`: `event_planner`, `city_curator`, `regional_curator`, `lead_curator`, `global_director`
  - `event_status`: `draft`, `in_review`, `rejected`, `approved_scheduled`, `completed_awaiting_report`, `completed_archived`, `cancelled`
  - `approval_status`: `waiting`, `pending`, `approved`, `rejected`

## Schema Patterns

### Standard Columns

Every table should have:
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### Soft Deletes

Use `is_active` boolean instead of hard deletes:
```sql
is_active BOOLEAN NOT NULL DEFAULT true
```

Never expose deleted records to users (filter in RLS policies).

### Audit Trail

All state changes must be logged to `audit_logs` table:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  user_id UUID REFERENCES users(id),
  action_type action_type NOT NULL,
  comment TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Hierarchical Data

Use self-referencing foreign key for organizational hierarchy:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES users(id),
  -- other columns
);
```

Provide recursive CTE function for querying subordinates:
```sql
CREATE OR REPLACE FUNCTION get_subordinate_user_ids(user_id UUID)
RETURNS UUID[] AS $$
  WITH RECURSIVE subordinates AS (
    SELECT id FROM users WHERE id = user_id
    UNION
    SELECT u.id FROM users u
    INNER JOIN subordinates s ON u.parent_id = s.id
    WHERE u.is_active = true
  )
  SELECT ARRAY_AGG(id) FROM subordinates;
$$ LANGUAGE SQL STABLE;
```

## Row Level Security (RLS)

### Enable RLS on All Tables

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
-- etc.
```

### Pyramid Visibility Pattern

Users can only see their own data + data from subordinates:

```sql
-- SELECT Policy: Pyramid Visibility
CREATE POLICY "users_select_policy" ON users
FOR SELECT
USING (
  auth.uid() = id
  OR auth.uid() IN (
    SELECT unnest(get_subordinate_user_ids(auth.uid()))
  )
);

-- SELECT Policy for events: Creator's hierarchy visibility
CREATE POLICY "events_select_policy" ON events
FOR SELECT
USING (
  creator_id IN (
    SELECT unnest(get_subordinate_user_ids(auth.uid()))
  )
  OR auth.uid() IN (
    SELECT approver_id FROM event_approvals WHERE event_id = events.id
  )
);
```

### INSERT Policies

Users can only insert records as themselves:
```sql
CREATE POLICY "events_insert_policy" ON events
FOR INSERT
WITH CHECK (
  auth.uid() = creator_id
  AND auth.uid() IS NOT NULL
);
```

### UPDATE Policies

Role-based or ownership-based updates:
```sql
CREATE POLICY "events_update_policy" ON events
FOR UPDATE
USING (
  -- Owner can update own drafts
  (auth.uid() = creator_id AND status = 'draft')
  OR
  -- Global Director can update anything
  (auth.uid() IN (SELECT id FROM users WHERE role = 'global_director'))
);
```

### DELETE Policies

Prefer soft deletes, restrict hard deletes:
```sql
-- Only allow hard delete of drafts by owner
CREATE POLICY "events_delete_policy" ON events
FOR DELETE
USING (
  auth.uid() = creator_id
  AND status = 'draft'
);
```

## Database Functions

### Automatic Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### Automatic Audit Logging

```sql
CREATE OR REPLACE FUNCTION log_event_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    INSERT INTO audit_logs (event_id, user_id, action_type, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'status_change',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER event_status_change_audit
AFTER UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION log_event_change();
```

### Approval Chain Builder

```sql
CREATE OR REPLACE FUNCTION build_approval_chain(user_id UUID)
RETURNS UUID[] AS $$
DECLARE
  chain UUID[];
  current_id UUID;
  current_role role;
  config JSONB;
BEGIN
  -- Get approval config
  SELECT config_data INTO config FROM approval_configs ORDER BY created_at DESC LIMIT 1;
  
  -- Walk up hierarchy
  current_id := (SELECT parent_id FROM users WHERE id = user_id);
  
  WHILE current_id IS NOT NULL LOOP
    SELECT role INTO current_role FROM users WHERE id = current_id;
    
    -- Check if this role is required in config
    IF config->current_role::text = 'true' THEN
      chain := array_append(chain, current_id);
    END IF;
    
    -- Move up hierarchy
    SELECT parent_id INTO current_id FROM users WHERE id = current_id;
  END LOOP;
  
  RETURN chain;
END;
$$ LANGUAGE plpgsql STABLE;
```

## Supabase Client Configuration

### Server Client (for Server Components & Server Actions)

```typescript
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component, ignore
          }
        },
      },
    }
  );
}
```

### Client Component Client

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

## Data Access Layer Patterns

### File Organization

One file per table:
```
/lib/data-access
  users.dal.ts
  events.dal.ts
  event-versions.dal.ts
  event-approvals.dal.ts
  venues.dal.ts
  audit-logs.dal.ts
  templates.dal.ts
```

### Standard CRUD Operations

```typescript
// lib/data-access/events.dal.ts
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type Event = Database["public"]["Tables"]["events"]["Row"];
type InsertEvent = Database["public"]["Tables"]["events"]["Insert"];
type UpdateEvent = Database["public"]["Tables"]["events"]["Update"];

export async function findById(id: string): Promise<Event | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function findAll(): Promise<Event[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function insert(event: InsertEvent): Promise<Event> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("events")
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function update(id: string, updates: UpdateEvent): Promise<Event> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function softDelete(id: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from("events")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}
```

### Complex Queries with Joins

```typescript
export async function findWithRelations(id: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("events")
    .select(`
      *,
      creator:users!creator_id(id, name, email),
      venue:venues(id, name, address),
      approvals:event_approvals(
        id,
        status,
        approver:users(id, name, role)
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}
```

### Filtered Queries

```typescript
export async function findByFilters(filters: EventFilters): Promise<Event[]> {
  const supabase = createClient();
  
  let query = supabase
    .from("events")
    .select("*");

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.creatorId) {
    query = query.eq("creator_id", filters.creatorId);
  }

  if (filters.dateFrom) {
    query = query.gte("event_date", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("event_date", filters.dateTo);
  }

  const { data, error } = await query.order("event_date", { ascending: true });

  if (error) throw error;
  return data;
}
```

## Supabase Storage Patterns

### Bucket Configuration

```typescript
// Create buckets via Supabase dashboard or migration
// Buckets:
// - avatars: public, 2MB limit, image/* only
// - reports: public read for approved, 50MB limit, image/*, video/*
```

### Upload Pattern

```typescript
// lib/services/storage/storage.service.ts
import { createClient } from "@/lib/supabase/server";

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  const supabase = createClient();
  
  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  return data.publicUrl;
}
```

## Type Safety

### Generate Types from Database

```bash
npx supabase gen types typescript --project-id [project-id] > lib/types/database.types.ts
```

### Use Generated Types

```typescript
import type { Database } from "@/lib/types/database.types";

type User = Database["public"]["Tables"]["users"]["Row"];
type InsertUser = Database["public"]["Tables"]["users"]["Insert"];
type UpdateUser = Database["public"]["Tables"]["users"]["Update"];

type EventStatus = Database["public"]["Enums"]["event_status"];
```

## Migration Strategy

### File Organization

```
/db
  /migrations
    001_initial_schema.sql
    002_add_templates.sql
  /functions
    get_subordinate_user_ids.sql
    build_approval_chain.sql
  /triggers
    audit_log_trigger.sql
    updated_at_trigger.sql
  /policies
    users_policies.sql
    events_policies.sql
  /seed.sql
```

### Apply Migrations

Use Supabase CLI or Dashboard SQL Editor:
```bash
supabase db push
```

## Best Practices

✅ **Do:**
- Enable RLS on all tables
- Use UUIDs for primary keys
- Add indexes on foreign keys and frequently queried columns
- Use soft deletes with `is_active`
- Log all state changes to audit_logs
- Use transactions for multi-table updates
- Validate data at database level (constraints, checks)
- Use database functions for complex queries
- Generate TypeScript types from schema

❌ **Don't:**
- Expose sensitive data through RLS policies
- Use hard deletes for important records
- Skip indexes on large tables
- Store large files in database (use Storage)
- Put business logic in database functions (use Service layer)
- Bypass RLS with service role key in client code
- Store unencrypted sensitive data

