---
description: Database schema patterns, Supabase integration, backend-only authorization (NO RLS), and data access conventions for the hierarchical event management system
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

Never expose deleted records to users (filter in Service Layer queries).

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

## Authorization Strategy

### ⚠️ CRITICAL: NO Row Level Security (RLS)

**This application does NOT use Row Level Security (RLS) at the database level.**

All authorization and access control is handled exclusively in the backend application layer.

### Why Backend-Only Authorization?

1. **Database Portability** - Easy to migrate to different databases (MySQL, MongoDB, etc.)
2. **Testability** - Business logic is easier to test in application code
3. **Maintainability** - All authorization logic in one place (no SQL + TypeScript duplication)
4. **Flexibility** - Complex business rules are easier to implement in application code
5. **Debugging** - Easier to trace and debug authorization logic

### DO NOT Use RLS

❌ **Never enable RLS on any table:**
```sql
-- DON'T DO THIS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
```

❌ **Never create RLS policies:**
```sql
-- DON'T DO THIS
CREATE POLICY "users_select_policy" ON users FOR SELECT USING (...);
```

### Backend Authorization Pattern

✅ **All authorization is handled in the Service Layer:**

#### 1. Data Access Layer (DAL) - Filter by Subordinate IDs

```typescript
// /lib/data-access/venues.dal.ts
export async function findAll(
  subordinateUserIds: string[],  // Authorization filter from service layer
  options?: { includeCreator?: boolean; activeOnly?: boolean }
): Promise<VenueWithCreator[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from("venues")
    .select("*")
    .in("creator_id", subordinateUserIds)  // Backend authorization filter
    .order("name");

  const { data, error } = await query;
  return data;
}
```

#### 2. Service Layer - Get Subordinate IDs & Enforce Permissions

```typescript
// /lib/services/venues/venue.service.ts
import { getSubordinateUserIds } from "@/lib/services/users/hierarchy.service";

export async function getVenues(search?: string): Promise<VenueWithCreator[]> {
  const user = await requireActiveUser();
  
  // Get subordinate user IDs for pyramid visibility
  const subordinateIds = await getSubordinateUserIds(user.id);
  
  // Pass to DAL for filtering
  return venueDAL.findAll(subordinateIds, { includeCreator: true, activeOnly: true });
}
```

#### 3. Hierarchy Service - Pyramid Visibility Logic

```typescript
// /lib/services/users/hierarchy.service.ts
export async function getSubordinateUserIds(userId: string): Promise<string[]> {
  // Returns [userId, ...all subordinate user IDs recursively]
  // This implements pyramid visibility in application code
}
```

### Pyramid Visibility Implementation

Users can only see data from themselves + their subordinates:

- **Event Planners**: See only their own data
- **City Curators**: See their own + Event Planners below them
- **Regional Curators**: See their own + City Curators + Event Planners below them
- **Lead Curators**: See their own + Regional Curators + all below
- **Global Directors**: See everything

This is implemented by:
1. Getting subordinate user IDs in the Service Layer
2. Passing those IDs to the DAL
3. Filtering queries with `.in("creator_id", subordinateUserIds)`

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
    (if needed - prefer backend logic)
  /triggers
    audit_log_trigger.sql
    updated_at_trigger.sql
  /test-data
    create_test_user.sql
  /seed.sql
  
Note: No /policies folder - authorization is backend-only
```

### Apply Migrations

Use Supabase CLI or Dashboard SQL Editor:
```bash
supabase db push
```

## Best Practices

✅ **Do:**
- Use UUIDs for primary keys
- Add indexes on foreign keys and frequently queried columns (especially creator_id for authorization)
- Use soft deletes with `is_active`
- Log all state changes to audit_logs
- Use transactions for multi-table updates
- Validate data at database level (constraints, checks)
- Generate TypeScript types from schema
- Handle ALL authorization in the Service Layer
- Pass subordinate user IDs from Service to DAL for filtering
- Use `.in("creator_id", subordinateUserIds)` for authorization queries

❌ **Don't:**
- Enable RLS on any tables (authorization is backend-only)
- Create RLS policies (authorization is backend-only)
- Use hard deletes for important records
- Skip indexes on large tables
- Store large files in database (use Storage)
- Put business logic in database functions (use Service layer instead)
- Store unencrypted sensitive data
- Query database directly without going through Service Layer

