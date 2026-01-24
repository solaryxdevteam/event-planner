# Event Planner Application Architecture

## Folder Structure

### Backend Architecture (3-Layer Pattern)

```
/lib
  /data-access          # Data Access Layer (DAL)
    *.dal.ts            # Pure database operations, no business logic

  /services             # Service Layer (Business Logic)
    /[domain]/
      *.service.ts      # Backend services (used by API routes)
    /client/            # Client Services (used by React hooks)
      api-client.ts     # Centralized fetch wrapper
      *.client.service.ts # Client-side API services

  /actions              # Server Actions
    *.ts                # For Server Components and form submissions

  /hooks                # React Query Hooks
    use-*.ts            # Client-side data fetching hooks

  /validation           # Zod Schemas
    *.schema.ts         # Input validation schemas
```

### Frontend Architecture

```
/app
  /api                  # API Routes (Route Handlers)
    /[resource]/
      route.ts          # GET, POST endpoints
      /[id]/
        route.ts        # GET, PUT, DELETE endpoints

  /dashboard            # Protected routes
    /[feature]/
      page.tsx          # Server or Client Components

/components
  /ui                   # shadcn/ui components
  /[domain]             # Feature components
    *.tsx               # Domain-specific components
```

## Data Flow

### Client Component → API Route Flow

```
1. Client Component
   ↓ uses
2. React Query Hook (lib/hooks/use-venues.ts)
   ↓ calls
3. Client Service (lib/services/client/venues.client.service.ts)
   ↓ uses
4. API Client (lib/services/client/api-client.ts)
   ↓ fetch()
5. API Route (app/api/venues/route.ts)
   ↓ calls
6. Backend Service (lib/services/venues/venue.service.ts)
   ↓ calls
7. DAL (lib/data-access/venues.dal.ts)
   ↓ queries
8. Database (Supabase)
```

### Server Component → Server Action Flow

```
1. Server Component (app/dashboard/page.tsx)
   ↓ calls
2. Server Action (lib/actions/events.ts)
   ↓ calls
3. Backend Service (lib/services/events/event.service.ts)
   ↓ calls
4. DAL (lib/data-access/events.dal.ts)
   ↓ queries
5. Database (Supabase)
```

## Key Principles

### 1. Separation of Concerns

- **DAL**: Pure database operations only
- **Backend Services**: Business logic, authorization, orchestration
- **Client Services**: API call encapsulation, type safety
- **React Hooks**: Data fetching, caching, mutations
- **API Routes**: HTTP endpoints for client components
- **Server Actions**: Form submissions, Server Component mutations

### 2. Client Components Must Use API Routes

❌ **Wrong:**

```typescript
"use client";
import { getVenues } from "@/lib/actions/venues"; // Server Action

export function VenuesPage() {
  const [venues, setVenues] = useState([]);

  useEffect(() => {
    getVenues().then(setVenues); // ❌ Server Action from Client Component
  }, []);
}
```

✅ **Correct:**

```typescript
"use client";
import { useVenues } from "@/lib/hooks/use-venues"; // React Query Hook

export function VenuesPage() {
  const { data: venues } = useVenues({ status: "active" }); // ✅ Uses API route
}
```

### 3. Server Components Can Use Server Actions

✅ **Correct:**

```typescript
// app/dashboard/venues/page.tsx (Server Component)
import { getVenues } from "@/lib/actions/venues";

export default async function VenuesPage() {
  const result = await getVenues(); // ✅ Server Action from Server Component
  // ...
}
```

### 4. All API Calls Use Client Services

❌ **Wrong:**

```typescript
// lib/hooks/use-venues.ts
async function fetchVenues() {
  const response = await fetch("/api/venues"); // ❌ Direct fetch
  return response.json();
}
```

✅ **Correct:**

```typescript
// lib/hooks/use-venues.ts
import * as venueClientService from "@/lib/services/client/venues.client.service";

export function useVenues() {
  return useQuery({
    queryKey: ["venues"],
    queryFn: () => venueClientService.fetchVenues({}), // ✅ Uses client service
  });
}
```

## File Examples

### Client Service Example

```typescript
// lib/services/client/venues.client.service.ts
import { apiClient } from "./api-client";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";

export interface VenueFilters {
  search?: string;
  status?: "all" | "active" | "banned";
}

export async function fetchVenues(filters: VenueFilters) {
  return apiClient.get<PaginatedVenues>("/api/venues", {
    params: filters as Record<string, string | number | boolean | null | undefined>,
  });
}
```

### React Query Hook Example

```typescript
// lib/hooks/use-venues.ts
import { useQuery, useMutation } from "@tanstack/react-query";
import * as venueClientService from "@/lib/services/client/venues.client.service";

export type { VenueFilters } from "@/lib/services/client/venues.client.service";

export function useVenues(filters: VenueFilters) {
  return useQuery({
    queryKey: ["venues", filters],
    queryFn: () => venueClientService.fetchVenues(filters),
    staleTime: 30 * 1000,
  });
}
```

### API Route Example

```typescript
// app/api/venues/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import * as venueService from "@/lib/services/venues/venue.service";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const filters = parseFilters(searchParams);

    const result = await venueService.getVenuesWithFilters(filters);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

## Benefits

1. **Type Safety**: End-to-end TypeScript types from database to UI
2. **Separation of Concerns**: Clear boundaries between layers
3. **Testability**: Each layer can be tested independently
4. **Maintainability**: Changes isolated to specific layers
5. **Scalability**: Easy to add new features following the pattern
6. **Caching**: React Query provides automatic caching and invalidation
7. **Error Handling**: Centralized error handling in API client
8. **Consistency**: Standardized patterns across the codebase

## Migration Status

✅ **Completed:**

- Venue components (VenueForm, VenueSelect, Venue dialogs)
- Venue pages (list, new, edit)
- Locations hooks
- Users hooks
- Profile hooks
- Invitations hooks
- User hierarchy hooks
- Cursor rules documentation

⏳ **Pending:**

- User management components
- Profile components
- Auth/registration components
