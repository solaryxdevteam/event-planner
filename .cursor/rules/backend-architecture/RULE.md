---
description: Enforces 3-layer backend architecture pattern with clear separation between Data Access, Services, and Entry Points
alwaysApply: true
---

# Backend Architecture - 3-Layer Pattern

## Architecture Layers

### 1. Data Access Layer (DAL) - `/lib/data-access/*.dal.ts`

**Purpose:** Pure database operations only. No business logic.

**Rules:**
- One file per database table (e.g., `users.dal.ts`, `events.dal.ts`)
- Only CRUD operations and database queries
- Functions must be pure - no side effects except database operations
- No authorization checks (handled in Service layer)
- No external API calls
- No email sending
- Return raw database results

**Naming Convention:**
```typescript
// File: /lib/data-access/users.dal.ts
export async function findAll() { }
export async function findById(id: string) { }
export async function findByRole(role: string) { }
export async function insert(data: InsertUser) { }
export async function update(id: string, data: UpdateUser) { }
export async function softDelete(id: string) { }
```

### 2. Service Layer - `/lib/services/*/*.service.ts`

**Purpose:** Business logic orchestration and coordination.

**Rules:**
- Organize by domain in subfolders (e.g., `/lib/services/users/`, `/lib/services/events/`)
- Multiple services per domain allowed (e.g., `user.service.ts`, `hierarchy.service.ts`)
- Implement all business logic here
- Coordinate between multiple DALs
- Handle authorization and permissions
- Call external services (email, storage, etc.)
- Create audit logs
- Throw custom errors with context

**Naming Convention:**
```typescript
// File: /lib/services/users/user.service.ts
export async function getAllUsers(requesterId: string) { }
export async function createUser(requesterId: string, data: CreateUserInput) { }
export async function updateUser(requesterId: string, userId: string, data: UpdateUserInput) { }
```

**Service Layer Responsibilities:**
- Validate business rules
- Check permissions using `/lib/permissions/*`
- Call one or more DAL functions
- Log to audit trail
- Send notifications
- Return structured data for Entry Points

### 3. Entry Points

#### A. Server Actions - `/lib/actions/*.ts`

**Purpose:** Handle form submissions and UI mutations.

**When to Use:**
- Form submissions
- Client component mutations
- Any non-public API operations
- Default choice for mutations

**Rules:**
- One file per domain (e.g., `users.ts`, `events.ts`, `approvals.ts`)
- Mark with `"use server"` directive at top of file
- Accept FormData or validated objects
- Validate input with Zod schemas
- Call Service layer functions
- Handle errors gracefully
- Return `ActionResponse<T>` format
- Call `revalidatePath()` or `revalidateTag()` after mutations

**Pattern:**
```typescript
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createUserSchema } from "@/lib/validation/users.schema";
import { userService } from "@/lib/services/users/user.service";
import { getServerUser } from "@/lib/auth/server";
import type { ActionResponse } from "@/lib/types/api.types";

export async function createUser(
  formData: FormData | z.infer<typeof createUserSchema>
): Promise<ActionResponse<User>> {
  try {
    // 1. Authenticate
    const currentUser = await getServerUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // 2. Validate input
    const data = typeof formData === "object" && "get" in formData
      ? Object.fromEntries(formData)
      : formData;
    
    const validatedData = createUserSchema.parse(data);

    // 3. Call service layer
    const user = await userService.createUser(currentUser.id, validatedData);

    // 4. Revalidate
    revalidatePath("/admin/users");

    // 5. Return success
    return { success: true, data: user };
  } catch (error) {
    console.error("createUser error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create user",
    };
  }
}
```

#### B. Route Handlers - `/app/api/*/route.ts`

**Purpose:** Public HTTP endpoints only.

**When to Use:**
- Webhooks (e.g., Supabase auth, external services)
- Public API endpoints
- CSV/file exports
- SSE/streaming endpoints

**When NOT to Use:**
- Form submissions (use Server Actions)
- Internal mutations (use Server Actions)
- Protected operations (use Server Actions)

**Rules:**
- Must export HTTP method handlers: `GET`, `POST`, `PUT`, `DELETE`
- Handle authentication explicitly
- Validate input with Zod
- Call Service layer functions
- Return `NextResponse` with proper status codes

**Pattern:**
```typescript
// File: /app/api/export/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server";
import { eventService } from "@/lib/services/events/event.service";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get query params
    const { searchParams } = request.nextUrl;
    const filters = {
      status: searchParams.get("status"),
      dateRange: searchParams.get("dateRange"),
    };

    // 3. Call service
    const events = await eventService.getEventsForUser(user.id, filters);

    // 4. Convert to CSV
    const csv = convertToCSV(events);

    // 5. Return response
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=events.csv",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}
```

## Flow Diagram

```
Client Component
    ↓ (calls)
Server Action (/lib/actions/*.ts)
    ↓ (validates & calls)
Service Layer (/lib/services/*/*.service.ts)
    ↓ (business logic & calls)
DAL (/lib/data-access/*.dal.ts)
    ↓ (queries)
Database (Supabase)
```

## Response Format

All Server Actions must return `ActionResponse<T>`:

```typescript
// File: /lib/types/api.types.ts
export type ActionResponse<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string };
```

## Anti-Patterns to Avoid

❌ **Don't:** Put business logic in DAL functions
❌ **Don't:** Put database queries directly in Server Actions
❌ **Don't:** Use Route Handlers for form submissions
❌ **Don't:** Skip validation in Entry Points
❌ **Don't:** Return raw errors to client (sanitize messages)
❌ **Don't:** Mix layers (Server Action calling DAL directly)

## File Organization Example

```
/lib
  /actions
    users.ts              # Server Actions for user operations
    events.ts             # Server Actions for event operations
  
  /services
    /users
      user.service.ts     # User business logic
      hierarchy.service.ts # Hierarchy-specific logic
    /events
      event.service.ts    # Event business logic
      draft.service.ts    # Draft-specific logic
  
  /data-access
    users.dal.ts          # User database operations
    events.dal.ts         # Event database operations
```

