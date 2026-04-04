# Backend Guide — Shiraz House Event Planner

A developer reference for all backend patterns: API routes, services, the data access layer, validation, authentication, and how to build new backend features.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Request Lifecycle](#2-request-lifecycle)
3. [API Routes](#3-api-routes)
4. [Authentication in API Routes](#4-authentication-in-api-routes)
5. [Validation with Zod](#5-validation-with-zod)
6. [Services Layer](#6-services-layer)
7. [Data Access Layer (DAL)](#7-data-access-layer-dal)
8. [Error Handling](#8-error-handling)
9. [Email Service](#9-email-service)
10. [File Storage](#10-file-storage)
11. [Audit Logging](#11-audit-logging)
12. [Adding a New Backend Feature](#12-adding-a-new-backend-feature)

---

## 1. Architecture Overview

The backend is built entirely inside Next.js using the **App Router** API route convention. There is no separate backend server.

```
Request
  │
  ├─ middleware.ts          ← session refresh, route-level redirects
  │
  └─ app/api/[route]/
       └─ route.ts          ← HTTP handler (GET, POST, PUT, DELETE)
             │
             ├─ lib/auth/server.ts        ← authenticate & authorize
             ├─ lib/validation/*.schema.ts ← parse & validate input
             ├─ lib/services/*/           ← business logic
             │       └─ lib/data-access/*.dal.ts  ← database queries
             └─ NextResponse.json(...)    ← HTTP response
```

**Rule:** Each layer has a single responsibility. Never write database queries in API routes or business logic in the DAL.

---

## 2. Request Lifecycle

1. **Middleware** (`middleware.ts`) runs first on every request. It refreshes the Supabase session stored in cookies and handles redirect rules (unauthenticated users → login, pending users → profile).
2. **API route handler** (`app/api/.../route.ts`) receives the request.
3. The handler calls `requireAuth()` or a role-check helper to verify the caller.
4. Input is parsed and validated with a Zod schema (`.parse()` throws on invalid input).
5. The handler calls a **service function** with the validated input and the authenticated user's ID.
6. The service calls one or more **DAL functions** to read/write the database.
7. The handler returns a `NextResponse.json()` with a consistent response shape.

---

## 3. API Routes

### File location

API routes live in `app/api/`. Each folder becomes a URL segment. The handler file must be named `route.ts`.

```
app/api/events/route.ts             → GET /api/events, POST /api/events
app/api/events/[id]/route.ts        → GET /api/events/:id, PUT /api/events/:id
app/api/events/[id]/submit/route.ts → POST /api/events/:id/submit
```

### Standard route file structure

```typescript
// app/api/events/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireActiveUser } from "@/lib/auth/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import * as eventService from "@/lib/services/events/event.service";
import { createEventSchema } from "@/lib/validation/events.schema";

// Required for routes that use Supabase server client
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(); // throws if not authenticated

    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get("status") || undefined,
      page: Number(searchParams.get("page") || 1),
    };

    const result = await eventService.getEventsForUser(authUser.id, filters);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireActiveUser(); // requires active status too

    const body = await request.json();
    const input = createEventSchema.parse(body); // throws ZodError if invalid

    const event = await eventService.createDraft(authUser.id, input);

    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Response shape

All API responses follow this structure:

```typescript
// Success
{ success: true, data: <payload> }

// Error
{ success: false, error: "Human-readable message", details?: <zod issues or extra context> }
```

HTTP status codes:
| Situation | Status |
|---|---|
| Success (GET/PUT/DELETE) | `200` |
| Created (POST) | `201` |
| Validation error | `400` |
| Not authenticated | `401` |
| Forbidden (wrong role) | `403` |
| Not found | `404` |
| Server error | `500` |

### Route-level config

Always add these two lines at the top of route files that use the Supabase server client:

```typescript
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```

Without them, Next.js may try to statically render the route or use the Edge runtime, which doesn't support the Node.js APIs Supabase needs.

---

## 4. Authentication in API Routes

All auth helpers come from `lib/auth/server.ts`. Always use these — never access Supabase Auth directly inside an API route.

### Choosing the right helper

```typescript
// Use when: login is optional (rare)
const user = await getServerUser(); // returns AuthUser | null

// Use when: user must be logged in (most routes)
const user = await requireAuth(); // throws UnauthorizedError if not logged in
// throws ForbiddenError if user is pending/inactive

// Use when: user must be active (write operations)
const user = await requireActiveUser(); // additionally rejects pending users

// Use when: only specific roles may call this endpoint
const user = await requireRole(["global_director", "lead_curator"]);

// Use when: a minimum role level is required
const user = await requireMinimumRole("regional_curator");
```

### The AuthUser object

All require-helpers return an `AuthUser`:

```typescript
interface AuthUser {
  id: string; // UUID — use this as the "current user ID"
  email: string;
  supabaseUser: SupabaseUser; // raw Supabase Auth user
  dbUser: DatabaseUser; // the row from our users table
}

// Example: access the user's role
authUser.dbUser.role; // "event_planner" | "city_curator" | ...

// Example: access the user's org hierarchy parent
authUser.dbUser.parent_id;
```

### Pattern for catching auth errors

Wrap just the auth call in its own try/catch to return clean JSON errors instead of letting the outer catch handle them generically:

```typescript
export async function POST(request: NextRequest) {
  try {
    let authUser;
    try {
      authUser = await requireActiveUser();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
      }
      if (error instanceof ForbiddenError) {
        return NextResponse.json({ success: false, error: error.message }, { status: 403 });
      }
      throw error;
    }

    // ... rest of handler
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## 5. Validation with Zod

All input validation uses Zod. Schemas live in `lib/validation/` and are shared between the API route (server validation) and the React Hook Form resolver (client validation).

### Writing a schema

```typescript
// lib/validation/events.schema.ts
import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  starts_at: z.string().datetime().nullable(),
  venue_id: z.string().uuid("Invalid venue ID").nullable(),
  expected_attendance: z.number().int().positive().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

// Infer TypeScript type from schema
export type CreateEventInput = z.infer<typeof createEventSchema>;
```

Use `.refine()` for cross-field validation:

```typescript
export const createEventSchema = baseSchema.refine(
  (d) => !d.ends_at || !d.starts_at || new Date(d.ends_at) > new Date(d.starts_at),
  { message: "End time must be after start time", path: ["ends_at"] }
);
```

### Using a schema in a route

```typescript
const body = await request.json();

// .parse() throws a ZodError if validation fails
const input = createEventSchema.parse(body);

// Or use .safeParse() for manual handling
const result = createEventSchema.safeParse(body);
if (!result.success) {
  return NextResponse.json({ success: false, error: "Validation failed", details: result.error }, { status: 400 });
}
const input = result.data;
```

---

## 6. Services Layer

Services contain all business logic. They sit between the API route and the DAL.

**Rules:**

- Services receive a validated input and an authenticated user ID.
- Services call DAL functions — they do not use the Supabase client directly.
- Services can call other services.
- Services throw plain `Error` objects (or typed errors from `lib/utils/errors`) on failure — never return `null` to signal an error.

### File location

```
lib/services/
  events/
    event.service.ts       ← getEventsForUser, getEventById, ...
    draft.service.ts       ← createDraft, updateDraft, deleteDraft
  venues/
    venue.service.ts
  email/
    email.service.ts
  approvals/
    approval.service.ts
  ...
```

### Example service function

```typescript
// lib/services/events/draft.service.ts

import * as eventsDAL from "@/lib/data-access/events.dal";
import * as auditService from "@/lib/services/audit/audit.service";
import type { CreateEventInput } from "@/lib/validation/events.schema";

export async function createDraft(creatorId: string, input: CreateEventInput) {
  // Business logic: ensure only one draft per user
  const existingDraft = await eventsDAL.getFirstDraftByCreator(creatorId);
  if (existingDraft) {
    throw new Error("You already have an existing draft. Please complete or delete it first.");
  }

  // Create the draft
  const event = await eventsDAL.createEvent({
    ...input,
    creator_id: creatorId,
    status: "draft",
  });

  // Log the action
  await auditService.log({
    action: "create_draft",
    entity_type: "event",
    entity_id: event.id,
    actor_id: creatorId,
  });

  return event;
}
```

---

## 7. Data Access Layer (DAL)

DAL files contain only database queries. No business logic, no auth checks.

**Rules:**

- One DAL file per database table (or feature area).
- All functions are `async` and either return data or throw.
- Use the **server Supabase client** — never the browser client.
- Pass authorization context down from the service (e.g., `creatorId`, `subordinateIds`) — do not implement access control inside the DAL.

### File location

```
lib/data-access/
  events.dal.ts
  venues.dal.ts
  djs.dal.ts
  users.dal.ts
  audit-logs.dal.ts
  ...
```

### Example DAL functions

```typescript
// lib/data-access/events.dal.ts

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

export async function getEventById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(
      `
      *,
      creator:users(id, first_name, last_name, email, role),
      venue:venues(id, name, address, city, country),
      dj:djs(id, name, picture_url, music_style)
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createEvent(data: EventInsert) {
  const supabase = await createClient();

  const { data: event, error } = await supabase.from("events").insert(data).select().single();

  if (error) throw error;
  return event;
}

export async function updateEvent(id: string, data: EventUpdate) {
  const supabase = await createClient();

  const { data: event, error } = await supabase.from("events").update(data).eq("id", id).select().single();

  if (error) throw error;
  return event;
}
```

### Supabase client — server vs browser

| Client         | File                     | When to use                                                                   |
| -------------- | ------------------------ | ----------------------------------------------------------------------------- |
| Server client  | `lib/supabase/server.ts` | API routes, server actions, DAL functions, services                           |
| Browser client | `lib/supabase/client.ts` | Client components that need direct Supabase access (rare — prefer API routes) |

Server-side (DAL, Route Handlers, Server Components):

```typescript
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
```

Browser (auth helpers only; prefer `/api` for domain data):

```typescript
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
```

---

## 8. Error Handling

### Error types

Custom error classes live in `lib/utils/errors.ts`:

```typescript
UnauthorizedError; // → HTTP 401
ForbiddenError; // → HTTP 403
NotFoundError; // → HTTP 404
ValidationError; // → HTTP 400
```

### handleApiError pattern

Create a shared helper (or inline it per route) to translate errors to HTTP responses:

```typescript
function handleApiError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 404 });
  }
  // ZodError
  if (error && typeof error === "object" && "issues" in error) {
    return NextResponse.json({ success: false, error: "Validation failed", details: error }, { status: 400 });
  }
  console.error("Unhandled error:", error);
  return NextResponse.json(
    { success: false, error: error instanceof Error ? error.message : "Internal server error" },
    { status: 500 }
  );
}
```

---

## 9. Email Service

All emails go through `lib/services/email/email.service.ts`, which wraps the Resend SDK.

### Sending an email

```typescript
import { sendEmail } from "@/lib/services/email/email.service";

await sendEmail({
  to: "user@example.com",
  subject: "Your event was approved",
  html: "<p>Great news!</p>",
});
```

### Email templates

Templates are functions that return HTML strings. They live in `lib/services/email/templates/`. Use the template service to render them:

```typescript
import { renderTemplate } from "@/lib/services/email/templates.service";

const html = await renderTemplate("event-approved", {
  userName: "Alice",
  eventTitle: "Summer Gala",
  eventDate: "2026-07-15",
});

await sendEmail({ to: user.email, subject: "Event Approved", html });
```

### Dev email preview

At `/dashboard/dev/email-templates` you can:

- Browse all template types.
- Preview the rendered HTML.
- Send a test email to any address.

This page is only available when `NEXT_PUBLIC_ENABLE_EMAIL_PREVIEW=true`.

---

## 10. File Storage

Files are stored in Supabase Storage. All storage operations go through `lib/data-access/storage.dal.ts`.

### Buckets

| Bucket    | Used for                            |
| --------- | ----------------------------------- |
| `venues`  | Venue images and floor plans        |
| `djs`     | DJ profile pictures and rider files |
| `events`  | Event proposal and table files      |
| `reports` | Report attachments                  |
| `avatars` | User profile pictures               |

### Upload pattern in an API route

```typescript
// app/api/venues/upload-image/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/server";
import * as storageDAL from "@/lib/data-access/storage.dal";

export async function POST(request: NextRequest) {
  await requireActiveUser();

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
  }

  const url = await storageDAL.uploadVenueImage(file);

  return NextResponse.json({ success: true, data: { url } });
}
```

---

## 11. Audit Logging

Every significant action must be logged. Use the audit service from inside service functions (not API routes directly):

```typescript
import * as auditService from "@/lib/services/audit/audit.service";

await auditService.log({
  action: "approve", // action_type enum value
  entity_type: "event",
  entity_id: event.id,
  actor_id: currentUserId,
  metadata: { reason: "Looks good" }, // optional JSONB
});
```

The `action_type` enum values are defined in the database schema and in `lib/types/database.types.ts`.

---

## 12. Adding a New Backend Feature

Follow this checklist in order:

### Step 1 — Database (if needed)

Create a migration file in `db/migrations/` and apply the same change to `db/schema.sql`:

```sql
-- db/migrations/20260404_add_event_tags.sql
ALTER TABLE events ADD COLUMN tags text[] DEFAULT '{}';
```

### Step 2 — Types

If you added columns, update `lib/types/database.types.ts` to reflect the new schema shape. (In the future this can be auto-generated with `supabase gen types typescript`.)

### Step 3 — DAL

Add query functions in `lib/data-access/`:

```typescript
// lib/data-access/events.dal.ts (add to existing file)

export async function getEventsByTag(tag: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").select("*").contains("tags", [tag]);
  if (error) throw error;
  return data;
}
```

### Step 4 — Validation schema

Add the Zod schema (or extend an existing one) in `lib/validation/`:

```typescript
// lib/validation/events.schema.ts (extend existing)
export const createEventSchema = z.object({
  // ... existing fields
  tags: z.array(z.string()).optional().default([]),
});
```

### Step 5 — Service

Add or extend a service in `lib/services/`:

```typescript
// lib/services/events/event.service.ts (add new function)

export async function getEventsByTag(tag: string) {
  return eventsDAL.getEventsByTag(tag);
}
```

### Step 6 — API route

Create the route handler in `app/api/`:

```typescript
// app/api/events/by-tag/[tag]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import * as eventService from "@/lib/services/events/event.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { tag: string } }) {
  try {
    await requireAuth();
    const events = await eventService.getEventsByTag(params.tag);
    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    // ... handleApiError
  }
}
```

### Step 7 — Client service

Add the `fetch()` wrapper in `lib/services/client/`:

```typescript
// lib/services/client/events.client.service.ts (add to existing file)

export async function fetchEventsByTag(tag: string) {
  return apiClient.get<EventWithRelations[]>(`/api/events/by-tag/${tag}`);
}
```

### Step 8 — React Query hook

Add the hook in `lib/hooks/`:

```typescript
// lib/hooks/use-events.ts (add to existing file)

export function useEventsByTag(tag: string) {
  return useQuery({
    queryKey: ["events", "by-tag", tag],
    queryFn: () => eventsClientService.fetchEventsByTag(tag),
    enabled: !!tag,
  });
}
```

The frontend can now consume this with `const { data, isLoading } = useEventsByTag("techno")`.

---

_See also: [Developer Guide](./DEVELOPER_GUIDE.md) · [Frontend Guide](./FRONTEND_GUIDE.md) · [Documentation index](./README.md)_
